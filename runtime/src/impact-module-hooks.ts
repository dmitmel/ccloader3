// based on https://github.com/CCDirectLink/DevModLoader/blob/7dd3c4ebee4b516b201205d0bb1c24913335b9f1/js/game/ig-interceptor.js

import * as impactInitHooks from './impact-init-hooks.js';
import PatchList from './patch-list.js';

export const patchList = new PatchList<() => void>();

export function add(moduleName: string, callback: () => void): void {
  patchList.add(moduleName, callback);
}

impactInitHooks.add(() => {
  let originalDefines = ig[deobf.defines];
  ig[deobf.defines] = function (body) {
    let { name }: ig.Module = ig[deobf._current]!;
    if (name == null) return originalDefines.call(this, body);
    return originalDefines.call(this, function () {
      body();
      for (let cb of patchList.forPath(name!)) cb();
    });
  };
});
