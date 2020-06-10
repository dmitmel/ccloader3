import * as paths from '../../common/dist/paths.js';
import * as utils from '../../common/dist/utils.js';
import { requireFixed } from '../../common/dist/require.js';
import * as semver from '../../common/vendor-libs/semver.js';

import * as resources from './resources.js';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class CCLoaderRuntimeModClass {
  public constructor() {
    if (window.ccmod3 == null) window.ccmod3 = {} as typeof ccmod3;
    Object.assign(ccmod3, {
      paths,
      utils,
      require: requireFixed,
      semver,
      resources,
    });
  }
}
