export * from '../../common/dist/resources.js';

declare global {
  // eslint-disable-next-line no-var
  var IG_ROOT: string;
}

// eslint-disable-next-line no-shadow
const IG_ROOT = window.IG_ROOT ?? '';

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

function transformUrl(url: string): string {
  return applyModUrlProtocol(url) ?? applyAssetOverrides(url) ?? url;
}

function applyAssetOverrides(url: string): string | null {
  if (!url.startsWith(IG_ROOT)) return null;
  url = url.slice(IG_ROOT.length);

  let overrides = [];
  for (let mod of modloader.loadedMods.values()) {
    if (mod.assets.has(url)) {
      overrides.push(`${mod.assetsDir}${url}`);
    }
  }

  if (overrides.length === 0) return null;

  if (overrides.length > 1) {
    console.warn(
      `Conflict between '${overrides.join("', '")}' found. Taking '${
        overrides[0]
      }'`,
    );
  }

  return `/${overrides[0]}`;
}

const MOD_PROTOCOL_PREFIX = 'mod://';

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
