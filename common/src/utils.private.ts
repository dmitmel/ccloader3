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

export function html<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  options: {
    attrs?: { [attr: string]: string | null | undefined } | null;
    id?: string | null;
    class?: string[] | null;
    style?: {
      [P in keyof CSSStyleDeclaration]?: Extract<CSSStyleDeclaration[P], string | number> | null;
    };
    children?: Array<string | Node> | null;
  },
): HTMLElementTagNameMap[K] {
  let element = document.createElement(tagName);

  if (options.attrs != null) {
    for (let [k, v] of Object.entries(options.attrs)) {
      if (v != null) {
        element.setAttribute(k, v);
      }
    }
  }

  if (options.id != null) {
    element.id = options.id;
  }
  if (options.class != null) {
    element.classList.add(...options.class);
  }

  if (options.style != null) {
    for (let [k, v] of Object.entries(options.style)) {
      if (v != null) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (element.style as any)[k] = v;
      }
    }
  }

  if (options.children != null) {
    element.append(...options.children);
  }

  return element;
}
