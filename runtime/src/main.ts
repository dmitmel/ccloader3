import * as paths from '../../common/dist/paths.js';
import * as utils from '../../common/dist/utils.js';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class CCLoaderRuntimeModClass {
  constructor() {
    if (window.ccmod == null) window.ccmod = {} as typeof ccmod;
    ccmod.paths = paths;
    ccmod.utils = utils;
  }
}
