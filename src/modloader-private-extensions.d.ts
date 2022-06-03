export {};

declare global {
  namespace modloader {
    var _runtimeMod: Mod;
  }

  var CrossAndroid: { executePostGameLoad?(): void } | undefined;
  var CrossAndroidModListProvider: { getModListAsJson?(): string } | undefined;
  var CrossAndroidExtensionListProvider: { getExtensionListAsJson?(): string } | undefined;
}
