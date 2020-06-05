import * as pathsImpl from '../../../common/dist/paths';
import * as utilsImpl from '../../../common/dist/utils';

declare global {
  namespace ccmod {
    let paths: typeof pathsImpl;
    let utils: typeof utilsImpl;
  }
}
