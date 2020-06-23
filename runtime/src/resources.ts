import * as patchsteps from '../../common/vendor-libs/patchsteps.js';
import PatchStepsDebugState from './patch-steps-debug-state.js';
import { Mod } from '../../src/public/mod';
import { GAME_ASSETS_URL, MOD_PROTOCOL_PREFIX } from './resources.constants.js';
import { MaybePromise, errorHasMessage, mapGetOrInsert } from '../../common/dist/utils.js';
import PatchList from './patch-list.js';
import * as paths from '../../common/dist/paths.js';

export * from '../../common/dist/resources.js';

import DynamicJSONFiles from './dynamic-json-files.js';


export const dynamicJSONFiles = new DynamicJSONFiles; // 

export type JSONPatcher = (
  data: unknown,
  context: JSONPatcherContext,
) => MaybePromise<unknown | void>;
export interface JSONPatcherContext {
  resolvedURL: string;
  requestedAsset: string;
  options: LoadJSONPatchedOptions;
}
export const jsonPatches = new PatchList<JSONPatcher>();

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
  jsonPatches.add(patchedAssetPath, async (data) => {
    let patchData = (await loadJSON(
      `/${mod.assetsDirectory}${patchFileRelativePath}`,
    )) as patchsteps.PatchStep[];

    let debugState = new PatchStepsDebugState(mod);
    debugState.addFile([/* fromGame */ false, patchFileRelativePath]);

    await patchsteps.patch(
      data,
      patchData,
      (fromGame: string | boolean, url: string): Promise<unknown> =>
        fromGame ? loadJSONPatched(url) : loadJSON(`/${mod.resolvePath(url)}`),
      debugState,
    );

    return data;
  });
}

export interface LoadJSONPatchedOptions {
  callerThisValue?: unknown;
}
export async function loadJSONPatched(
  path: string,
  options?: LoadJSONPatchedOptions | null,
): Promise<unknown> {
  options = options ?? {};

  let { resolvedURL, requestedAsset } = resolveURLInternal(path);
  // TODO: download data and patches in parallel
  let data = await loadJSON(resolvedURL);

  if (requestedAsset != null) {
    try {
      let context: JSONPatcherContext = { resolvedURL, requestedAsset, options };
      for (let patcher of jsonPatches.forPath(requestedAsset)) {
        let newData = await patcher(data, context);
        // eslint-disable-next-line no-undefined
        if (newData !== undefined) data = newData;
      }
    } catch (err) {
      if (errorHasMessage(err)) {
        err.message = `Failed to patch JSON file '${path}': ${err.message}`;
      }
      throw err;
    }
  }

  return data;
}

export async function loadJSON(url: string): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    if (errorHasMessage(err)) {
      err.message = `Failed to load JSON file '${url}': ${err.message}`;
    }
    throw err;
  }
}

export async function loadImagePatched(
  path: string,
  options?: { returnCanvas?: 'always' | 'if-patched' | 'never' | null },
): Promise<HTMLImageElement | HTMLCanvasElement> {
  options = options ?? {};

  let { resolvedURL } = resolveURLInternal(path);

  let img: HTMLImageElement | HTMLCanvasElement = await loadImage(resolvedURL);

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
    img = await loadImage(img.toDataURL('image/png'));
  }

  return img;
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    let img = new Image();
    img.src = url;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image '${url}'`));
  });
}

export function resolveURL(url: string): string {
  return resolveURLInternal(url).resolvedURL;
}

interface ResolveURLResult {
  resolvedURL: string;
  requestedAsset: string | null;
}
// TODO: ig.root, ig.getFilePath()
function resolveURLInternal(url: string): ResolveURLResult {
  let result: ResolveURLResult = {
    resolvedURL: url,
    requestedAsset: null,
  };

  function finalizeResult(): ResolveURLResult {
    if (typeof ig !== 'undefined') result.resolvedURL += ig[deobf.getCacheSuffix]();
    result.resolvedURL = encodeURI(result.resolvedURL);
    return result;
  }

  let modResourcePath = applyModURLProtocol(url);
  if (modResourcePath != null) {
    result.resolvedURL = `/${modResourcePath}`;
    return finalizeResult();
  }

  let normalizedPath = paths.resolve(GAME_ASSETS_URL.pathname, url);
  result.resolvedURL = normalizedPath;

  if (!normalizedPath.startsWith(GAME_ASSETS_URL.pathname)) {
    return finalizeResult();
  }

  result.requestedAsset = normalizedPath.slice(GAME_ASSETS_URL.pathname.length);

  let overridePath = assetOverridesTable.get(result.requestedAsset);
  if (overridePath != null) {
    result.resolvedURL = `/${overridePath}`;
  }

  return finalizeResult();
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
