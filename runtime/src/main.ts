import * as paths from '../../common/dist/paths.js';
import * as utils from '../../common/dist/utils.js';
import { requireFixed } from '../../common/dist/require.js';
import * as semver from '../../common/vendor-libs/semver.js';

import * as impactInitHooks from './impact-init-hooks.js';
import * as impactModuleHooks from './impact-module-hooks.js';
import * as resources from './resources.js';
import './resources-injections.js';

export default class CCLoaderRuntimeMod {
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
}
