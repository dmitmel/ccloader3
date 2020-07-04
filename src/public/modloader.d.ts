/* eslint-disable @typescript-eslint/no-unused-vars */
import { Mod } from './mod';
import { ModId } from './manifest';
import { SemVer } from '../../common/vendor-libs/semver';
/* eslint-enable @typescript-eslint/no-unused-vars */

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
