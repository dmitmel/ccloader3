type DynamicJsonFunction = () => unknown;
type DynamicJsonFunctionAsync = () => Promise<unknown>;
export default class DynamicJsonFiles {
  private overrides = new Map<string, DynamicJsonFunction>();

  public isApplicable(path: string): boolean {
    return this.overrides.has(path);
  }

  public async forPath(path: string): Promise<unknown> {
    const generator = this.overrides.get(path);
    if (generator) {
      return generator();
    }

    return null;
  }

  public add(targetFile: string, fileGeneratorFunction: DynamicJsonFunction): void {
    this.overrides.set(targetFile, () => Promise.resolve(fileGeneratorFunction()));
  }

  public addAsync(targetFile: string, fileGeneratorFunction: DynamicJsonFunctionAsync): void {
    this.overrides.set(targetFile, fileGeneratorFunction);
  }
}
