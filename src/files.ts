import { promises as fs } from './node-module-imports/_fs.js';

export function loadText(url: string): Promise<string> {
  return fs.readFile(url, 'utf8');

  // try {
  //   let response = await fetch(url);
  //   return await response.text();
  // } catch (err) {
  //   if (errorHasMessage(err)) {
  //     err.message = `Failed to load file '${url}': ${err.message}`;
  //   }
  //   throw err;
  // }
}
