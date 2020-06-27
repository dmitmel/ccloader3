import { MOD_PROTOCOL_PREFIX } from './resources.private.js';
import * as resourcesPlain from './resources-plain.js';
import * as patchsteps from '../../common/vendor-libs/patchsteps.js';
import PatchStepsDebugState from './patch-steps-debug-state.js';
import { Mod } from '../../src/public/mod';
import { errorHasMessage, mapGetOrInsert } from '../../common/dist/utils.js';
import { ResourcePatchList } from './patch-list.js';
import * as paths from '../../common/dist/paths.js';

export interface JSONPatcherContext {
  resolvedPath: string;
  requestedAsset: string;
  options: LoadJSONOptions;
}

export const jsonPatches = new ResourcePatchList<unknown, JSONPatcherContext>();

export const assetOverridesTable = new Map<string, string>();

{
  let assetOverridesFromMods = new Map<string, Mod[]>();

  for (let mod of modloader.loadedMods.values()) {
    for (let asset of mod.assets) {
      if (asset.endsWith('.json.patch')) {
        let patchedAsset = asset.slice(0, -6);
        registerPatchstepsPatch(mod, asset, patchedAsset);
        continue;
      }

      let modsWithThisAsset = mapGetOrInsert(assetOverridesFromMods, asset, []);
      modsWithThisAsset.push(mod);
    }
  }

  for (let [asset, modsWithThisAsset] of assetOverridesFromMods) {
    if (modsWithThisAsset.length > 1) {
      console.warn(
        `Conflict between overrides for '${asset}' found in mods '${modsWithThisAsset
          .map((mod) => mod.manifest.id)
          .join("', '")}'. Using the override from mod '${modsWithThisAsset[0].manifest.id}'`,
      );
    }

    let overridePath = `${modsWithThisAsset[0].assetsDirectory}${asset}`;
    assetOverridesTable.set(asset, overridePath);
  }
}

function registerPatchstepsPatch(
  mod: Mod,
  patchFileRelativePath: string,
  patchedAssetPath: string,
): void {
  jsonPatches.add(patchedAssetPath, {
    dependencies: () =>
      resourcesPlain.loadJSON(
        wrapPathIntoURL(`${mod.assetsDirectory}${patchFileRelativePath}`).href,
      ) as Promise<patchsteps.PatchStep[]>,
    patcher: async (data, patchData) => {
      let debugState = new PatchStepsDebugState(mod);
      debugState.addFile([/* fromGame */ false, patchFileRelativePath]);

      await patchsteps.patch(
        data,
        patchData,
        (fromGame: string | boolean, url: string): Promise<unknown> =>
          fromGame
            ? loadJSON(url)
            : resourcesPlain.loadJSON(wrapPathIntoURL(mod.resolvePath(url)).href),
        debugState,
      );

      return data;
    },
  });
}

export interface LoadJSONOptions {
  callerThisValue?: unknown;
  allowAssetOverrides?: boolean | null;
}

export async function loadJSON(path: string, options?: LoadJSONOptions | null): Promise<unknown> {
  options = options ?? {};

  let { resolvedPath, requestedAsset } = resolvePathAdvanced(path, {
    allowAssetOverrides: options.allowAssetOverrides,
  });
  let data = await resourcesPlain.loadJSON(wrapPathIntoURL(resolvedPath).href);

  if (requestedAsset != null) {
    try {
      data = await runJSONPatches(data, { resolvedPath, requestedAsset, options });
    } catch (err) {
      if (errorHasMessage(err)) {
        err.message = `Failed to patch JSON file '${path}': ${err.message}`;
      }
      throw err;
    }
  }

  return data;
}

async function runJSONPatches(data: unknown, context: JSONPatcherContext): Promise<unknown> {
  let patchers = jsonPatches.forPath(context.requestedAsset);
  if (patchers.length === 0) return data;

  let allDependencies: unknown[] = await Promise.all(
    patchers.map((patcher) =>
      // eslint-disable-next-line no-undefined
      patcher.dependencies != null ? patcher.dependencies(context) : undefined,
    ),
  );

  for (let i = 0; i < patchers.length; i++) {
    let patcher = patchers[i];
    let deps = allDependencies[i];
    let newData = await patcher.patcher(data, deps, context);
    // eslint-disable-next-line no-undefined
    if (newData !== undefined) data = newData;
  }

  return data;
}

