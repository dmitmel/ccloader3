export {};
declare global {
  // eslint-disable-next-line no-var
  var IG_ROOT: string;
}

// eslint-disable-next-line no-shadow
const IG_ROOT = window.IG_ROOT ?? '';

const ImageOriginal = window.Image;
// eslint-disable-next-line no-shadow
window.Image = class Image extends ImageOriginal {
  get src(): string {
    return super.src;
  }

  set src(url: string) {
    super.src = applyAssetOverrides(url);
  }
};

function applyAssetOverrides(url: string): string {
  if (!url.startsWith(IG_ROOT)) return url;
  let urlWithoutRoot = url.slice(IG_ROOT.length);

  let overrides = [];
  for (let mod of modloader.loadedMods.values()) {
    if (mod.assets.has(urlWithoutRoot)) {
      overrides.push(`${mod.assetsDir}${urlWithoutRoot}`);
    }
  }

  if (overrides.length === 0) return url;

  if (overrides.length > 1) {
    console.warn(
      `Conflict between '${overrides.join("', '")}' found. Taking '${
        overrides[0]
      }'`,
    );
  }

  let overridenUrl = `/${overrides[0]}`;
  console.log(`Replacing '${url}' with '${overridenUrl}'`);
  return overridenUrl;
}
