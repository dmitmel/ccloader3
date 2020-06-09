import { errorHasCode } from '../common/dist/utils.js';

const { promises: fs } = (typeof require === 'function' ? require('fs') : {}) as typeof import('fs');

export async function load(path: string): Promise<string> {
	return fs.readFile(path, 'utf8');
}

export async function findRecursively(dir: string): Promise<string[]> {
	if (dir.endsWith('/')) {
		dir = dir.slice(0, -1);
	}

	const fileList: string[] = [];
	await findRecursivelyInternal(dir, '', fileList);
	return fileList;
}

async function findRecursivelyInternal(currentDir: string, relativePrefix: string, fileList: string[]): Promise<void> {
	let contents: string[];
	try {
		contents = await fs.readdir(currentDir);
	} catch (err) {
		if (errorHasCode(err) && err.code === 'ENOENT') {
			return;
		}
		throw err;
	}

	await Promise.all(
		contents.map(async (name) => {
			const fullPath = `${currentDir}/${name}`;
			const stat = await fs.stat(fullPath);
			if (stat.isDirectory()) {
				await findRecursivelyInternal(fullPath, `${relativePrefix}${name}/`, fileList);
			} else {
				fileList.push(`${relativePrefix}${name}`);
			}
		}),
	);
}

export async function modDirectoriesIn(dir: string): Promise<string[]> {
	if (dir.endsWith('/')) {
		dir = dir.slice(-1);
	}

	let allContents: string[];

	try {
		allContents = await fs.readdir(dir);
	} catch (err) {
		if (errorHasCode(err) && err.code === 'ENOENT') {
			console.warn(`Directory '${dir}' not found, did you forget to create it?`);
			allContents = [];
		} else {
			throw err;
		}
	}

	const modDirectories: string[] = [];

	await Promise.all(
		allContents.map(async (name) => {
			const fullPath = `${dir}/${name}`;
			// the `withFileTypes` option of `readdir` can't be used here because it
			// doesn't dereference symbolic links similarly to `stat`
			const stat = await fs.stat(fullPath);
			if (stat.isDirectory()) {
				modDirectories.push(fullPath);
			}
		}),
	);

	return modDirectories;
}
