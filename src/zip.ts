import JSZip from '../common/vendor-libs/jszip.js';
import * as files from './files.js';



export async function extract(zipPath: string, targetDirectory: string): Promise<void> {
    if (!targetDirectory.endsWith('/')) {
        targetDirectory += '/';
    }

    const zip = new JSZip();
    const buffer = await files.loadBinary(zipPath);
    await zip.loadAsync(buffer);
    for (const fileName of Object.keys(zip.files)) {
        const fileTargetPath = `${targetDirectory}${fileName}`;
        const zipFile = zip.files[fileName];
        if (zipFile.dir) {
            await files.mkdir(fileTargetPath)
        } else {
            const zipData = await zipFile.async('uint8array');
            await files.createFile(fileTargetPath, zipData);
        }
    }    
}