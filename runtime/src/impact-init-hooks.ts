export type ImpactInitHook = () => void;

export const callbacks: ImpactInitHook[] = [];

export function add(callback: ImpactInitHook): void {
  callbacks.push(callback);
}
