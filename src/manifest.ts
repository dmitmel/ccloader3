import {
  FilePath,
  Locale,
  LocalizedString,
  Manifest,
  ManifestLegacy,
  ModDependencies,
  ModDependency,
  ModDependencyDetails,
  Person,
  PersonDetails,
} from './public/manifest';

enum Type {
  string = 'string',
  number = 'number',
  boolean = 'boolean',
  array = 'array',
  object = 'object',
  null = 'null',
  unknown = 'unknown',
}

type TypeAssertionResult =
  | { status: 'ok'; type: Type }
  | { status: 'optional' }
  | { status: 'failed' };

function getType(value: unknown): Type {
  // eslint-disable-next-line eqeqeq
  if (value === null) return Type.null;
  if (typeof value === 'string') return Type.string;
  if (typeof value === 'number') return Type.number;
  if (typeof value === 'boolean') return Type.boolean;
  if (Array.isArray(value)) return Type.array;
  if (typeof value === 'object') return Type.object;
  return Type.unknown;
}

// TODO: investigate prototype chain bugs when extending `Error` here
export class ManifestValidationError extends Error {
  constructor(public problems: string[]) {
    super(`\n${problems.map((p) => `- ${p}`).join('\n')}`);
    this.name = new.target.name;
  }
}

// these paths seem like a valid use-case for linked lists. don't know whether
// this is a real optimization in our case, but I suppose you can try to
// implement that
type JsonPath = Array<string | number>;

function jsonPathToString(path: JsonPath): string {
  if (path.length === 0) return '<document>';

  let str = '';

  for (let i = 0; i < path.length; i++) {
    let key = path[i];
    if (typeof key === 'number') {
      str += `[${key}]`;
    } else if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
      if (i > 0) str += '.';
      str += key;
    } else {
      str += `[${JSON.stringify(key)}]`;
    }
  }

  return str;
}

export class ManifestUtil {
  public _problems: string[] = [];

  validate(data: Manifest): void {
    this._problems = [];

    if (this._assertType([], data, [Type.object]).status === 'ok') {
      if (this._assertType(['id'], data.id, [Type.string]).status === 'ok') {
        if (!/^[a-zA-Z0-9_-]+$/.test(data.id)) {
          this._problems.push(
            'id must consist only of one or more alphanumberic characters, hyphens or underscores',
          );
        }
      }

      this._assertType(['version'], data.version, [Type.string]);

      this._assertLocalizedString(['title'], data.title, true);
      this._assertLocalizedString(['description'], data.description, true);
      this._assertType(['license'], data.license, [Type.string], true);
      this._assertLocalizedString(['homepage'], data.homepage, true);
      this._assertKeywords(['keywords'], data.keywords);

      this._assertPeople(['authors'], data.authors);

      this._assertDependencies(['dependencies'], data.dependencies);

      this._assertAssets(['assets'], data.assets);
      this._assertType(['assetsDir'], data.assetsDir, [Type.string], true);

      // eslint-disable-next-line no-undefined
      if (data.legacyLoadAsScript !== undefined) {
        this._problems.push(
          'legacy_main exists only for backwards compatibility reasons, must not be used and will be removed soon',
        );
      }

      this._assertType(['main'], data.main, [Type.string], true);
      this._assertType(['preload'], data.preload, [Type.string], true);
      this._assertType(['postload'], data.postload, [Type.string], true);
      this._assertType(['prestart'], data.prestart, [Type.string], true);
      this._assertType(['poststart'], data.poststart, [Type.string], true);
    }

    if (this._problems.length > 0) {
      throw new ManifestValidationError(this._problems);
    }
  }

  validateLegacy(data: ManifestLegacy): void {
    this._problems = [];

    if (this._assertType([], data, [Type.object]).status === 'ok') {
      this._assertType(['name'], data.name, [Type.string]);
      this._assertType(['version'], data.version, [Type.string]);

      this._assertType(
        ['ccmodHumanName'],
        data.ccmodHumanName,
        [Type.string],
        true,
      );
      this._assertType(['description'], data.description, [Type.string], true);
      this._assertType(['license'], data.license, [Type.string], true);
      this._assertType(['homepage'], data.homepage, [Type.string], true);

      // eslint-disable-next-line no-undefined
      if (data.ccmodDependencies !== undefined) {
        this._assertDependencies(['ccmodDependencies'], data.ccmodDependencies);
      } else {
        this._assertDependencies(['dependencies'], data.dependencies);
      }

      this._assertAssets(['assets'], data.assets);

      this._assertType(['module'], data.module, [Type.boolean], true);
      this._assertType(['plugin'], data.plugin, [Type.string], true);
      this._assertType(['preload'], data.preload, [Type.string], true);
      this._assertType(['postload'], data.postload, [Type.string], true);
      this._assertType(['prestart'], data.prestart, [Type.string], true);
      this._assertType(['main'], data.main, [Type.string], true);
    }

    if (this._problems.length > 0) {
      throw new ManifestValidationError(this._problems);
    }
  }

