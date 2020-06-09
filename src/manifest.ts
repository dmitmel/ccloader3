import * as types from './types/manifest';

export * from './types/manifest';

enum Type {
	string = 'string',
	number = 'number',
	boolean = 'boolean',
	array = 'array',
	object = 'object',
	null = 'null',
	unknown = 'unknown',
}

function getType(value: unknown): Type {
	// eslint-disable-next-line eqeqeq
	if (value === null) {
		return Type.null;
	}
	if (typeof value === 'string') {
		return Type.string;
	}
	if (typeof value === 'number') {
		return Type.number;
	}
	if (typeof value === 'boolean') {
		return Type.boolean;
	}
	if (Array.isArray(value)) {
		return Type.array;
	}
	if (typeof value === 'object') {
		return Type.object;
	}
	return Type.unknown;
}

// TODO: investigate prototype chain bugs when extending `Error` here
export class ValidationError extends Error {
	public constructor(public problems: string[]) {
		super(`\n${problems.map((p) => `- ${p}`).join('\n')}`);
		this.name = new.target.name;
	}
}

// these paths seem like a valid use-case for linked lists. don't know whether
// this is a real optimization in our case, but I suppose you can try to
// implement that
type JsonPath = Array<string | number>;

function jsonPathToString(path: JsonPath): string {
	if (path.length === 0) {
		return '<document>';
	}

	let str = '';

	for (let i = 0; i < path.length; i++) {
		const key = path[i];
		if (typeof key === 'number') {
			str += `[${key}]`;
		} else if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
			if (i > 0) {
				str += '.';
			}
			str += key;
		} else {
			str += `[${JSON.stringify(key)}]`;
		}
	}

	return str;
}

export class Validator {
	private problems: string[] = [];

	public validate(data: types.Manifest): void {
		this.problems = [];

		if (this.assertType([], data, [Type.object])) {
			if (this.assertType(['id'], data.id, [Type.string])) {
				if (!/^[a-zA-Z0-9_-]+$/.test(data.id)) {
					this.problems.push('id must consist only of one or more alphanumberic characters, hyphens or underscores');
				}
			}

			this.assertType(['version'], data.version, [Type.string]);

			this.assertLocalizedString(['title'], data.title, true);
			this.assertLocalizedString(['description'], data.description, true);
			this.assertType(['license'], data.license, [Type.string], true);
			this.assertLocalizedString(['homepage'], data.homepage, true);
			this.assertKeywords(['keywords'], data.keywords);

			this.assertPeople(['authors'], data.authors);

			this.assertDependencies(['dependencies'], data.dependencies);

			this.assertAssets(['assets'], data.assets);
			this.assertType(['assetsDir'], data.assetsDir, [Type.string], true);

			this.assertType(['main'], data.main, [Type.string], true);
			this.assertType(['preload'], data.preload, [Type.string], true);
			this.assertType(['postload'], data.postload, [Type.string], true);
			this.assertType(['prestart'], data.prestart, [Type.string], true);
			this.assertType(['poststart'], data.poststart, [Type.string], true);
		}

		if (this.problems.length > 0) {
			throw new ValidationError(this.problems);
		}
	}

	public validateLegacy(data: types.ManifestLegacy): void {
		this.problems = [];

		if (this.assertType([], data, [Type.object])) {
			this.assertType(['name'], data.name, [Type.string]);
			this.assertType(['version'], data.version, [Type.string]);

			this.assertType(['ccmodHumanName'], data.ccmodHumanName, [Type.string], true);
			this.assertType(['description'], data.description, [Type.string], true);
			this.assertType(['license'], data.license, [Type.string], true);
			this.assertType(['homepage'], data.homepage, [Type.string], true);

			if (data.ccmodDependencies) {
				this.assertDependencies(['ccmodDependencies'], data.ccmodDependencies);
			} else {
				this.assertDependencies(['dependencies'], data.dependencies);
			}

			this.assertAssets(['assets'], data.assets);

			this.assertType(['plugin'], data.plugin, [Type.string], true);
			this.assertType(['preload'], data.preload, [Type.string], true);
			this.assertType(['postload'], data.postload, [Type.string], true);
			this.assertType(['prestart'], data.prestart, [Type.string], true);
			this.assertType(['main'], data.main, [Type.string], true);
		}

		if (this.problems.length > 0) {
			throw new ValidationError(this.problems);
		}
	}

	/**
	 * Always optional
	 * @param valuePath
	 * @param value
	 */
	private assertArray(valuePath: JsonPath, value: unknown): value is unknown[] {
		if (!value) {
			return false;
		}

		const actualType = getType(value);
		if (actualType !== Type.array) {
			const valuePathStr = jsonPathToString(valuePath);
			const expectedTypesStr = Type.array.toString();
			this.problems.push(`expected type of '${valuePathStr}' to be '${expectedTypesStr}', got '${actualType}'`);
			return false;
		}

		return true;
	}

