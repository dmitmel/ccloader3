export {};

declare global {
  namespace ccmod3 {
    let paths: typeof import('../../../common/dist/paths');
    let utils: typeof import('../../../common/dist/utils');
    let require: NodeRequire | undefined;
    let semver: typeof import('../../../common/vendor-libs/semver');
    let impactInitHooks: typeof import('../impact-init-hooks');
    let impactModuleHooks: typeof import('../impact-module-hooks');
    let resources: typeof import('../resources');
  }
}
