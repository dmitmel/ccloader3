import { SemVer, Range as SemVerRange } from './node-module-imports/_semver.js';
import { Manifest, ModId } from './public/manifest';
// TODO: consider using `import * as cls` here
import {
  ModClass,
  ModDependency,
  ModLoadingStage,
  Mod as ModPublic,
} from './public/mod';
import * as paths from '../common/dist/paths.js';
import { errorHasMessage } from '../common/dist/utils.js';
import * as game from './game.js';
import { findFilesRecursively } from './files.js';

export class Mod implements ModPublic {
  readonly version: SemVer;
  readonly dependencies: ReadonlyMap<ModId, ModDependency>;
  readonly assetsDir: string;
  assets: Set<string> = new Set();
  shouldBeLoaded = true;
  classInstance: ModClass | null = null;

  constructor(
    readonly baseDirectory: string,
    readonly manifest: Manifest,
    readonly legacyMode: boolean,
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

        let depVersionRange: SemVerRange;
        try {
          depVersionRange = new SemVerRange(dep.version);
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

    this.assetsDir = this.resolvePath(
      `${this.manifest.assetsDir ?? 'assets'}/`,
    );
  }

  async findAllAssets(): Promise<void> {
    this.assets = new Set(await findFilesRecursively(this.assetsDir));
  }

  async initClass(): Promise<void> {
    let script = this.manifest.main;
    if (script == null) return;
    let scriptFullPath = this.resolvePath(script);

    // eslint-disable-next-line no-shadow
    let module: { default: new (mod: Mod) => ModClass };
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      module = await import(`/${scriptFullPath}`);
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

    await game.loadScript(`/${scriptFullPath}`, {
      type: this.manifest.legacyLoadAsScript ? null : 'module',
    });
  }

  resolvePath(path: string): string {
    return paths.join(this.baseDirectory, paths.join('/', path));
  }
}
