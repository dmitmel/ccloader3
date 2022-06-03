import * as filesDesktop from './files.desktop.js';
import * as filesBrowser from './files.browser.js';
import * as filesAndroid from './files.android.js';
import * as utils from '../common/dist/utils.js';

export const { loadText, isReadable, getModDirectoriesIn, getInstalledExtensions } = {
  [utils.PlatformType.DESKTOP]: filesDesktop,
  [utils.PlatformType.ANDROID]: filesAndroid,
  [utils.PlatformType.BROWSER]: filesBrowser,
}[utils.PLATFORM_TYPE];
