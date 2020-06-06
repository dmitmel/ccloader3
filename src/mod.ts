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
import * as files from './files.js';

export class Mod implements ModPublic {
  public readonly version: SemVer;
  public readonly dependencies: ReadonlyMap<ModId, ModDependency>;
  public readonly assetsDir: string;
  public assets: Set<string> = new Set();
  public shouldBeLoaded = true;
  public classInstance: ModClass | null = null;

  public constructor(
    public readonly baseDirectory: string,
    public readonly manifest: Manifest,
    public readonly legacyMode: boolean,
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

  public async findAllAssets(): Promise<void> {
    this.assets = new Set(await files.findRecursively(this.assetsDir));
  }

  public async initClass(): Promise<void> {
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

  public async executeStage(stage: ModLoadingStage): Promise<void> {
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

  public resolvePath(path: string): string {
    return paths.join(this.baseDirectory, paths.join('/', path));
  }
}
