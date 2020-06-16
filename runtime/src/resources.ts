import * as patchsteps from '../../common/vendor-libs/patchsteps.js';
import PatchStepsDebugState from './patch-steps-debug-state.js';
import { Mod } from '../../src/public/mod';
import * as impactModuleHooks from './impact-module-hooks.js';

export * from '../../common/dist/resources.js';

const GAME_ASSETS_URL = new URL(window.IG_ROOT, document.baseURI);

const MOD_PROTOCOL = 'mod:';
const MOD_PROTOCOL_PREFIX = `${MOD_PROTOCOL}//`;

impactModuleHooks.add('impact.base.image', () => {
  ig.Image.inject({
    loadInternal(path) {
      loadImagePatched(path).then(
        (img) => {
          this.data = img;
          this.onload();
        },
        (_err) => {
          this.onerror();
        },
      );
    },

    reload() {
      throw new Error('unsupported');
    },
  });
});

export async function loadImagePatched(
  path: string,
  options?: { returnCanvas?: 'always' | 'if-patched' | 'never' | null },
): Promise<HTMLImageElement | HTMLCanvasElement> {
  options = options ?? {};

  let { resolvedURL, requestedAsset } = resolveURLInternal(path);

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
  args[1] = resolveURL(url);
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
  let { resolvedURL, requestedAsset } = resolveURLInternal(path);

  let data = await loadJSON(resolvedURL);

  if (requestedAsset != null) {
    let patches = resolveAssetPathsInAllMods(`${requestedAsset}.patch`);
    for (let patch of patches) {
      let patchData = await loadJSON(`/${patch.path}`);
      await patchJSON(data, patchData, patch.path, patch.mod);
    }
  }

  return data;
}

function patchJSON(
  data: unknown,
  patchData: patchsteps.Patch,
  patchPath: string,
  patchMod: Mod,
): Promise<void> {
  let debugState = new PatchStepsDebugState(patchMod);
  debugState.addFile([true, patchPath]);
  return patchsteps.patch(
    data,
    patchData,
    (fromGame: string | boolean, url: string): Promise<void> =>
      fromGame
        ? loadJSONPatched(url)
        : loadJSON(`/${patchMod.resolvePath(url)}`),
    debugState,
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function loadJSON(url: string): Promise<any> {
  let res: Response;
  try {
    res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.json();
  } catch (err) {
    if (ccmod3.utils.errorHasMessage(err)) {
      err.message = `Failed to load JSON file '${url}': ${err.message}`;
    }
    throw err;
  }
}

export function resolveURL(url: string): string {
  return resolveURLInternal(url).resolvedURL;
}

interface ResolveURLResult {
  resolvedURL: string;
  requestedAsset: string | null;
}
// TODO: ig.root, ig.getFilePath(), ig.getCacheSuffix()
function resolveURLInternal(url: string): ResolveURLResult {
  let result: ResolveURLResult = {
    resolvedURL: url,
    requestedAsset: null,
  };

  let modResourcePath = applyModURLProtocol(url);
  if (modResourcePath != null) {
    result.resolvedURL = `/${modResourcePath}`;
    return result;
  }

  let normalizedPath = ccmod3.paths.resolve(GAME_ASSETS_URL.pathname, url);
  result.resolvedURL = normalizedPath;

  if (!normalizedPath.startsWith(GAME_ASSETS_URL.pathname)) return result;
  result.requestedAsset = normalizedPath.slice(GAME_ASSETS_URL.pathname.length);

  let overridePath = applyAssetOverrides(result.requestedAsset);
  if (overridePath != null) result.resolvedURL = `/${overridePath}`;

  return result;
}

function applyAssetOverrides(path: string): string | null {
  let overrides = resolveAssetPathsInAllMods(path);
  if (overrides.length === 0) return null;

  if (overrides.length > 1) {
    console.warn(
      `Conflict between overrides for '${path}' found in mods '${overrides
        .map(({ mod }) => mod.manifest.id)
        .join("', '")}' found. Using the override from mod '${
        overrides[0].mod.manifest.id
      }'`,
    );
  }

  return overrides[0].path;
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

function applyModURLProtocol(fullURI: string): string | null {
  if (!fullURI.startsWith(MOD_PROTOCOL_PREFIX)) return null;

  try {
    let uri = fullURI.slice(MOD_PROTOCOL_PREFIX.length);
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

    return mod.resolvePath(filePath);
  } catch (err) {
    if (ccmod3.utils.errorHasMessage(err)) {
      err.message = `Invalid 'mod://' URL '${fullURI}': ${err.message}`;
    }
    throw err;
  }
}
