import * as semver from '../common/vendor-libs/semver.js';
import * as man from './types/manifest';
import * as types from './types/mod';
import * as paths from '../common/dist/paths.js';
import * as utils from '../common/dist/utils.js';
import * as files from './files.js';

export class Mod implements types.Mod {
	public readonly version: semver.SemVer;
	public readonly dependencies: ReadonlyMap<man.ModId, types.ModDependency>;
	public readonly assetsDir: string;
	public assets: Set<string> = new Set();
	public shouldBeLoaded = true;
	public classInstance: types.ModClass | null = null;

	public constructor(public readonly baseDirectory: string, public readonly manifest: man.Manifest, public readonly legacyMode: boolean) {
		try {
			this.version = new semver.SemVer(manifest.version);
		} catch (err) {
			if (utils.errorHasMessage(err)) {
				// TODO: put a link to semver docs here
				err.message = `mod version '${manifest.version}' is not a valid semver version: ${err.message}`;
			}
			throw err;
		}

		const dependencies = new Map<man.ModId, types.ModDependency>();
		if (manifest.dependencies) {
			for (const depId of Object.keys(manifest.dependencies)) {
				const dep = this.sanitizeDep(manifest.dependencies[depId]);

				try {
					dependencies.set(depId, {
						version: new semver.Range(dep.version),
						optional: dep.optional ?? false,
					});
				} catch (err) {
					if (utils.errorHasMessage(err)) {
						err.message = `dependency version constraint '${dep.version}' for mod '${depId}' is not a valid semver range: ${err.message}`;
					}
					throw err;
				}
			}
		}
		this.dependencies = dependencies;

		this.assetsDir = this.resolvePath(`${this.manifest.assetsDir ?? 'assets'}/`);
	}

	public async findAllAssets(): Promise<void> {
		if (this.manifest.assets) {
			const assets = this.manifest.assets.map((path) => paths.stripRoot(paths.join('/', path)));
			this.assets = new Set(assets);
		} else if (utils.PLATFORM_TYPE === utils.PlatformType.Desktop) {
			this.assets = new Set(await files.findRecursively(this.assetsDir));
		}
	}

	public async initClass(): Promise<void> {
		const script = this.manifest.main;
		if (script == null) {
			return;
		}
		const scriptFullPath = this.resolvePath(script);

		let modModule: { default: new (mod: Mod) => types.ModClass };
		try {
			modModule = await import(`/${scriptFullPath}`);
		} catch (err) {
			if (utils.errorHasMessage(err)) {
				err.message = `Error when importing '${scriptFullPath}': ${err.message}`;
			}
			throw err;
		}

		if (!('default' in modModule)) {
			throw new Error(`Module '${scriptFullPath}' has no default export`);
		}

		try {
			const ModCtor = modModule.default;
			this.classInstance = new ModCtor(this);
		} catch (err) {
			if (utils.errorHasMessage(err)) {
				err.message = `Error when instantiating '${scriptFullPath}': ${err.message}`;
			}
			throw err;
		}
	}

	public async executeStage(stage: types.ModLoadingStage): Promise<void> {
		let classMethodName: keyof types.ModClass = stage;
		if (this.legacyMode && stage === 'poststart') {
			classMethodName = 'main';
		}
		if (this.classInstance != null && classMethodName in this.classInstance) {
			try {
				await this.classInstance[classMethodName]!(this);
			} catch (err) {
				if (utils.errorHasMessage(err)) {
					err.message = `Error when executing plugin ${stage} of '${this.manifest.id}': ${err.message}`;
				}
				throw err;
			}
		}

		const script = this.manifest[stage];
		if (script == null) {
			return;
		}
		const scriptFullPath = this.resolvePath(script);

		try {
			await import(`/${scriptFullPath}`);
		} catch (err) {
			if (utils.errorHasMessage(err)) {
				err.message = `Error when executing module ${stage} of '${this.manifest.id}': ${err.message}`;
			}
			throw err;
		}
	}

	public resolvePath(path: string): string {
		return paths.join(this.baseDirectory, paths.join('/', path));
	}

	private sanitizeDep(dep: man.ModDependency): man.ModDependencyDetails {
		if (typeof dep === 'string') {
			return { version: dep };
		}
		return dep;
	}
}
