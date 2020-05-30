import { Manifest, ManifestLegacy } from './manifest.js';

export class Mod {
  constructor(
    public baseDirectory: string,
    public manifest: Manifest | ManifestLegacy,
    public legacyMode: boolean,
  ) {}
}
