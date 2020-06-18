import {
  IMPACT_CONFIGURATION,
  MAIN_SCRIPT_URL,
  REQUIRED_SCRIPT_URLS,
  REQUIRED_STYLESHEET_URLS,
} from './game.config.js';
import { loadScript, loadStylesheet } from '../common/dist/resources.js';
import { SemVer } from '../common/vendor-libs/semver.js';
import * as files from './files.js';
import { ChangelogFile } from './game-types';

export async function loadVersion(): Promise<{
  version: SemVer;
  hotfix: number;
}> {
  let changelogText = await files.loadFile('assets/data/changelog.json');
  let { changelog } = JSON.parse(changelogText) as ChangelogFile;
  let latestChangelog = changelog[0];

  let version = new SemVer(latestChangelog.version);

  let hotfix = 0;
  let changes = [];
  if (latestChangelog.changes != null) changes.push(...latestChangelog.changes);
  if (latestChangelog.fixes != null) changes.push(...latestChangelog.fixes);
  for (let change of changes) {
    let match = /^\W*HOTFIX\((\d+)\)/i.exec(change);
    if (match != null && match.length === 2) {
      hotfix = Math.max(hotfix, parseInt(match[1], 10));
    }
  }

  return { version, hotfix };
}

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

export async function loadMainScript(
  onImpactInit: () => void,
): Promise<() => void> {
  let domReadyCallback: () => void = null!;
  callOnImpactInit(() => {
    domReadyCallback = window.ig._DOMReady;
    window.ig._DOMReady = () => {};
    onImpactInit();
  });

  // async is turned off so that the main script blocks the UI thread while it
  // is being executed
  await loadScript(MAIN_SCRIPT_URL, { async: false });

  if (domReadyCallback == null) {
    throw new Error('domReadyCallback');
  }

  return domReadyCallback;
}

function callOnImpactInit(callback: () => void): void {
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
