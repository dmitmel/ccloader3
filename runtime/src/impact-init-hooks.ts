export const callbacks: Array<() => void> = [];

export function add(callback: () => void): void {
  callbacks.push(callback);
}
