

export default class DynamicJsonFiles {
    public overrides = new Map<string, Function>();

    public forPath(path: string): any {
        return {};
    }

    public add(targetFile: string, fileGeneratorFunction: Function): any {
        this.overrides.set(targetFile, fileGeneratorFunction);
    }
}
