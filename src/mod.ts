import { ManifestInternal } from './manifest.js';

export class Mod {
  constructor(
    public baseDirectory: string,
    public manifest: ManifestInternal,
    public legacyMode: boolean,
  ) {}
}
