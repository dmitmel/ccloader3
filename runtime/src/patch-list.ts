import { mapGetOrInsert } from '../../common/dist/utils.js';

export default class PatchList<P> {
  public patternPatchers: Array<[RegExp, P]> = [];
  public specificPatchers = new Map<string, P[]>();

  public forPath(path: string): P[] {
    let patchers = [];

    for (let i = 0, len = this.patternPatchers.length; i < len; i++) {
      let [pattern, patcher] = this.patternPatchers[i];
      if (pattern.test(path)) patchers.push(patcher);
    }

    let specificForThisPath = this.specificPatchers.get(path);
    if (specificForThisPath != null) patchers.push(...specificForThisPath);

    return patchers;
  }

  public add(path: string | RegExp, patcher: P): void {
    if (typeof path === 'string') {
      let list = mapGetOrInsert(this.specificPatchers, path, []);
      list.push(patcher);
    } else {
      this.patternPatchers.push([path, patcher]);
    }
  }
}
