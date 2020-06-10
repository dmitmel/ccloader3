export {};

declare global {
  namespace ccmod3 {
    let paths: typeof import('../../../common/dist/paths');
    let utils: typeof import('../../../common/dist/utils');
    let require: NodeRequire | undefined;
    let semver: typeof import('../../../common/vendor-libs/semver');
    let resources: typeof import('../resources');
  }
}