	/**
	 * Always optional
	 * @param valuePath
	 * @param value
	 */
	private assertObject(valuePath: JsonPath, value: unknown): value is { [key: string]: unknown } {
		if (!value) {
			return false;
		}

		const actualType = getType(value);
		if (actualType !== Type.object) {
			const valuePathStr = jsonPathToString(valuePath);
			const expectedTypesStr = Type.object.toString();
			this.problems.push(`expected type of '${valuePathStr}' to be '${expectedTypesStr}', got '${actualType}'`);
			return false;
		}

		return true;
	}

	private assertType(valuePath: JsonPath, value: unknown, expectedTypes: Type[], optional = false): boolean {
		if (!value) {
			if (!optional) {
				this.problems.push(`'${jsonPathToString(valuePath)}' is required`);
			}
			return false;
		}

		const actualType = getType(value);
		if (!expectedTypes.includes(actualType)) {
			const valuePathStr = jsonPathToString(valuePath);
			const expectedTypesStr = expectedTypes.join(' or ');
			this.problems.push(`expected type of '${valuePathStr}' to be '${expectedTypesStr}', got '${actualType}'`);
			return true;
		}

		return true;
	}

	private assertLocalizedString(valuePath: JsonPath, value: unknown, optional = false): void {
		if (!this.assertType(valuePath, value, [Type.object, Type.string], optional)) {
			return;
		}

		if (!this.assertObject(valuePath, value)) {
			return;
		}

		for (const [key, entry] of Object.entries(value)) {
			this.assertType([...valuePath, key], entry, [Type.string]);
		}
	}

	private assertKeywords(valuePath: JsonPath, value: unknown): void {
		if (!this.assertArray(valuePath, value)) {
			return;
		}

		for (let i = 0; i < value.length; i++) {
			const entry = value[i];
			this.assertLocalizedString([...valuePath, i], entry);
		}
	}

	private assertPeople(valuePath: JsonPath, value: unknown): void {
		if (!this.assertArray(valuePath, value)) {
			return;
		}

		for (let i = 0; i < value.length; i++) {
			const entry = value[i];
			this.assertPerson([...valuePath, i], entry);
		}
	}

	private assertPerson(valuePath: JsonPath, value: unknown): void {
		if (!this.assertType(valuePath, value, [Type.object, Type.string])) {
			return;
		}

		if (!this.assertObject(valuePath, value)) {
			return;
		}

		this.assertLocalizedString([...valuePath, 'name'], value.name);
		this.assertLocalizedString([...valuePath, 'email'], value.email, true);
		this.assertLocalizedString([...valuePath, 'url'], value.url, true);
		this.assertLocalizedString([...valuePath, 'comment'], value.comment, true);
	}

	private assertDependencies(valuePath: JsonPath, value: unknown): void {
		if (!this.assertObject(valuePath, value)) {
			return;
		}

		for (const [key, entry] of Object.entries(value)) {
			this.assertDependency([...valuePath, key], entry);
		}
	}

	private assertDependency(valuePath: JsonPath, value: unknown): void {
		if (!this.assertType(valuePath, value, [Type.object, Type.string])) {
			return;
		}

		if (!this.assertObject(valuePath, value)) {
			return;
		}

		this.assertType([...valuePath, 'version'], value.version, [Type.string]);
		this.assertType([...valuePath, 'optional'], value.optional, [Type.boolean], true);
	}

	private assertAssets(valuePath: JsonPath, value: types.FilePath[] | undefined): void {
		if (!this.assertArray(valuePath, value)) {
			return;
		}

		for (let i = 0; i < value.length; i++) {
			const entry = value[i];
			this.assertType([...valuePath, i], entry, [Type.string]);
		}
	}
}

export function convertFromLegacy(data: types.ManifestLegacy): types.Manifest {
	const result: types.Manifest = {
		id: data.name,
		version: data.version,
		license: data.license,

		title: {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			en_US: data.ccmodHumanName ? data.ccmodHumanName : data.name,
		},

		dependencies: data.ccmodDependencies ? data.ccmodDependencies : data.dependencies,

		assets: data.assets,

		main: data.plugin,
		preload: data.preload,
		postload: data.postload,
		prestart: data.prestart,
		poststart: data.main,
	};

	if (data.description) {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		result.description = { en_US: data.description };
	}
	if (data.homepage) {
		// eslint-disable-next-line @typescript-eslint/naming-convention
		result.homepage = { en_US: data.homepage };
	}

	return result;
}
