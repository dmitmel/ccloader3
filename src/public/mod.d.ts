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
  public readonly baseDirectory: string;
  public readonly manifest: Manifest;
  public readonly assetsDir: string;
  public readonly assets: ReadonlySet<string>;
  public readonly legacyMode: boolean;
  public readonly version: SemVer;
  public readonly dependencies: ReadonlyMap<ModId, ModDependency>;
  public readonly shouldBeLoaded: boolean;
  public readonly classInstance: ModClass | null;

  public resolvePath(path: string): string;
}
