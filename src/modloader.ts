export const name = 'ccloader';
export const version = '3.0.0-alpha';

export async function boot(): Promise<void> {
  console.log(`${name} v${version}`);
  return Promise.resolve();
}
