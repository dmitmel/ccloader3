import { ManifestInternal, ModDependencies } from './manifest.js';

export class Mod {
  dependencies: ModDependencies;

  constructor(
    public baseDirectory: string,
    public manifest: ManifestInternal,
    public legacyMode: boolean,
  ) {
    this.dependencies = manifest.dependencies ?? {};
  }
}
