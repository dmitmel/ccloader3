import * as semver from './node-module-imports/_semver.js';
import { SemVer } from './node-module-imports/_semver.js';
import { Manifest, ModId } from './manifest.js';
import * as paths from './paths.js';
import { errorHasMessage } from './utils.js';
import * as game from './game.js';

export interface ModDependency {
  version: semver.Range;
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
  readonly version: SemVer;
  readonly dependencies: ReadonlyMap<ModId, ModDependency>;
  shouldBeLoaded = true;
  classInstance: ModClass | null = null;

  constructor(
    public baseDirectory: string,
    public manifest: Manifest,
    public legacyMode: boolean,
  ) {
    try {
      this.version = new SemVer(manifest.version);
    } catch (err) {
      if (errorHasMessage(err)) {
        // TODO: put a link to semver docs here
        err.message = `mod version '${manifest.version}' is not a valid semver version: ${err.message}`;
      }
      throw err;
    }

    let dependencies = new Map<ModId, ModDependency>();

    if (manifest.dependencies != null) {
      for (let depId of Object.keys(manifest.dependencies)) {
        let dep = manifest.dependencies[depId];
        if (typeof dep === 'string') dep = { version: dep };

        let depVersionRange: semver.Range;
        try {
          depVersionRange = new semver.Range(dep.version);
        } catch (err) {
          if (errorHasMessage(err)) {
            err.message = `dependency version constraint '${dep.version}' for mod '${depId}' is not a valid semver range: ${err.message}`;
          }
          throw err;
        }

        dependencies.set(depId, {
          version: depVersionRange,
          optional: dep.optional ?? false,
        });
      }
    }

    this.dependencies = dependencies;
  }

  async initClass(): Promise<void> {
    let script = this.manifest.main;
    if (script == null) return;
    let scriptFullPath = this.resolvePath(script);

    // eslint-disable-next-line no-shadow
    let module: { default: new (mod: Mod) => ModClass };
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      module = await import(scriptFullPath);
    } catch (err) {
      if (errorHasMessage(err)) {
        err.message = `Error when importing '${scriptFullPath}': ${err.message}`;
      }
      throw err;
    }

    if (!('default' in module)) {
      throw new Error(`Module '${scriptFullPath}' has no default export`);
    }

    // eslint-disable-next-line new-cap
    this.classInstance = new module.default(this);
  }

  async executeStage(stage: ModLoadingStage): Promise<void> {
    if (this.classInstance != null && stage in this.classInstance) {
      await this.classInstance[stage]!(this);
    }

    let script = this.manifest[stage];
    if (script == null) return;
    let scriptFullPath = this.resolvePath(script);

    await game.loadScript(scriptFullPath, {
      type: this.manifest.legacyLoadAsScript ? null : 'module',
    });
  }

  resolvePath(path: string): string {
    return paths.join('/', this.baseDirectory, paths.join('/', path));
  }
}
