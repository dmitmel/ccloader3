import * as patchsteps from '../../common/vendor-libs/patchsteps.js';
import PatchStepsDebugState from './patch-steps-debug-state.js';
import { Mod } from '../../src/public/mod';

export * from '../../common/dist/resources.js';

// TODO ig.getCacheSuffix()

// this path is always absolute
const GAME_ASSETS_URL = new URL(window.IG_ROOT, document.baseURI);

const MOD_PROTOCOL = 'mod:';
const MOD_PROTOCOL_PREFIX = `${MOD_PROTOCOL}//`;

const ImageOriginal = window.Image;
// eslint-disable-next-line no-shadow
window.Image = class Image extends ImageOriginal {
  public get src(): string {
    return super.src;
  }

  public set src(url: string) {
    super.src = transformUrl(url);
  }
};

type XHROpenArgs = [
  string, // method
  string, // url
  boolean?, // async
  (string | null)?, // username
  (string | null)?, // password
];

const xhrOpenOriginal = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (...args: XHROpenArgs) {
  let url = args[1];
  args[1] = transformUrl(url);
  return (xhrOpenOriginal as (...args: XHROpenArgs) => void).apply(this, args);
};

$.ajaxSetup({
  beforeSend(_jqXhr: JQueryXHR, settings: JQueryAjaxSettings): boolean {
    if (settings.dataType !== 'json' || settings.type !== 'GET') return true;

    let { url } = settings;
    if (typeof url !== 'string') return true;

    if (!url.startsWith(MOD_PROTOCOL)) {
      let parsedUrl = new URL(url, GAME_ASSETS_URL).href;
      if (!parsedUrl.startsWith(GAME_ASSETS_URL.href)) return true;
    }

    // TODO: ig.Extension#checkFileList
    let { context, success, error, complete } = settings;
    delete settings.success;
    delete settings.error;
    delete settings.complete;
    loadJSONPatched(url)
      .then(
        (data) => {
          if (success != null) success.call(context, data, 'hijacked', null!);
        },
        (err) => {
          // errors aren't really handled by the game though
          if (error != null) error.call(context, null!, 'hijacked', err);
        },
      )
      .finally(() => {
        if (complete != null) complete.call(context, null!, 'hijacked');
      });

    return false;
  },
});

// TODO: options object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadJSONPatched(path: string): Promise<any> {
  {
    let modResourcePath = applyModUrlProtocol(path);
    if (modResourcePath != null) return loadJSON(modResourcePath);
  }

  let requestedPath = ccmod3.paths.resolve(GAME_ASSETS_URL.pathname, path);

  if (!requestedPath.startsWith(GAME_ASSETS_URL.pathname)) {
    return loadJSON(requestedPath);
  }

  let requestedAssetPath = requestedPath.slice(GAME_ASSETS_URL.pathname.length);
  let resolvedPath = requestedPath;

  {
    let overridePath = applyAssetOverrides(requestedAssetPath);
    if (overridePath != null) resolvedPath = overridePath;
  }

  let data = await loadJSON(resolvedPath);

  let patches = resolveAssetPathsInAllMods(`${requestedAssetPath}.patch`);
  for (let patch of patches) {
    let patchData = await loadJSON(patch.path);
    await patchJSON(data, patchData, patch.path, patch.mod.baseDirectory);
  }

  return data;
}

function patchJSON(
  data: unknown,
  patchData: patchsteps.Patch,
  patchPath: string,
  patchModBaseDir: string,
): Promise<void> {
  let debugState = new PatchStepsDebugState(patchModBaseDir);
  debugState.addFile([true, patchPath]);
  return patchsteps.patch(
    data,
    patchData,
    (fromGame: string | boolean, url: string): Promise<void> =>
      fromGame ? loadJSONPatched(url) : loadJSON(`${patchModBaseDir}${url}`),
    debugState,
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadJSON(path: string): Promise<any> {
  let url = ccmod3.paths.join('/', path);
  let res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json();
}

export function transformUrl(url: string): string {
  return applyModUrlProtocol(url) ?? applyAssetOverrides(url) ?? url;
}

function applyAssetOverrides(url: string): string | null {
  let overrides = resolveAssetPathsInAllMods(url);
  if (overrides.length === 0) return null;

  if (overrides.length > 1) {
    console.warn(
      `Conflict between overrides for '${url}' found in mods '${overrides
        .map(({ mod }) => mod.manifest.id)
        .join("', '")}' found. Using the override from mod '${
        overrides[0].mod.manifest.id
      }'`,
    );
  }

  return `/${overrides[0].path}`;
}

function resolveAssetPathsInAllMods(
  path: string,
): Array<{ mod: Mod; path: string }> {
  let results: Array<{ mod: Mod; path: string }> = [];
  for (let mod of modloader.loadedMods.values()) {
    if (mod.assets.has(path)) {
      results.push({ mod, path: `${mod.assetsDir}${path}` });
    }
  }
  return results;
}

function applyModUrlProtocol(fullUrl: string): string | null {
  if (!fullUrl.startsWith(MOD_PROTOCOL_PREFIX)) return null;

  try {
    let uri = fullUrl.slice(MOD_PROTOCOL_PREFIX.length);
    if (uri.length === 0) throw new Error('the URI is empty');

    let modIdSeparatorIndex = uri.indexOf('/');
    if (modIdSeparatorIndex < 0) {
      throw new Error("'/' after the mod ID is missing");
    }

    let modId = uri.slice(0, modIdSeparatorIndex);
    if (modId.length === 0) throw new Error('the mod ID is empty');

    let filePath = uri.slice(modIdSeparatorIndex + 1);
    if (filePath.length === 0) throw new Error('the file path is empty');

    let mod = modloader.loadedMods.get(modId);
    if (mod == null) throw new Error(`mod '${modId}' not found`);

    return `/${mod.resolvePath(filePath)}`;
  } catch (err) {
    if (ccmod3.utils.errorHasMessage(err)) {
      err.message = `Invalid 'mod://' URL '${fullUrl}': ${err.message}`;
    }
    throw err;
  }
}
