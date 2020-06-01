import { Manifest, ModDependencies } from './manifest.js';

export class Mod {
  dependencies: ModDependencies;

  constructor(
    public baseDirectory: string,
    public manifest: Manifest,
    public legacyMode: boolean,
  ) {
    this.dependencies = manifest.dependencies ?? {};
  }
}
