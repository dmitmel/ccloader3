import { errorHasMessage } from '../common/dist/utils.js';
import * as paths from '../common/dist/paths.js';

export async function load(url: string): Promise<string> {
	try {
		const res = await fetch(`/${url}`);
		if (!res.ok) {
			throw new Error(`${res.status} ${res.statusText}`);
		}
		return await res.text();
	} catch (err) {
		if (errorHasMessage(err)) {
			err.message = `Failed to load file '${url}': ${err.message}`;
		}
		throw err;
	}
}

export function findRecursively(_dir: string): Promise<string[]> {
	throw new Error('unsupported');
}

export async function modDirectoriesIn(dir: string): Promise<string[]> {
	if (dir.endsWith('/')) {
		dir = dir.slice(0, -1);
	}

	const indexPath = `${dir}/index.json`;
	const indexJsonText = await load(indexPath);
	let index: string[];

	try {
		index = JSON.parse(indexJsonText);
	} catch (err) {
		if (errorHasMessage(err)) {
			err.message = `Syntax error in mods directory index in '${indexPath}': ${err.message}`;
		}
		throw err;
	}

	return index.map((modDirPath) => paths.join(dir, modDirPath));
}
