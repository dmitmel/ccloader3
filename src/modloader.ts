import * as files from './files.js';
import * as manifest from './manifest.js';
import * as mod from './mod.js';
import * as dom from './dom.js';
import * as semver from '../common/vendor-libs/semver.js';
import * as utils from '../common/dist/utils.js';
import * as error from '../common/dist/error.js';
import * as paths from '../common/dist/paths.js';

const CCLOADER_DIR: string = paths.stripRoot(paths.dirname(paths.dirname(new URL(import.meta.url).pathname)));

type ModsMap = Map<manifest.ModId, mod.Mod>;
type ReadonlyModsMap = ReadonlyMap<manifest.ModId, mod.Mod>;
type ReadonlyVirtualPackagesMap = ReadonlyMap<manifest.ModId, semver.SemVer>;

export async function start(): Promise<void> {
	const meta = await loadModloaderMetadata();

	console.log(`${meta.name} ${meta.version}`);

	const gameVersion = await loadGameVersion();
	console.log(`crosscode ${gameVersion}`);

	const runtime = await loadRuntime();
	if (!runtime) {
		return;
	}

	let installed = new Map<manifest.ModId, mod.Mod>();
	await loadAllModMetadata('assets/mods', installed);
	installed = sortModsInLoadOrder(runtime, installed);

	const virtual = createVirtualDependencies(gameVersion, meta.version);
	verifyModDependencies(installed, virtual);
	if (!runtime.shouldBeLoaded) {
		throw new Error('Could not load the runtime mod, game initialization is impossible!');
	}

	const loaded = await loadMods(installed);
	console.log(loaded);

	provideModloader(meta, gameVersion, installed, loaded);

	await dom.loadGameBase();

	await initModClasses(loaded);

	await executeStage(loaded, 'preload');
	const domReadyCallback = await dom.loadMainScript();
	await executeStage(loaded, 'postload');
	domReadyCallback();

	const startGame = await dom.getStartFunction();
	await executeStage(loaded, 'prestart');
	startGame();
	await dom.igGameInit();
	await executeStage(loaded, 'poststart');
}

async function loadRuntime(): Promise<mod.Mod | null> {
	const runtimeBase = `${CCLOADER_DIR}/runtime`;
	const result = await tryLoadModMetadata(runtimeBase);
	if (!result) {
		console.error('Failed to load the runtime, please check if you installed CCLoader correctly!');
		return null;
	}

	return result;
}

async function loadModloaderMetadata(): Promise<{
	name: string;
	version: semver.SemVer;
}> {
	const toolJsonText = await files.load(`${CCLOADER_DIR}/tool.json`);
	const data = JSON.parse(toolJsonText) as { name: string; version: string };
	return { name: data.name, version: new semver.SemVer(data.version) };
}

function provideModloader(
	meta: { name: string; version: semver.SemVer },
	gameVersion: semver.SemVer,
	installedMods: ReadonlyModsMap,
	loadedMods: ReadonlyModsMap,
): void {
	window.modloader = {
		name: meta.name,
		version: meta.version,
		gameVersion,
		installedMods,
		loadedMods,
	};
}

async function loadGameVersion(): Promise<semver.SemVer> {
	const changelogText = await files.load('assets/data/changelog.json');
	const { changelog } = JSON.parse(changelogText) as {
		changelog: Array<{ version: string }>;
	};
	const latestVersion = changelog[0].version;
	return new semver.SemVer(latestVersion);
}

async function loadAllModMetadata(
	modsDir: string,
	// this map is passed as an argument for support of multiple mod directories
	// in the future
	installedMods: ModsMap,
): Promise<void> {
	const dirs = await files.modDirectoriesIn(modsDir);
	const promises = dirs.map(async (fullPath) => {
		const m = await tryLoadModMetadata(fullPath);
		if (m == null) {
			return;
		}

		const { id } = m.manifest;
		const modWithSameId = installedMods.get(id);
		if (modWithSameId != null) {
			throw new Error(`a mod with ID '${id}' has already been loaded from '${modWithSameId.baseDirectory}'`);
		} else {
			installedMods.set(id, m);
		}
	});
	await Promise.all(promises);
}

const manifestValidator = new manifest.Validator();

async function tryLoadModMetadata(baseDirectory: string): Promise<mod.Mod | null> {
	try {
		return await loadModMetadata(baseDirectory);
	} catch (err) {
		console.error(`An error occured while loading the metadata of a mod in '${baseDirectory}':`, err);
		return null;
	}
}

async function loadModMetadata(baseDirectory: string): Promise<mod.Mod | null> {
	let manifestFile = `${baseDirectory}/ccmod.json`;
	let manifestText: string;
	let legacyMode = false;

	try {
		manifestText = await files.load(manifestFile);
	} catch {
		try {
			legacyMode = true;
			manifestFile = `${baseDirectory}/package.json`;
			manifestText = await files.load(manifestFile);
		} catch {
			return null;
		}
	}

	let manifestData: manifest.Manifest | manifest.ManifestLegacy;
	try {
		manifestData = JSON.parse(manifestText);
	} catch (err) {
		if (error.hasMessage(err)) {
			err.message = `Syntax error in mod manifest in '${manifestFile}': ${err.message}`;
		}
		throw err;
	}

	try {
		if (legacyMode) {
			manifestData = manifestData as manifest.ManifestLegacy;
			manifestValidator.validateLegacy(manifestData);
			manifestData = manifest.convertFromLegacy(manifestData);
		} else {
			manifestData = manifestData as manifest.Manifest;
			manifestValidator.validate(manifestData);
		}
	} catch (err) {
		if (error.hasMessage(err)) {
			err.message = `Invalid mod manifest in '${manifestFile}': ${err.message}`;
			// TODO: put a link to the documentation here
		}
		throw err;
	}

	return new mod.Mod(`${baseDirectory}/`, manifestData, legacyMode);
}

