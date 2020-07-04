/* eslint-disable @typescript-eslint/no-unused-vars */
import * as paths_ from '../../../common/dist/paths';
import * as utils_ from '../../../common/dist/utils';
import * as semver_ from '../../../common/vendor-libs/semver';
import * as impactInitHooks_ from '../impact-init-hooks';
import * as impactModuleHooks_ from '../impact-module-hooks';
import * as resources_ from '../resources';
/* eslint-enable @typescript-eslint/no-unused-vars */

declare global {
  namespace ccmod {
    export import paths = paths_;
    export import utils = utils_;
    let require: NodeRequire | undefined;
    export import semver = semver_;
    export import impactInitHooks = impactInitHooks_;
    export import impactModuleHooks = impactModuleHooks_;
    export import resources = resources_;
  }
}
