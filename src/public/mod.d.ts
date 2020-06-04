import { SemVer, Range as SemVerRange } from 'semver';
import { Manifest, ModId } from './manifest';

export interface ModDependency {
  version: SemVerRange;
  optional: boolean;
}

export interface ModClass {
  preload?(mod: Mod): Promise<void> | void;
  postload?(mod: Mod): Promise<void> | void;
  prestart?(mod: Mod): Promise<void> | void;
  poststart?(mod: Mod): Promise<void> | void;
}

export type ModLoadingStage = 'preload' | 'postload' | 'prestart' | 'poststart';

export class Mod {
  readonly baseDirectory: string;
  readonly manifest: Manifest;
  readonly assetsDir: string;
  readonly assets: ReadonlySet<string>;
  readonly legacyMode: boolean;
  readonly version: SemVer;
  readonly dependencies: ReadonlyMap<ModId, ModDependency>;
  readonly shouldBeLoaded: boolean;
  readonly classInstance: ModClass | null;

  resolvePath(path: string): string;
}