function sortModsInLoadOrder(runtimeMod: mod.Mod, installedMods: ReadonlyModsMap): ModsMap {
	// note that maps preserve insertion order as defined in the ECMAScript spec
	const sortedMods = new Map<manifest.ModId, mod.Mod>();

	sortedMods.set(runtimeMod.manifest.id, runtimeMod);

	const unsortedModsList: mod.Mod[] = Array.from(installedMods.values()).sort((mod1, mod2) =>
		utils.compare(mod1.manifest.id, mod2.manifest.id),
	);

	while (unsortedModsList.length > 0) {
		// dependency cycles can be detected by checking if we removed any
		// dependencies in this iteration, although see the comment below
		let dependencyCyclesExist = true;

		for (let i = 0; i < unsortedModsList.length; ) {
			const m = unsortedModsList[i];
			if (!modHasUnsortedInstalledDependencies(m, sortedMods, installedMods)) {
				unsortedModsList.splice(i, 1);
				sortedMods.set(m.manifest.id, m);
				dependencyCyclesExist = false;
			} else {
				i++;
			}
		}

		if (dependencyCyclesExist) {
			// Detection of **exactly** which mods caused this isn't implemented yet
			// because 2767mr said it isn't worth the effort (to which I agreed) for
			// now, but if you know how to do that - please implement. For anyone
			// interested google "circular dependency detection" or "detect graph edge
			// cycles" and you'll most likely find something useful for our case.
			throw new Error('Detected a dependency cycle');
		}
	}

	return sortedMods;
}

function modHasUnsortedInstalledDependencies(m: mod.Mod, sortedMods: ReadonlyModsMap, installedMods: ReadonlyModsMap): boolean {
	for (const depId of m.dependencies.keys()) {
		if (!sortedMods.has(depId) && installedMods.has(depId)) {
			return true;
		}
	}
	return false;
}

function createVirtualDependencies(gameVersion: semver.SemVer, modloaderVersion: semver.SemVer): ReadonlyVirtualPackagesMap {
	const virtualPackages = new Map<manifest.ModId, semver.SemVer>();
	virtualPackages.set('crosscode', gameVersion);
	virtualPackages.set('ccloader', modloaderVersion);
	return virtualPackages;
}

function verifyModDependencies(installedMods: ReadonlyModsMap, virtualPackages: ReadonlyVirtualPackagesMap): void {
	for (const m of installedMods.values()) {
		for (const [depId, dep] of m.dependencies) {
			const problem = checkDependencyConstraint(depId, dep, installedMods, virtualPackages);
			if (problem != null) {
				m.shouldBeLoaded = false;
				console.error(`Could not load mod '${m.manifest.id}': ${problem}`);
				// not breaking out of the loop here, let's list potential problems with
				// other dependencies as well
			}
		}
	}
}

async function loadMods(installedMods: ReadonlyModsMap): Promise<ReadonlyModsMap> {
	const loadedMods = new Map<manifest.ModId, mod.Mod>();
	const findAssetsPromises: Array<Promise<void>> = [];
	for (const [modId, m] of installedMods.entries()) {
		if (m.shouldBeLoaded) {
			loadedMods.set(modId, m);

			findAssetsPromises.push(
				m.findAllAssets().catch((err) => {
					console.error(`An error occured while searching assets of mod '${m.manifest.id}':`, err);
				}),
			);
		}
	}
	await Promise.all(findAssetsPromises);
	return loadedMods;
}

function checkDependencyConstraint(
	depId: manifest.ModId,
	depConstraint: mod.ModDependency,
	installedMods: ReadonlyModsMap,
	virtualPackages: ReadonlyVirtualPackagesMap,
): string | null {
	let availableDepVersion: semver.SemVer;
	let depTitle = depId;

	const virtualPackageVersion = virtualPackages.get(depId);
	if (virtualPackageVersion != null) {
		availableDepVersion = virtualPackageVersion;
	} else {
		depTitle = `mod '${depId}'`;

		const depMod = installedMods.get(depId);
		if (depMod == null) {
			return depConstraint.optional ? null : `${depTitle} is not installed`;
		}

		if (!depMod.shouldBeLoaded) {
			return depConstraint.optional ? null : `${depTitle} is not loaded`;
		}

		availableDepVersion = depMod.version;
	}

	if (!depConstraint.version.test(availableDepVersion)) {
		return `version of ${depTitle} (${availableDepVersion}) is not in range '${depConstraint.version}'`;
	}

	return null;
}

async function initModClasses(mods: ReadonlyModsMap): Promise<void> {
	for (const m of mods.values()) {
		// eslint-disable-next-line no-await-in-loop
		await m.initClass();
	}
}

async function executeStage(mods: ReadonlyModsMap, stage: mod.ModLoadingStage): Promise<void> {
	for (const m of mods.values()) {
		// eslint-disable-next-line no-await-in-loop
		await m.executeStage(stage);
	}
}
