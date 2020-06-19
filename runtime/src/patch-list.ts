import { mapGetOrInsert } from '../../common/dist/utils.js';

export default class PatchList<P> {
  public map = new Map<string, P[]>();

  public forPath(path: string): P[] {
    return this.map.get(path) ?? [];
  }

  public add(path: string, patcher: P): void {
    let list = mapGetOrInsert(this.map, path, []);
    list.push(patcher);
  }
}
