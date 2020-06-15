import * as patchsteps from '../../common/vendor-libs/patchsteps.js';

export default class DebugState extends patchsteps.DebugState {
  public constructor(private currentModBaseDir: string) {
    super();
  }

  public printFileInfo(file: patchsteps.FileInfo): void {
    // resolve the urls
    let [protocol, path] = file.path.split(':');
    const newFile = { ...file };
    switch (protocol) {
      case 'mod':
        newFile.path = `${this.currentModBaseDir}${path}`;
        break;
      case 'game':
        newFile.path = `assets/${path}`;
        break;
    }
    super.printFileInfo(newFile);
  }
}
