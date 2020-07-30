enum LogLevel {
  LOG = 2,
  WARN = 1,
  ERROR = 0,
}

type LogLevelName = keyof typeof LogLevel;
type LogLevelsDict<T = boolean> = Record<LogLevelName, T>;

const LOG_LEVEL_MASKS: LogLevelsDict<number> = {
  LOG: 1 << LogLevel.LOG,
  WARN: 1 << LogLevel.WARN,
  ERROR: 1 << LogLevel.ERROR,
};

export const DEFAULT_LOG_LEVELS: LogLevelsDict = {
  LOG: false,
  WARN: true,
  ERROR: true,
};

function logLevelsToBitFlags(logLevels: LogLevelsDict): number {
  let flags = 0;
  for (let [level, enabled] of Object.entries(logLevels)) {
    flags |= Number(enabled) << LogLevel[level as LogLevelName];
  }
  return flags;
}

function logLevelsFromBitFlags(flags: number): LogLevelsDict {
  let logLevels = {} as LogLevelsDict;
  for (let [level, mask] of Object.entries(LOG_LEVEL_MASKS)) {
    logLevels[level as LogLevelName] = Boolean(flags & mask);
  }
  return logLevels;
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

export function setLogLevels(logLevels: LogLevelsDict): void {
  localStorage.setItem('logFlags', String(logLevelsToBitFlags(logLevels)));
}

export function inject(): void {
  let logLevels = getLogLevels();
  console.log(logLevels);
}
