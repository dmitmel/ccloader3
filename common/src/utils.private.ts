import * as paths from './paths.js';

export * from './utils.js';

export function cwdFilePathToURL(path: string, base: string = document.baseURI): URL {
  let url = new URL(base);
  url.pathname = path;
  return url;
}

export function cwdFilePathFromURL(url: URL): string {
  return paths.stripRoot(decodeURI(url.pathname));
}
