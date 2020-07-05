export type ImpactInitHook = ccmod.impactInitHooks.ImpactInitHook;

export const callbacks: ImpactInitHook[] = [];

export function add(callback: ImpactInitHook): void {
  callbacks.push(callback);
}
