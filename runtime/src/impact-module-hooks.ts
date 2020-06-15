// based on https://github.com/CCDirectLink/DevModLoader/blob/7dd3c4ebee4b516b201205d0bb1c24913335b9f1/js/game/ig-interceptor.js

export const registeredHooks = new Map<string, Array<() => void>>();

export function add(moduleName: string, callback: () => void): void {
  let list = registeredHooks.get(moduleName);
  if (list == null) {
    list = [];
    registeredHooks.set(moduleName, list);
  }
  list.push(callback);
}

// eslint-disable-next-line @typescript-eslint/naming-convention
export function __onImpactInit__(): void {
  let originalDefines = ig.defines;
  ig.defines = function (body) {
    let { name }: ig.Module = ig._current!;
    if (name == null) return originalDefines.call(this, body);
    return originalDefines.call(this, function () {
      body();
      let callbacks = registeredHooks.get(name!);
      if (callbacks == null) return;
      for (let cb of callbacks) cb();
    });
  };
}
