import { ModClass } from '../../src/public/mod';

import * as paths from '../../common/dist/paths.js';
import * as utils from '../../common/dist/utils.js';
import { requireFixed } from '../../common/dist/require.js';
import * as semver from '../../common/vendor-libs/semver.js';

import * as impactInitHooks from './impact-init-hooks.js';
import * as impactModuleHooks from './impact-module-hooks.js';
import * as resources from './resources.js';
import './resources-injections.js';
import './lang-file-patcher.js';
import './greenworks-fix.js';

export default class CCLoaderRuntimeMod implements ModClass {
  public constructor() {
    if (window.ccmod == null) window.ccmod = {} as typeof ccmod;
    ccmod.paths = paths;
    ccmod.utils = utils;
    ccmod.require = requireFixed;
    ccmod.semver = semver;
    ccmod.impactInitHooks = impactInitHooks;
    ccmod.impactModuleHooks = impactModuleHooks;
    ccmod.resources = resources;
  }

  public onImpactInit(): void {
    for (let cb of impactInitHooks.callbacks) cb();
  }

  public async postload(): Promise<void> {
    await import('./_postload.js');
  }
}
