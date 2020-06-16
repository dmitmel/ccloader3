import * as patchsteps from '../../common/vendor-libs/patchsteps.js';
import { Mod } from '../../src/public/mod';

export default class DebugState extends patchsteps.DebugState {
  public constructor(private currentMod: Mod) {
    super();
  }

  public printFileInfo(file: patchsteps.FileInfo): void {
    // resolve the urls
    let [protocol, path] = file.path.split(':');
    const newFile = { ...file };
    switch (protocol) {
      case 'mod':
        newFile.path = this.currentMod.resolvePath(path);
        break;
      case 'game':
        newFile.path = ccmod3.paths.join('assets', path);
        break;
    }
    super.printFileInfo(newFile);
  }
}
