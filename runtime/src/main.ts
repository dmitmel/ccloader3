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
    if (window.ccmod3 == null) window.ccmod3 = {} as typeof ccmod3;
    Object.assign(ccmod3, {
      paths,
      utils,
      require: requireFixed,
      semver,
      impactInitHooks,
      impactModuleHooks,
      resources,
    });
  }

  public onImpactInit(): void {
    for (let cb of impactInitHooks.callbacks) cb();
  }

  public async postload(): Promise<void> {
    await import('./font.js');
    await import('./options.js');
    await import('./input.js');

    await import('./ui/options-mods-tab.js');
    await import('./ui/options-definitions.js');
    await import('./ui/options-values.js');
    await import('./ui/version-display.js');
    await import('./ui/lang.js');
  }
}
