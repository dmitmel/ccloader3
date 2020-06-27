import { MaybePromise, mapGetOrInsert } from '../../common/dist/utils.js';

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

export type ResourcePatcherSimple<Data, Deps, Ctx> = (
  data: Data,
  dependencies: Deps,
  context: Ctx,
) => MaybePromise<Data | void>;

export interface ResourcePatcherWithDeps<Data, Deps, Ctx> {
  dependencies?: ((context: Ctx) => Promise<Deps>) | null;
  patcher: ResourcePatcherSimple<Data, Deps, Ctx>;
}

export class ResourcePatchList<Data, Ctx> extends PatchList<
  ResourcePatcherWithDeps<Data, unknown, Ctx>
> {
  public add<Deps = never>(
    path: string | RegExp,
    patcher: ResourcePatcherSimple<Data, Deps, Ctx> | ResourcePatcherWithDeps<Data, Deps, Ctx>,
  ): void {
    if (typeof patcher === 'function') patcher = { patcher };
    super.add(path, patcher as ResourcePatcherWithDeps<Data, unknown, Ctx>);
  }
}
