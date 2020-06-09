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

  plugin?: FilePath;
  preload?: FilePath;
  postload?: FilePath;
  prestart?: FilePath;
  main?: FilePath;
}

export type ModId = string;

export type SemVer = string;
export type SemVerConstraint = string;

export type ModDependencies = Record<ModId, ModDependency>;

export type ModDependency = SemVerConstraint | ModDependencyDetails;
export interface ModDependencyDetails {
  version: SemVerConstraint;
  optional?: boolean;
}

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
