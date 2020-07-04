import * as semver from '../../node_modules/@types/semver/index';
export = semver;

declare module '../../node_modules/@types/semver/index' {
  interface SemVer {
    toString(this: this): string;
  }

  interface Comparator {
    toString(this: this): string;
  }

  interface Range {
    toString(this: this): string;
  }
}
