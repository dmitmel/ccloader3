

export default class DynamicJsonFiles {
    public overrides = new Map<string, Function>();

    public forPath(path: string): any {
        if (this.overrides.has(path)) {
            const generator = this.overrides.get(path);

            if (generator) {
                return generator();
            }
        }

        return undefined;
    }

    public add(targetFile: string, fileGeneratorFunction: Function): any {
        this.overrides.set(targetFile, fileGeneratorFunction);
    }
}
