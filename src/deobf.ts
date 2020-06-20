import * as files from './files.js';
import { SemVer } from '../common/vendor-libs/semver.js';
import * as paths from '../common/dist/paths.js';

const TABLES_DIR: string = paths.stripRoot(
  new URL('../deobf-tables/', import.meta.url).pathname,
);

export let table = {} as Table;

export async function load(
  gameVersion: SemVer,
  gameVersionHotfix: number,
): Promise<void> {
  let tableName =
    gameVersion.compare('1.1.0') < 0
      ? `${gameVersion}-${gameVersionHotfix}`
      : 'final';
  let tablePath = `${TABLES_DIR}${tableName}.txt`;

  table = {} as Table;

  let lines = (await files.loadText(tablePath)).split('\n');
  for (let i = 0, len = lines.length; i < len; i++) {
    let line = lines[i];
    let colonIndex = line.indexOf(':');
    // a colon right at the start of the line can be used to denote a comment,
    // so if colon index is 0 this line will be skipped as well
    if (colonIndex <= 0) continue;
    let deobfIdentifier = line.slice(0, colonIndex);
    let obfIdentifier = line.slice(colonIndex + 1);
    table[deobfIdentifier] = obfIdentifier;
  }
}

export interface Table extends Record<string, string> {
  _DOMReady: '_DOMReady';
  system: 'system';
  setGameNow: 'setGameNow';
}
