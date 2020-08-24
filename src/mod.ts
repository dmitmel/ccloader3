import * as semver from '../common/vendor-libs/semver.js';
import * as paths from '../common/dist/paths.js';
import * as utils from '../common/dist/utils.js';
import * as filesDesktop from './files.desktop.js';
import { Manifest } from 'ultimate-crosscode-typedefs/file-types/mod-manifest';
import {
  Dependency,
  LegacyMainClass,
  LoadingStage,
  MainClass,
  ModID,
  Mod as ModPublic,
} from 'ultimate-crosscode-typedefs/modloader/mod';

export class Mod implements ModPublic {
  public readonly id: ModID;
  public readonly version: semver.SemVer | null = null;
  public readonly dependencies: ReadonlyMap<ModID, Dependency>;
  public readonly assetsDirectory: string;
  public assets: Set<string> = new Set();
  public mainClassInstance: MainClass | null = null;

  public constructor(
    public readonly baseDirectory: string,
    public readonly manifest: Manifest,
    public readonly legacyMode: boolean,
  ) {
    if (!this.baseDirectory.endsWith('/')) this.baseDirectory += '/';

    this.id = this.manifest.id;

    if (this.manifest.version != null) {
      try {
        this.version = new semver.SemVer(this.manifest.version);
      } catch (err) {
        if (utils.errorHasMessage(err)) {
          // TODO: put a link to semver docs here
          err.message = `mod version '${this.manifest.version}' is not a valid semver version: ${err.message}`;
        }
        throw err;
      }
    }

    let dependencies = new Map<ModID, Dependency>();

    if (this.manifest.dependencies != null) {
      for (let [depId, dep] of Object.entries(this.manifest.dependencies)) {
        if (typeof dep === 'string') dep = { version: dep };

        let depVersionRange: semver.Range;
        try {
          depVersionRange = new semver.Range(dep.version);
        } catch (err) {
          if (utils.errorHasMessage(err)) {
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

    this.assetsDirectory = this.resolvePath(`${this.manifest.assetsDir ?? 'assets'}/`);
  }

  public async findAllAssets(): Promise<void> {
    let assets: string[] = [];
    if (this.manifest.assets != null) {
      assets = this.manifest.assets.map((path) => paths.jailRelative(path));
    } else if (utils.PLATFORM_TYPE === utils.PlatformType.DESKTOP) {
      assets = await filesDesktop.findRecursively(this.assetsDirectory);
    }
    this.assets = new Set(assets);
  }

  public async initClass(): Promise<void> {
    let script = this.manifest.main;
    if (script == null) return;
    let scriptFullPath = this.resolvePath(script);

    let module: { default: new (mod: ModPublic) => MainClass };
    try {
      module = await import(utils.cwdFilePathToURL(scriptFullPath).href);
    } catch (err) {
      if (utils.errorHasMessage(err)) {
        err.message = `Error while importing '${scriptFullPath}': ${err.message}`;
      }
      throw err;
    }

    if (!('default' in module)) {
      throw new Error(`Module '${scriptFullPath}' has no default export`);
    }

    // eslint-disable-next-line new-cap
    this.mainClassInstance = new module.default(this);
  }

  public async executeStage(stage: LoadingStage): Promise<void> {
    let mainCls = this.mainClassInstance;
    if (mainCls != null) {
      if (!this.legacyMode) {
        if (stage in mainCls) await mainCls[stage]!(this);
      } else {
        let legacyMainCls = mainCls as LegacyMainClass;
        let methodName: keyof LegacyMainClass = stage === 'poststart' ? 'main' : stage;
        if (methodName in legacyMainCls) await legacyMainCls[methodName]!();
      }
    }

    let script = this.manifest[stage];
    if (script == null) return;
    let scriptFullPath = this.resolvePath(script);

    await import(utils.cwdFilePathToURL(scriptFullPath).href);
  }

  public resolvePath(path: string): string {
    return paths.join(this.baseDirectory, paths.jailRelative(path));
  }
}
