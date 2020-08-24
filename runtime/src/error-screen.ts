// inspired by https://github.com/20kdc/decrossfuscator/blob/b5c4250aade5bf8d41b12ec7c346d49ba107b2a9/mods/raptureui/decontaminant.js

export {};

let originalErrorCallback = window.GAME_ERROR_CALLBACK;
if (originalErrorCallback != null) {
  const MODLOADER_NAME = modloader.name;
  const MODLOADER_VERSION = modloader.version.toString();
  const RUNTIME_MOD_ID = modloader._runtimeMod.id;
  const RUNTIME_MOD_VERSION = modloader._runtimeMod.version!.toString();

  window.GAME_ERROR_CALLBACK = function (error, info, gameInfo, ...args) {
    info[`${MODLOADER_NAME} version`] = MODLOADER_VERSION;
    info[`${RUNTIME_MOD_ID} version`] = RUNTIME_MOD_VERSION;
    return originalErrorCallback.call(this, error, info, gameInfo, ...args);
  };
}
