import { errorHasMessage } from '../../common/dist/utils.js';

export * from '../../common/dist/resources.js';

export async function loadJSON<T = unknown>(url: string): Promise<T> {
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

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    let img = new Image();
    img.src = url;
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image '${url}'`));
  });
}
