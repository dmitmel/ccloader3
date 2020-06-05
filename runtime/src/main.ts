import * as paths from '../../common/dist/paths.js';
import * as utils from '../../common/dist/utils.js';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class CCLoaderRuntimeModClass {
  constructor() {
    if (window.ccmod3 == null) window.ccmod3 = {} as typeof ccmod3;
    ccmod3.paths = paths;
    ccmod3.utils = utils;
  }
}
