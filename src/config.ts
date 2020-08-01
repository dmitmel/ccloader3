import * as paths from '../common/dist/paths.js';
import * as utils from '../common/dist/utils.js';
import * as files from './files.js';
import * as semver from '../common/vendor-libs/semver.js';

export interface Config {
  gameAssetsDir: string;
  modsDirs: string[];
  stylesheetURLs: string[];
  scriptURLs: string[];
  gameScriptURL: string;
  impactConfig: Record<string, unknown>;
  onGameDOMCreated: () => utils.MaybePromise<void>;
}

export interface ConfigModule {
  default: (config: Config, context: ConfigModuleContext) => utils.MaybePromise<void>;
}

export interface ConfigModuleContext {
  modloaderName: string;
  modloaderVersion: semver.SemVer;
}

export async function load(
  modloaderName: string,
  modloaderVersion: semver.SemVer,
): Promise<Config> {
  let config = createDefaultConfig();
  let ctx: ConfigModuleContext = { modloaderName, modloaderVersion };

  let configScriptPath = `${modloaderName}-user-config.js`;

  // there is no way to check if an error thrown by `import()` was a network
  // error (such as the 404 status code) and error messages thrown by it
  // aren't standardized, so we have to check beforehand if the config module
  // exists or not
  if (await files.exists(configScriptPath)) {
    try {
      let configModule: ConfigModule = await import(`/${encodeURI(configScriptPath)}`);
      await configModule.default(config, ctx);
    } catch (err) {
      if (utils.errorHasMessage(err)) {
        err.message = `Error while loading '${configScriptPath}': ${err.message}`;
      }
      throw err;
    }
    console.log('loaded the user configuration');
  }

  return config;
}

function createDefaultConfig(): Config {
  return {
    gameAssetsDir: 'assets',
    modsDirs: ['assets/mods'],

    // no stylesheets have been removed
    stylesheetURLs: [
      // See note about jQuery UI below
      'impact/page/css/ui-darkness/jquery-ui-1.10.2.custom.min.css',
      // The core stylesheet
      'impact/page/css/style.css',
      // Defines cursor images and styles used by `game/page/game-base.js`
      'game/page/game-base.css',
    ],

    // no scripts have been removed
    scriptURLs: [
      // Used for encrypting/decrypting save slots and settings/globals data
      'impact/page/js/aes.js',
      // Adds seeded RNG, exact version of the library is unknown. Appears to be
      // used only for generating random names for runner NPCs.
      'impact/page/js/seedrandom.js',
      // Yes. CrossCode absolutely can't function without jQuery
      'impact/page/js/jquery-1.11.1.min.js',
      // It is unknown whether jQuery UI is required, an audit of game code is
      // necessary. Possibly it is used by RFG's internal browser-based editors.
      'impact/page/js/jquery-ui-1.10.2.custom.min.js',
      // Implements the following functions:
      // 1. `SHOW_GAMECODE`
      //    shows a dialog for entering bonus codes
      // 2. `SHOW_TWITTER`
      //    shows a popup with links to developers' twitter accounts
      // 3. `SHOW_SCREENSHOT`
      //    shows a popup which contains a screenshot when you press F8 in the
      //    browser
      // 4. `SHOW_INDIEGOGO`
      //    shows popup with a link to the Indiegogo campaign, unused since at
      //    least 2016
      // 5. `GAME_ERROR_CALLBACK`
      //    shows the "CRITICAL BUG!" popup
      // 6. `SHOW_SAVE_DIALOG`
      //    shows a dialog for importing/exporting save slots when you press F10
      // To be honest, I have no idea why these aren't implemented in
      // `js/game.compiled.js`, so this script is required.
      'game/page/game-base.js',
      // The most useless script in the entire CrossCode and yet it is still
      // required. It does the following things:
      //  1. Fills the `div#options.optionList` element with a bunch of sliders
      //      and buttons. This is not required anymore since the game doesn't
      //      use DOM for GUI and the options menu is already implemented, see
      //     `sc.OptionsMenu` and others. In fact this is so useless that the
      //     game hides this option list by adding a `display: none` rule in the
      //     inline styles.
      //  2. Creates a global `BrowserDetect` object which contains, obviously,
      //     browser detection functions. This "library" is unused since Impact
      //     already contains browser detection functionality.
      //  3. Loads some options (pixel size, scaling mode, music and sound
      //     volume) from `localStorage` which are saved somewhere in
      //     options-related game code. This is needed so that when users change
      //     display-related options their values are used during very early
      //     game window initialization.
      //  4. Updates canvas size on start and when the window is resized.
      // This script can't be disabled exactly because of the last two points.
      // TODO: having thought about it, we might as well reimplement required
      // parts of its functionality ourselves.
      'impact/page/js/options.js',
    ],

    gameScriptURL: 'js/game.compiled.js',

    // General (Cubic) Impact configuration constants. Interesting fact: the
    // only two differences between the config from v0.1.0 and v1.2.0-5 is the
    // removal of `IG_LANG` and the addition of `IG_GAME_BETA` which has been
    // turned on in the pre-1.0 versions (at least in v0.7.0).
    // TODO: add descriptions of each constant
    impactConfig: {
      IG_GAME_SCALE: 2,
      IG_GAME_CACHE: '',
      IG_ROOT: '',
      IG_WIDTH: 568,
      IG_HEIGHT: 320,
      IG_HIDE_DEBUG: false,
      IG_SCREEN_MODE_OVERRIDE: 2,
      IG_WEB_AUDIO_BGM: false,
      IG_FORCE_HTML5_AUDIO: false,
      LOAD_LEVEL_ON_GAME_START: null,
      IG_GAME_DEBUG: false,
      IG_GAME_BETA: false,
    },

    onGameDOMCreated: () => {},
  };
}
