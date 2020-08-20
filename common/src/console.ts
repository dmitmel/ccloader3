/* eslint-disable @typescript-eslint/no-namespace */

const nodejsUtil = window.require?.('util') as typeof import('util');

export enum LogLevel {
  LOG = 2,
  WARN = 1,
  ERROR = 0,
}

export type LogLevelName = keyof typeof LogLevel;
export type LogLevelsDict<T = boolean> = Record<LogLevelName, T>;

export const LOG_LEVEL_NAMES: readonly LogLevelName[] = ['LOG', 'WARN', 'ERROR'];

export const DEFAULT_LOG_LEVELS: LogLevelsDict = {
  LOG: false,
  WARN: true,
  ERROR: true,
};

function logLevelsToBitFlags(levels: LogLevelsDict): number {
  let flags = 0;
  for (let level of LOG_LEVEL_NAMES) {
    let enabled = levels[level];
    flags |= Number(enabled) << LogLevel[level];
  }
  return flags;
}

function logLevelsFromBitFlags(flags: number): LogLevelsDict {
  let levels = {} as LogLevelsDict;
  for (let level of LOG_LEVEL_NAMES) {
    let bit = LogLevel[level];
    levels[level] = Boolean(flags & (1 << bit));
  }
  return levels;
}

function getLogLevels(): LogLevelsDict {
  let flagsStr = localStorage.getItem('logFlags');
  if (flagsStr != null) {
    let flags = parseInt(flagsStr, 10);
    if (Number.isSafeInteger(flags)) {
      return logLevelsFromBitFlags(flags);
    }
  }
  return { ...DEFAULT_LOG_LEVELS };
}

export function setLogLevels(levels: LogLevelsDict): void {
  localStorage.setItem('logFlags', String(logLevelsToBitFlags(levels)));
}

const EVENTS_BLOCKED_BY_CONSOLE: Array<keyof WindowEventMap> = [
  'mousewheel',
  'contextmenu',
  'mousedown',
  'mouseup',
  'mousemove',
  'touchstart',
  'touchend',
  'touchmove',
  'keydown',
  'keyup',
  'keypress',
];

interface Color {
  r: number;
  g: number;
  b: number;
  a?: number | null;
}

namespace Color {
  export function toCSS({ r, g, b, a }: Readonly<Color>): string {
    return a != null ? `rgb(${r},${g},${b},${a})` : `rgb(${r},${g},${b})`;
  }

  export function rgb(r: number, g: number, b: number, a?: number | null): Color {
    return { r, g, b, a };
  }
}

import rgb = Color.rgb;

// colors were taken from the material palette, see <https://material.io/resources/color/>
const TEXT_COLOR = '#e0e0e0'; // Grey 300
const LOG_LEVEL_COLORS: LogLevelsDict<{
  readonly bg: Readonly<Color>;
  readonly border: Readonly<Color>;
}> = {
  LOG: { bg: rgb(27, 27, 27) /* Grey 800 dark */, border: rgb(66, 66, 66) /* Grey 800 */ },
  WARN: { bg: rgb(196, 62, 0) /* Amber 900 dark */, border: rgb(255, 111, 0) /* Amber 900 */ },
  ERROR: { bg: rgb(127, 0, 0) /* Red 900 dark */, border: rgb(183, 28, 28) /* Red 900 */ },
};

const LOG_LEVEL_APPEARENCE_DURATIONS: LogLevelsDict<number> = {
  LOG: 2000,
  WARN: 5000,
  ERROR: 15000,
};

/* eslint-disable no-multi-assign */

let rootElement: HTMLElement;
export function inject(): void {
  let logLevels = getLogLevels();

  {
    let el = document.createElement('pre');
    rootElement = el;
    el.id = 'console';
    el.style.display = 'flex';
    el.style.flexDirection = 'column';
    el.style.margin = '0';
    el.style.padding = '0';
    el.style.position = 'fixed';
    el.style.top = el.style.left = el.style.right = '0';
    el.style.zIndex = '9999';
    el.style.maxHeight = '100%';
    el.style.fontSize = '18px';
    el.style.whiteSpace = 'pre-wrap';
    el.style.wordBreak = 'break-all';
    el.style.overflowY = 'auto';

    for (let eventType of EVENTS_BLOCKED_BY_CONSOLE) {
      el.addEventListener(eventType, (event) => event.stopPropagation());
    }

    document.body.append(el);
  }

  function hookConsoleMethod(name: keyof typeof console, level: LogLevel): void {
    let old = console[name] as (...message: unknown[]) => void;
    console[name] = function (...message: unknown[]): void {
      let result = old.apply(this, message);
      log(level, ...message);
      return result;
    };
  }

  if (logLevels.ERROR) {
    hookConsoleMethod('error', LogLevel.ERROR);
  }
  if (logLevels.WARN) {
    hookConsoleMethod('warn', LogLevel.WARN);
  }
  if (logLevels.LOG) {
    hookConsoleMethod('log', LogLevel.LOG);
    hookConsoleMethod('info', LogLevel.LOG);
  }
}

function log(level: LogLevel, ...message: unknown[]): void {
  let levelName = LogLevel[level] as LogLevelName;

  let el = document.createElement('code');
  el.classList.add('message', levelName);
  el.style.padding = '4px';
  el.style.borderBottom = '2px solid';

  el.style.color = TEXT_COLOR;
  let colors = LOG_LEVEL_COLORS[levelName];
  el.style.backgroundColor = Color.toCSS({ ...colors.bg, a: 0.8 });
  el.style.borderColor = Color.toCSS(colors.border);

  el.textContent = `[${LogLevel[level]}] ${formatMessage(...message)}`;

  rootElement.append(el);

  let removeTimeout = setTimeout(() => {
    el.remove();
  }, LOG_LEVEL_APPEARENCE_DURATIONS[levelName]);

  el.addEventListener('click', (event) => {
    event.stopPropagation();
    event.preventDefault();
    el.remove();
    clearTimeout(removeTimeout);
  });

  rootElement.scrollTo(0, rootElement.scrollHeight);
}

function formatMessage(...message: unknown[]): string {
  if (nodejsUtil != null) {
    let formatFn = nodejsUtil.format as (...args: unknown[]) => string;
    return formatFn(...message);
  } else {
    return message.map((m) => String(m)).join(' ');
  }
}
