import * as utils from '../../common/dist/utils.js';

import { loadScript, loadStylesheet } from '../../common/dist/resources.js';

export async function loadText(url: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    return await res.text();
  } catch (err) {
    if (utils.errorHasMessage(err)) {
      err.message = `Failed to load text file '${url}': ${err.message}`;
    }
    throw err;
  }
}

export async function loadJSON<T = unknown>(url: string): Promise<T> {
  let text = await loadText(url);
  try {
    return JSON.parse(text);
  } catch (err) {
    if (utils.errorHasMessage(err)) {
      err.message = `Failed to parse JSON file '${url}': ${err.message}`;
    }
    throw err;
  }
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    let img = new Image();
    img.src = url;
    if (utils.PLATFORM_TYPE === utils.PlatformType.ANDROID) {
      // For some reason not doing this causes troubles with our current
      // implementation of the Android port, specifically, that causes
      // `ig.Font#_loadMetrics` to fail. Apparently if you draw an image onto a
      // canvas and both didn't come from the same origin, the canvas becomes
      // "tainted" and you then can't read the image data off of it, and the
      // same-origin rules aren't well-defined for `file://` URLs. This seems
      // to magically fix the issue, but what really bothers me is that the
      // game loads fine if we don't make the image-related injections, so this
      // also has to do with in which scripts the `Image` class is
      // instantiated... Whatever.
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image '${url}'`));
  });
}

export const namespace: typeof ccmod.resources.plain = {
  loadText,
  loadJSON,
  loadImage,
  loadScript,
  loadStylesheet,
};