  convertFromLegacy(data: ManifestLegacy): Manifest {
    /* eslint-disable no-undefined */
    return {
      id: data.name,
      version: data.version,
      license: data.license,

      title: {
        en_US:
          data.ccmodHumanName !== undefined ? data.ccmodHumanName : data.name,
      },
      description:
        data.description !== undefined
          ? { en_US: data.description }
          : undefined,
      homepage:
        data.homepage !== undefined ? { en_US: data.homepage } : undefined,

      dependencies:
        data.ccmodDependencies !== undefined
          ? data.ccmodDependencies
          : data.dependencies,

      assets: data.assets,

      legacyLoadAsScript: !data.module,
      main: data.plugin,
      preload: data.preload,
      postload: data.postload,
      prestart: data.prestart,
      poststart: data.main,
    };
    /* eslint-enable no-undefined */
  }

  _assertType(
    valuePath: JsonPath,
    value: unknown,
    expectedTypes: Type[],
    optional = false,
  ): TypeAssertionResult {
    // eslint-disable-next-line no-undefined
    if (value === undefined) {
      if (optional) {
        return { status: 'optional' };
      } else {
        this._problems.push(`'${jsonPathToString(valuePath)}' is required`);
        return { status: 'failed' };
      }
    }

    let actualType = getType(value);
    if (!expectedTypes.includes(actualType)) {
      let valuePathStr = jsonPathToString(valuePath);
      let expectedTypesStr = expectedTypes.join(' or ');
      this._problems.push(
        `expected type of '${valuePathStr}' to be '${expectedTypesStr}', got '${actualType}'`,
      );
      return { status: 'failed' };
    }

    return { status: 'ok', type: actualType };
  }

  _assertLocalizedString(
    valuePath: JsonPath,
    value: LocalizedString | undefined,
    optional = false,
  ): void {
    let assertion = this._assertType(
      valuePath,
      value,
      [Type.object, Type.string],
      optional,
    );
    if (assertion.status !== 'ok') return;
    value = value as LocalizedString;

    if (assertion.type === Type.string) return;
    for (let [key, value2] of Object.entries(value as Record<Locale, string>)) {
      this._assertType([...valuePath, key], value2, [Type.string]);
    }
  }

  _assertKeywords(
    valuePath: JsonPath,
    value: LocalizedString[] | undefined,
  ): void {
    let assertion = this._assertType(valuePath, value, [Type.array], true);
    if (assertion.status !== 'ok') return;
    value = value!;

    for (let index = 0; index < value.length; index++) {
      let value2 = value[index];
      this._assertLocalizedString([...valuePath, index], value2);
    }
  }

  _assertPeople(valuePath: JsonPath, value: Person[] | undefined): void {
    let assertion = this._assertType(valuePath, value, [Type.array], true);
    if (assertion.status !== 'ok') return;
    value = value!;

    for (let index = 0; index < value.length; index++) {
      let value2 = value[index];
      this._assertPerson([...valuePath, index], value2);
    }
  }

  _assertPerson(valuePath: JsonPath, value: Person): void {
    let assertion = this._assertType(valuePath, value, [
      Type.object,
      Type.string,
    ]);
    if (assertion.status !== 'ok') return;

    if (assertion.type === Type.string) return;
    value = value as PersonDetails;

    this._assertLocalizedString([...valuePath, 'name'], value.name);
    this._assertLocalizedString([...valuePath, 'email'], value.email, true);
    this._assertLocalizedString([...valuePath, 'url'], value.url, true);
    this._assertLocalizedString([...valuePath, 'comment'], value.comment, true);
  }

  _assertDependencies(
    valuePath: JsonPath,
    value: ModDependencies | undefined,
  ): void {
    let assertion = this._assertType(valuePath, value, [Type.object], true);
    if (assertion.status !== 'ok') return;
    value = value!;

    for (let [key, value2] of Object.entries(value)) {
      this._assertDependency([...valuePath, key], value2);
    }
  }

  _assertDependency(valuePath: JsonPath, value: ModDependency): void {
    let assertion = this._assertType(valuePath, value, [
      Type.object,
      Type.string,
    ]);
    if (assertion.status !== 'ok') return;

    if (assertion.type === Type.string) return;
    value = value as ModDependencyDetails;

    this._assertType([...valuePath, 'version'], value.version, [Type.string]);
    this._assertType(
      [...valuePath, 'optional'],
      value.optional,
      [Type.boolean],
      true,
    );
  }

  _assertAssets(valuePath: JsonPath, value: FilePath[] | undefined): void {
    let assertion = this._assertType(valuePath, value, [Type.array], true);
    if (assertion.status !== 'ok') return;
    value = value!;

    for (let index = 0; index < value.length; index++) {
      let value2 = value[index];
      this._assertType([...valuePath, index], value2, [Type.string]);
    }
  }
}
