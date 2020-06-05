// no stylesheets have been removed
const REQUIRED_STYLESHEET_URLS = [
  // See note about jQuery UI below
  'impact/page/css/ui-darkness/jquery-ui-1.10.2.custom.min.css',
  // The core stylesheet
  'impact/page/css/style.css',
  // Defines cursor images and styles used by `game/page/game-base.js`
  'game/page/game-base.css',
];

// no scripts have been removed
const REQUIRED_SCRIPT_URLS = [
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
  //    shows a popup which contains a screenshot when you press F8 in browser
  // 4. `SHOW_INDIEGOGO`
  //    shows popup with a link to the Indiegogo campaign, unused since at least
  //    2016
  // 5. `GAME_ERROR_CALLBACK`
  //    shows the "CRITICAL BUG!" popup
  // 6. `SHOW_SAVE_DIALOG`
  //    shows a dialog for importing/exporting save slots when you press F10
  // To be honest, I have no idea why these aren't implemented in
  // `js/game.compiled.js`, so this script is required.
  'game/page/game-base.js',
  // The most useless script in the entire CrossCode and yet it is still
  // required. It does the following things:
  //  1. Fills the `div#options.optionList` element with a bunch of sliders and
  //     buttons. This is not required anymore since the game doesn't use DOM
  //     for GUI and the options menu is already implemented, see
  //     `sc.OptionsMenu` and others. In fact this is so useless that the game
  //     hides this option list by adding a `display: none` rule in the inline
  //     styles.
  //  2. Creates a global `BrowserDetect` object which contains, obviously,
  //     browser detection functions. This "library" is unused since Impact
  //     already contains browser detection functionality.
  //  3. Loads some options (pixel size, scaling mode, music and sound volume)
  //     from `localStorage` which are saved somewhere in options-related game
  //     code. This is needed so that when users change display-related options
  //     their values are used during very early game window initialization.
  //  4. Updates canvas size on start and when the window is resized.
  // This script can't be disabled exactly because of the last two points.
  // TODO: having thought about it, we might as well reimplement required parts
  // of its functionality ourselves.
  'impact/page/js/options.js',
];

const MAIN_SCRIPT_URL = 'js/game.compiled.js';

// General (Cubic) Impact configuration constants. Interesting fact: the only
// two differences between the config from v0.1.0 and v1.2.0-5 is the removal of
// `IG_LANG` and the addition of `IG_GAME_BETA` which has been turned on in the
// pre-1.0 versions (at least in v0.7.0).
// TODO: add descriptions of each constant
const IMPACT_CONFIGURATION: Record<string, unknown> = {
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
};

export async function buildNecessaryDOM(): Promise<void> {
  let base = document.createElement('base');
  base.href = `${location.origin}/assets/`;
  document.head.appendChild(base);

  // meta tags have been removed, they appear to not affect anything

  let canvas = document.createElement('canvas');
  canvas.id = 'canvas';
  let div = document.createElement('div');
  div.id = 'game';
  div.appendChild(canvas);

  // By default the game's HTML page also contains a div element for the "option
  // list" described above, but it is useless as described above, so I removed
  // it. Fortunately jQuery functions don't complain when I remove it because
  // they operate on arrays of elements and handle empty arrays perfectly well.

  // The last inline script has been removed because:
  //  a) it contains an `uncaughtException` handler that silently hides all
  //     errors. Possibly a bug, though it is unlikely that it will be fixed soon
  //     if at all;
  //  b) responsibility of `doStartCrossCodePlz` is handled by the modloader
  //     itself.

  document.body.appendChild(div);
  document.body.style.overflow = 'hidden';

  Object.assign(window, IMPACT_CONFIGURATION);

  await Promise.all([
    ...REQUIRED_STYLESHEET_URLS.map((url) => loadStylesheet(url)),
    ...REQUIRED_SCRIPT_URLS.map((url) =>
      // async is turned off so that these scripts are loaded in the order of
      // addition
      loadScript(url, { async: false }),
    ),
  ]);
}

declare global {
  namespace ig {
    function _DOMReady(): void;

    interface System {
      setGameNow(this: this, gameClass: unknown): void;
    }

    // eslint-disable-next-line no-var
    var system: System;
  }

  function startCrossCode(): void;
}

export async function loadMainScript(): Promise<() => void> {
  let domReadyCallback: () => void = null!;
  callOnIgInitialization(() => {
    domReadyCallback = window.ig._DOMReady;
    window.ig._DOMReady = () => {};
  });

  // async is turned off so that the main script blocks the UI thread while it
  // is being executed
  await loadScript(MAIN_SCRIPT_URL, { async: false });

  if (domReadyCallback == null) throw new Error('domReadyCallback');

  return domReadyCallback;
}

export function loadStylesheet(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    link.addEventListener('load', () => resolve());
    link.addEventListener('error', () =>
      reject(new Error(`Failed to load stylesheet '${url}'`)),
    );
    document.head.appendChild(link);
  });
}

export function loadScript(
  url: string,
  options: { type?: string | null; async?: boolean | null } = {},
): Promise<void> {
  return new Promise((resolve, reject) => {
    let script = document.createElement('script');
    script.src = url;
    if (options.type != null) script.type = options.type;
    if (options.async != null) script.async = options.async;
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () =>
      reject(new Error(`Failed to load script '${url}'`)),
    );
    document.body.appendChild(script);
  });
}

function callOnIgInitialization(callback: () => void): void {
  Object.defineProperty(window, 'ig', {
    configurable: true,
    enumerable: true,

    get() {
      // eslint-disable-next-line no-undefined
      return undefined;
    },

    set(value: typeof ig) {
      delete window.ig;
      window.ig = value;
      callback();
    },
  });
}

export async function getStartFunction(): Promise<() => void> {
  return new Promise((resolve) => {
    // TODO: this replicates the behavior from the original HTML page, I hope we
    // can find a better solution to catch `window.startCrossCode` immediately.
    // Note that most of the time the `setTimeout` won't be fired since at this
    // time `startCrossCode` is most likely available because of the delays
    // caused by mods and event loop ticks caused by usages of promises in the
    // modloader.
    (function waitForStartFunction() {
      if (typeof window.startCrossCode === 'function') {
        resolve(window.startCrossCode);
      } else {
        console.log('wait');
        setTimeout(waitForStartFunction, 100);
      }
    })();
  });
}

export async function waitForIgGameInitialization(): Promise<void> {
  return new Promise((resolve) => {
    let realSetGameNow = window.ig.system.setGameNow;
    window.ig.system.setGameNow = function (...args) {
      let result = realSetGameNow.apply(this, args);
      resolve();
      return result;
    };
  });
}
