import * as filesDesktop from './files.desktop.js';
import * as filesBrowser from './files.browser.js';
import { PLATFORM_TYPE, PlatformType } from '../common/dist/utils.js';

export const { load, findRecursively, modDirectoriesIn } = PLATFORM_TYPE === PlatformType.Desktop ? filesDesktop : filesBrowser;
