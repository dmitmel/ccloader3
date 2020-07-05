import { mapGetOrInsert } from '../../common/dist/utils.js';

export class PatchList<P> implements ccmod.patchList.PatchList<P> {
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

type ResourcePatcherSimple<Data, Deps, Ctx> =
  // <empty comment to force formatting>
  ccmod.patchList.ResourcePatcherSimple<Data, Deps, Ctx>;
type ResourcePatcherWithDeps<Data, Deps, Ctx> =
  // <empty comment to force formatting>
  ccmod.patchList.ResourcePatcherWithDeps<Data, Deps, Ctx>;

export class ResourcePatchList<Data, Ctx>
  extends PatchList<ResourcePatcherWithDeps<Data, unknown, Ctx>>
  implements ccmod.patchList.ResourcePatchList<Data, Ctx> {
  public add<Data2 extends Data = Data, Deps = never>(
    path: string | RegExp,
    patcher: ResourcePatcherSimple<Data2, Deps, Ctx> | ResourcePatcherWithDeps<Data2, Deps, Ctx>,
  ): void {
    if (typeof patcher === 'function') patcher = { patcher };
    super.add(path, (patcher as unknown) as ResourcePatcherWithDeps<Data, unknown, Ctx>);
  }
}
