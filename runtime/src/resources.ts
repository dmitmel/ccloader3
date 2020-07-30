import { MOD_PROTOCOL_PREFIX } from './resources.private.js';
import * as resourcesPlain from './resources-plain.js';
import * as patchsteps from '../../common/vendor-libs/patchsteps.js';
import * as utils from '../../common/dist/utils.js';
import { ResourcePatchList } from './patch-list.js';
import * as paths from '../../common/dist/paths.js';
import {
  ImagePatcherContext,
  JSONPatcherContext,
  LoadImageOptions,
  LoadJSONOptions,
  ResolvePathAdvancedResult,
  ResolvePathOptions,
} from 'ultimate-crosscode-typedefs/modloader-stdlib/resources';
import { ResourcePatcherWithDeps } from 'ultimate-crosscode-typedefs/modloader-stdlib/patch-list';

export { resourcesPlain as plain };

export const jsonPatches = new ResourcePatchList<unknown, JSONPatcherContext>();
export const imagePatches = new ResourcePatchList<HTMLCanvasElement, ImagePatcherContext>();
export const assetOverridesTable = new Map<string, string>();

{
  let assetOverridesFromMods = new Map<string, modloader.Mod[]>();

  for (let mod of modloader.loadedMods.values()) {
    for (let asset of mod.assets) {
      if (asset.endsWith('.json.patch')) {
        let patchedAsset = asset.slice(0, -6);
        registerPatchstepsPatch(mod, asset, patchedAsset);
        continue;
      }

      let modsWithThisAsset = utils.mapGetOrInsert(assetOverridesFromMods, asset, []);
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
  mod: modloader.Mod,
  patchFileRelativePath: string,
  patchedAssetPath: string,
): void {
  jsonPatches.add(patchedAssetPath, {
    dependencies: () => {
      return resourcesPlain.loadJSON<patchsteps.Patch>(
        wrapPathIntoURL(`${mod.assetsDirectory}${patchFileRelativePath}`).href,
      );
    },

    patcher: async (data, patchData) => {
      let debugState = new PatchstepsCustomDebugState(mod);
      debugState.addFile([/* fromGame */ false, patchFileRelativePath]);
      await patchsteps.patch(data, patchData, patchstepsResourceLoader, debugState);

      return data;
    },
  });

  function patchstepsResourceLoader(fromGame: string | boolean, url: string): Promise<unknown> {
    return fromGame
      ? loadJSON(url)
      : resourcesPlain.loadJSON(wrapPathIntoURL(mod.resolvePath(url)).href);
  }
}

export function loadText(url: string): Promise<string> {
  return resourcesPlain.loadText(resolvePathToURL(url));
}

export async function loadJSON<T = unknown>(
  path: string,
  options?: LoadJSONOptions | null,
): Promise<T> {
  options = options ?? {};

  let { resolvedPath, requestedAsset } = resolvePathAdvanced(path, {
    allowAssetOverrides: options.allowAssetOverrides,
    allowPatching: options.allowPatching,
  });
  let data = await resourcesPlain.loadJSON(wrapPathIntoURL(resolvedPath).href);

  if (requestedAsset != null) {
    try {
      let patchers = jsonPatches.forPath(requestedAsset);
      if (patchers.length > 0) {
        let ctx: JSONPatcherContext = { resolvedPath, requestedAsset, options };
        data = await runResourcePatches(data, patchers, ctx);
      }
    } catch (err) {
      if (utils.errorHasMessage(err)) {
        err.message = `Failed to patch JSON file '${path}': ${err.message}`;
      }
      throw err;
    }
  }

  return data as T;
}

export async function loadImage(
  path: string,
  options?: LoadImageOptions | null,
): Promise<HTMLImageElement | HTMLCanvasElement> {
  options = options ?? {};

  let { resolvedPath, requestedAsset } = resolvePathAdvanced(path, {
    allowAssetOverrides: options.allowAssetOverrides,
    allowPatching: options.allowPatching,
  });
  let data: HTMLImageElement | HTMLCanvasElement = await resourcesPlain.loadImage(
    wrapPathIntoURL(resolvedPath).href,
  );

  if (requestedAsset != null) {
    try {
      let patchers = imagePatches.forPath(requestedAsset);
      if (patchers.length > 0) {
        data = imageToCanvas(data);
        let ctx: ImagePatcherContext = { resolvedPath, requestedAsset, options };
        data = await runResourcePatches(data, patchers, ctx);
      }
    } catch (err) {
      if (utils.errorHasMessage(err)) {
        err.message = `Failed to patch image file '${path}': ${err.message}`;
      }
      throw err;
    }
  }

  switch (options.returnCanvas) {
    case 'always':
      if (!(data instanceof HTMLCanvasElement)) data = imageToCanvas(data);
      break;
    case 'never':
      if (data instanceof HTMLCanvasElement) data = await canvasToImage(data);
      break;
    case 'if-patched':
      break;
  }

  return data;

  function imageToCanvas(image: HTMLImageElement): HTMLCanvasElement {
    let canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    let ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);
    return canvas;
  }

  function canvasToImage(canvas: HTMLCanvasElement): Promise<HTMLImageElement> {
    return resourcesPlain.loadImage(canvas.toDataURL('image/png'));
  }
}

async function runResourcePatches<Data, Ctx>(
  data: Data,
  patchers: Array<ResourcePatcherWithDeps<Data, unknown, Ctx>>,
  context: Ctx,
): Promise<Data> {
  /* eslint-disable no-undefined */

  let allDependencies: unknown[] = await Promise.all(
    patchers.map((patcher) =>
      patcher.dependencies != null ? patcher.dependencies(context) : undefined,
    ),
  );

  for (let i = 0; i < patchers.length; i++) {
    let patcher = patchers[i];
    let deps = allDependencies[i];
    let newData = await patcher.patcher(data, deps, context);
    if (newData !== undefined) data = newData;
  }

  return data;

  /* eslint-enable no-undefined */
}

export function resolvePath(uri: string, options?: ResolvePathOptions | null): string {
  return resolvePathAdvanced(uri, options).resolvedPath;
}

export function resolvePathToURL(path: string, options?: ResolvePathOptions | null): string {
  return wrapPathIntoURL(resolvePath(path, options)).href;
}

export function resolvePathAdvanced(
  uri: string,
  options?: ResolvePathOptions | null,
): ResolvePathAdvancedResult {
  options = options ?? {};

  let resolvedPath: string;
  let requestedAsset: string | null = null;

  let modResourcePath = applyModURLProtocol(uri);
  if (modResourcePath != null) {
    resolvedPath = modResourcePath;
  } else {
    let normalizedPath = paths.normalize(uri);

    if (paths.isAbsolute(normalizedPath)) {
      // `jailRelative` could've been performed instead, but it has the same
      // effect as `stripRoot` on absolute paths here because the path has
      // already been normalized, therefore the more time-expensive function can
      // be avoided
      resolvedPath = paths.stripRoot(normalizedPath);
    } else {
      let gameAssetsPath = paths.stripRoot(getGameAssetsURL().pathname);
      resolvedPath = paths.jailRelative(paths.join(gameAssetsPath, normalizedPath));

      if ((options.allowPatching ?? true) && resolvedPath.startsWith(gameAssetsPath)) {
        requestedAsset = resolvedPath.slice(gameAssetsPath.length);

        if (options.allowAssetOverrides ?? true) {
          let overridePath = assetOverridesTable.get(requestedAsset);
          if (overridePath != null) {
            resolvedPath = overridePath;
          }
        }
      }
    }
  }

  return { resolvedPath, requestedAsset };
}

export function wrapPathIntoURL(path: string): URL {
  let url = new URL(encodeURI(paths.join('/', path)), getGameAssetsURL());
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
    return ig.getCacheSuffix();
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

    let modIDSeparatorIndex = uri.indexOf('/');
    if (modIDSeparatorIndex < 0) {
      throw new Error("'/' after the mod ID is missing");
    }

    let modID = uri.slice(0, modIDSeparatorIndex);
    if (modID.length === 0) {
      throw new Error('the mod ID is empty');
    }

    let filePath = uri.slice(modIDSeparatorIndex + 1);
    if (filePath.length === 0) {
      throw new Error('the file path is empty');
    }

    let mod = modloader.loadedMods.get(modID);
    if (mod == null) {
      throw new Error(`mod '${modID}' not found`);
    }

    return mod.resolvePath(filePath);
  } catch (err) {
    if (utils.errorHasMessage(err)) {
      err.message = `Invalid '${MOD_PROTOCOL_PREFIX}' URL '${fullURI}': ${err.message}`;
    }
    throw err;
  }
}

class PatchstepsCustomDebugState extends patchsteps.DebugState {
  public constructor(private currentMod: modloader.Mod) {
    super();
  }

  public translateParsedPath(parsedPath: patchsteps.ParsedPath): string {
    if (parsedPath != null) {
      let [protocol, path] = parsedPath;

      // note that switch-case performs strict, i.e. `===`, comparisons
      switch (protocol) {
        case true:
        case 'game':
          return resolvePath(path);

        case false:
        case 'mod':
          return this.currentMod.resolvePath(path);
      }
    }

    // fallback to the default implementation on unknown paths and protocols
    return super.translateParsedPath(parsedPath);
  }
}
