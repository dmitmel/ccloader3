import * as semver from './node-module-imports/_semver.js';
import { SemVer } from './node-module-imports/_semver.js';
import { Manifest, ModId } from './manifest.js';
import { errorHasMessage } from './utils.js';

export interface ModDependency {
  version: semver.Range;
  optional: boolean;
}

export class Mod {
  readonly version: SemVer;
  readonly dependencies: ReadonlyMap<ModId, ModDependency>;
  shouldBeLoaded = true;

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
}
