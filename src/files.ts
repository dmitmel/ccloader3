import * as filesDesktop from './files.desktop.js';
import * as filesBrowser from './files.browser.js';
import * as utils from '../common/dist/utils.js';

export const { loadText, exists, getModDirectoriesIn, getInstalledExtensions } =
  utils.PLATFORM_TYPE === utils.PlatformType.DESKTOP ? filesDesktop : filesBrowser;
