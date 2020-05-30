export interface Manifest {
  id: ModId;
  version: SemVer;

  title?: LocalizedString;
  description?: LocalizedString;
  license?: SpdxExpression;
  homepage?: LocalizedString;
  keywords?: LocalizedString[];
  authors?: Person[];

  dependencies?: Record<ModId, SemVerConstraint>;

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

  ccmodDependencies?: Record<ModId, SemVerConstraint>;
  dependencies?: Record<ModId, SemVerConstraint>;

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
