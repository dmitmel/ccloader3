import * as pathsImpl from '../../../common/dist/paths';
import * as utilsImpl from '../../../common/dist/utils';

declare global {
	namespace ccmod3 {
		let paths: typeof pathsImpl;
		let utils: typeof utilsImpl;
	}
}
