export * from 'semver';

declare module 'semver' {
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