export interface LoadImageOptions {
  returnCanvas?: 'always' | 'if-patched' | 'never' | null;
}

// TODO: loadText

export async function loadImage(
  path: string,
  options?: LoadImageOptions | null,
): Promise<HTMLImageElement | HTMLCanvasElement> {
  options = options ?? {};

  let { resolvedPath } = resolvePathAdvanced(path);

  let img: HTMLImageElement | HTMLCanvasElement = await resourcesPlain.loadImage(
    wrapPathIntoURL(resolvedPath).href,
  );

  if (options.returnCanvas === 'always') {
    let canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    let ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    img = canvas;
  }

  // do patching...

  if (options.returnCanvas === 'never' && img instanceof HTMLCanvasElement) {
    img = await resourcesPlain.loadImage(img.toDataURL('image/png'));
  }

  return img;
}

export function resolvePath(uri: string, options?: ResolvePathOptions | null): string {
  return resolvePathAdvanced(uri, options).resolvedPath;
}

export function resolvePathToURL(path: string, options?: ResolvePathOptions | null): string {
  return wrapPathIntoURL(resolvePath(path, options)).href;
}

export interface ResolvePathOptions {
  allowAssetOverrides?: boolean | null;
}

export interface ResolvePathAdvancedResult {
  resolvedPath: string;
  requestedAsset: string | null;
}

export function resolvePathAdvanced(
  uri: string,
  options?: ResolvePathOptions | null,
): ResolvePathAdvancedResult {
  options = options ?? {};

  let result: ResolvePathAdvancedResult = {
    resolvedPath: null!,
    requestedAsset: null,
  };

  let gameAssetsPath = paths.stripRoot(getGameAssetsURL().pathname);

  let modResourcePath = applyModURLProtocol(uri);
  if (modResourcePath != null) {
    result.resolvedPath = modResourcePath;
  } else {
    let normalizedPath = paths.jailRelative(paths.join(gameAssetsPath, uri));
    result.resolvedPath = normalizedPath;

    if (normalizedPath.startsWith(gameAssetsPath)) {
      result.requestedAsset = normalizedPath.slice(gameAssetsPath.length);

      if (options.allowAssetOverrides ?? true) {
        let overridePath = assetOverridesTable.get(result.requestedAsset);
        if (overridePath != null) {
          result.resolvedPath = overridePath;
        }
      }
    }
  }

  return result;
}

export function wrapPathIntoURL(path: string): URL {
  let url = new URL(`/${encodeURI(path)}`, getGameAssetsURL());
  url.href += getCacheSuffix();
  return url;
}

export function getGameAssetsURL(): URL {
  let str: string;
  if (typeof ig !== 'undefined') {
    str = ig.root;
  } else if (window.IG_ROOT) {
    str = window.IG_ROOT;
  } else {
    str = '';
  }
  return new URL(str, document.baseURI);
}

export function getCacheSuffix(): string {
  if (typeof ig !== 'undefined') {
    return ig[deobf.getCacheSuffix]();
  } else if (window.IG_GAME_CACHE) {
    return `?nocache=${window.IG_GAME_CACHE}`;
  } else {
    return '';
  }
}

function applyModURLProtocol(fullURI: string): string | null {
  if (!fullURI.startsWith(MOD_PROTOCOL_PREFIX)) return null;

  try {
    let uri = fullURI.slice(MOD_PROTOCOL_PREFIX.length);
    if (uri.length === 0) {
      throw new Error('the URI is empty');
    }

    let modIdSeparatorIndex = uri.indexOf('/');
    if (modIdSeparatorIndex < 0) {
      throw new Error("'/' after the mod ID is missing");
    }

    let modId = uri.slice(0, modIdSeparatorIndex);
    if (modId.length === 0) {
      throw new Error('the mod ID is empty');
    }

    let filePath = uri.slice(modIdSeparatorIndex + 1);
    if (filePath.length === 0) {
      throw new Error('the file path is empty');
    }

    let mod = modloader.loadedMods.get(modId);
    if (mod == null) {
      throw new Error(`mod '${modId}' not found`);
    }

    return mod.resolvePath(filePath);
  } catch (err) {
    if (errorHasMessage(err)) {
      err.message = `Invalid '${MOD_PROTOCOL_PREFIX}' URL '${fullURI}': ${err.message}`;
    }
    throw err;
  }
}
