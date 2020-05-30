export interface Manifest {
  id: ModId;
  version: SemVer;

  title?: LocalizedString;
  description?: LocalizedString;
  license?: SpdxExpression;
  homepage?: LocalizedString;
  keywords?: LocalizedString[];
  authors?: Person[];

  dependencies?: ModDependencies;

  assets?: FilePath[];
  assetsDir?: FilePath;

  main?: FilePath;
  preload?: FilePath;
  postload?: FilePath;
  prestart?: FilePath;
  poststart?: FilePath;
}

export interface ManifestInternal extends Manifest {
  legacyLoadAsScript?: boolean;
}

export interface ManifestLegacy {
  name: ModId;
  version: SemVer;

  ccmodHumanName?: string;
  description?: string;
  license?: SpdxExpression;
  homepage?: string;

  ccmodDependencies?: ModDependencies;
  dependencies?: ModDependencies;

  assets?: FilePath[];

  module?: boolean;
  plugin?: FilePath;
  preload?: FilePath;
  postload?: FilePath;
  prestart?: FilePath;
  main?: FilePath;
}

export type ModId = string;

export type SemVer = string;
export type SemVerConstraint = string;

export type ModDependencies = Record<ModId, SemVerConstraint>;

export type SpdxExpression = string;

export type LocalizedString = Record<Locale, string> | string;
export type Locale = string;

export type FilePath = string;

export type Person = PersonDetails | string;
export interface PersonDetails {
  name: LocalizedString;
  email?: LocalizedString;
  url?: LocalizedString;
  comment?: LocalizedString;
}

export type Dependency = SemVerConstraint | DependencyDetails;
export interface DependencyDetails {
  version: SemVerConstraint;
  optional?: boolean;
}

enum Type {
  string = 'string',
  array = 'array',
  object = 'object',
  boolean = 'boolean',
  null = 'null',
  unknown = 'unknown',
}

function getType(value: unknown): Type {
  // eslint-disable-next-line eqeqeq
  if (value === null) return Type.null;
  if (typeof value === 'string') return Type.string;
  if (typeof value === 'boolean') return Type.boolean;
  if (Array.isArray(value)) return Type.array;
  if (typeof value === 'object') return Type.object;
  return Type.unknown;
}

