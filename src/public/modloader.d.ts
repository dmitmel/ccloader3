import { Mod } from './mod';
import { ModId } from './manifest';
import { SemVer } from '../../common/vendor-libs/semver';

declare module 'semver' {
  interface SemVer {
    toString(this: this): string;
  }

  interface Comparator {
    toString(this: this): string;
  }

  interface Range {
    toString(this: this): string;
  }
}

declare global {
  namespace modloader {
    const name: string;
    const version: SemVer;
    const gameVersion: SemVer;
    const gameVersionHotfix: number;
    const installedMods: ReadonlyMap<ModId, Mod>;
    const loadedMods: ReadonlyMap<ModId, Mod>;
  }
}
