
type DynamicJsonFunction = () => unknown;
export default class DynamicJsonFiles {
    public overrides = new Map<string, DynamicJsonFunction>();

    public forPath(path: string): unknown | null {
        if (this.overrides.has(path)) {
            const generator = this.overrides.get(path);

            if (generator) {
                return generator();
            }
        }

        return null;
    }

    public add(targetFile: string, fileGeneratorFunction: DynamicJsonFunction): void {
        this.overrides.set(targetFile, fileGeneratorFunction);
    }
}
