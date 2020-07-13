export {};

declare global {
  namespace modloader {
    var _runtimeMod: Mod;

    namespace _modDataStorage {
      type FileData = FileData.v1;
      namespace FileData {
        interface v1 {
          version: 1;
          data: v1.Data;
        }

        namespace v1 {
          type Data = Record<ModID, ModEntry>;

          interface ModEntry {
            enabled: boolean;
          }
        }
      }

      function isModEnabled(id: ModID): boolean;
      function setModEnabled(id: ModID, enabled: boolean): void;
      function write(): Promise<void>;
    }
  }
}