export class ManifestValidationError extends Error {
  constructor(public problems: string[]) {
    super(`\n${problems.map(p => `- ${p}`).join('\n')}`);
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

/* eslint-disable no-undefined */

export class ManifestUtil {
  public _problems: string[] = [];

  validate(data: Manifest, legacyRelaxedChecks: boolean): void {
    this._problems = [];

    this._assertType([], data, [Type.object]);

    this._assertType(['id'], data.id, [Type.string]);
    if (
      !legacyRelaxedChecks &&
      data.id !== undefined &&
      !/^[a-zA-Z0-9_\-]+$/.test(data.id)
    ) {
      this._problems.push(
        'id must consist only of one or more alphanumberic characters, hyphens or underscores',
      );
    }

    this._assertType(['version'], data.version, [Type.string]);
    this._assertType(['license'], data.license, [Type.string], true);

    this._assertLocalizedString(['title'], data.title, true);
    this._assertLocalizedString(['description'], data.description, true);
    this._assertLocalizedString(['homepage'], data.homepage, true);
    if (data.keywords !== undefined) {
      if (this._assertType(['keywords'], data.keywords, [Type.array])) {
        data.keywords.reduce<boolean>(
          (valid, value, index) =>
            this._assertLocalizedString(['keywords', index], value) && valid,
          true,
        );
      }
    }

    this._assertPeople(['authors'], data.authors);

    this._assertDependencies(['dependencies'], data.dependencies);

    this._assertAssets(['assets'], data.assets);
    this._assertType(['assetsDir'], data.assetsDir, [Type.string], true);

    this._assertType(['main'], data.main, [Type.string], true);
    this._assertType(['preload'], data.preload, [Type.string], true);
    this._assertType(['postload'], data.postload, [Type.string], true);
    this._assertType(['prestart'], data.prestart, [Type.string], true);
    this._assertType(['poststart'], data.poststart, [Type.string], true);

    if (this._problems.length > 0) {
      throw new ManifestValidationError(this._problems);
    }
  }

  convertToInternal(data: Manifest): ManifestInternal {
    return data;
  }

  validateLegacy(data: ManifestLegacy): void {
    this._problems = [];

    this._assertType([], data, [Type.object]);

    this._assertType(['name'], data.name, [Type.string]);
    this._assertType(['version'], data.version, [Type.string]);
    this._assertType(['license'], data.license, [Type.string], true);

    this._assertType(
      ['ccmodHumanName'],
      data.ccmodHumanName,
      [Type.string],
      true,
    );
    this._assertType(['description'], data.description, [Type.string], true);
    this._assertType(['homepage'], data.homepage, [Type.string], true);

    this._assertDependencies(['ccmodDependencies'], data.ccmodDependencies);
    this._assertDependencies(['dependencies'], data.dependencies);

    this._assertAssets(['assets'], data.assets);

    this._assertType(['module'], data.module, [Type.boolean], true);

    this._assertType(['main'], data.main, [Type.string], true);
    this._assertType(['plugin'], data.plugin, [Type.string], true);
    this._assertType(['preload'], data.preload, [Type.string], true);
    this._assertType(['postload'], data.postload, [Type.string], true);
    this._assertType(['prestart'], data.prestart, [Type.string], true);

    if (this._problems.length > 0) {
      throw new ManifestValidationError(this._problems);
    }
  }

  convertFromLegacy(data: ManifestLegacy): ManifestInternal {
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
  }

  _assertType(
    valuePath: JsonPath,
    value: unknown,
    expectedTypes: Type[],
    optional = false,
  ): boolean {
    if (optional && value === undefined) return true;
    if (!expectedTypes.includes(getType(value))) {
      let valuePathStr = jsonPathToString(valuePath);
      let expectedTypesStr = expectedTypes.join(' or ');
      this._problems.push(
        `expected type of '${valuePathStr}' to be '${expectedTypesStr}'`,
      );
      return false;
    }
    return true;
  }

  _assertLocalizedString(
    valuePath: JsonPath,
    value: LocalizedString | undefined,
    optional = false,
  ): boolean {
    if (optional && value === undefined) return true;
    if (!this._assertType(valuePath, value, [Type.object, Type.string])) {
      return false;
    }

    // couldn't figure out how to avoid an extra getType here... maybe return
    // the type from this._assertType on success or something like that
    if (getType(value) === Type.string) return true;

    return Object.entries(value!).reduce<boolean>(
      (valid, [key, value2]) =>
        this._assertType([...valuePath, key], value2, [Type.string]) && valid,
      true,
    );
  }

  _assertPeople(valuePath: JsonPath, value: Person[] | undefined): boolean {
    if (value === undefined) return true;
    if (!this._assertType(valuePath, value, [Type.array])) {
      return false;
    }

    return value.reduce<boolean>(
      (valid, value2, index) =>
        this._assertPerson([...valuePath, index], value2) && valid,
      true,
    );
  }

  _assertPerson(valuePath: JsonPath, value: Person): boolean {
    if (!this._assertType(valuePath, value, [Type.object, Type.string])) {
      return false;
    }

    // same story as with getType in this.assertLocalizedString
    if (getType(value) === Type.string) return true;

    return (['name', 'email', 'url', 'comment'] as Array<keyof Person>).reduce<
      boolean
    >((valid, key) => {
      let valueName2 = [...valuePath, key];
      let optional = key !== 'name';
      return (
        this._assertLocalizedString(valueName2, value[key], optional) && valid
      );
    }, true);
  }

  _assertDependencies(
    valuePath: JsonPath,
    value: ModDependencies | undefined,
  ): boolean {
    if (value === undefined) return true;
    if (!this._assertType(valuePath, value, [Type.object])) {
      return false;
    }

    return Object.entries(value).reduce<boolean>(
      (valid, [key, value2]) =>
        this._assertType([...valuePath, key], value2, [Type.string]) && valid,
      true,
    );
  }

  _assertAssets(valuePath: JsonPath, value: FilePath[] | undefined): boolean {
    if (value === undefined) return true;
    if (!this._assertType(valuePath, value, [Type.array])) {
      return false;
    }

    return value.reduce<boolean>(
      (valid, value2, index) =>
        this._assertType([...valuePath, index], value2, [Type.string]) && valid,
      true,
    );
  }
}
