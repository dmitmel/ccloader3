// based on https://github.com/CCDirectLink/DevModLoader/blob/7dd3c4ebee4b516b201205d0bb1c24913335b9f1/js/game/ig-interceptor.js

import * as impactInitHooks from './impact-init-hooks.js';
import { mapGetOrInsert } from '../../common/dist/utils.js';

export const registeredHooks = new Map<string, Array<() => void>>();

export function add(moduleName: string, callback: () => void): void {
  mapGetOrInsert(registeredHooks, moduleName, []).push(callback);
}

impactInitHooks.add(() => {
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
});
