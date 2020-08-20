/* eslint-disable @typescript-eslint/no-namespace */

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

export interface Color {
  r: number;
  g: number;
  b: number;
  a?: number | null;
}

export namespace Color {
  export function toCSS({ r, g, b, a }: Readonly<Color>): string {
    return a != null ? `rgb(${r},${g},${b},${a})` : `rgb(${r},${g},${b})`;
  }

  export function rgb(r: number, g: number, b: number, a?: number | null): Color {
    return { r, g, b, a };
  }
}

export namespace htmlElement {
  export interface CommonOptions {
    attrs?: Record<string, string> | null;
    id?: string | null;
    class?: string[] | null;
    style?: {
      [P in keyof CSSStyleDeclaration]?: Extract<CSSStyleDeclaration[P], string | number> | null;
    };
    children?: Array<string | Node> | null;
  }

  export interface ButtonOptions extends CommonOptions {
    type: string;
  }
}

export function htmlElement(
  tagName: 'button',
  options: htmlElement.ButtonOptions,
): HTMLButtonElement;
export function htmlElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  options: htmlElement.CommonOptions,
): HTMLElementTagNameMap[K];

export function htmlElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  options: htmlElement.CommonOptions,
): HTMLElementTagNameMap[K] {
  let element = document.createElement(tagName);

  if (options.attrs != null) {
    for (let [k, v] of Object.entries(options.attrs)) {
      element.setAttribute(k, v);
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

  if (tagName === 'button') {
    let options_ = options as htmlElement.ButtonOptions;
    let element_ = element as HTMLButtonElement;
    if (options_.type != null) {
      element_.type = options_.type;
    }
  }

  return element;
}
