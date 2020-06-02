import { errorHasMessage } from './utils.js';

export async function loadText(url: string): Promise<string> {
  try {
    let response = await fetch(url);
    return await response.text();
  } catch (err) {
    if (errorHasMessage(err)) {
      err.message = `Failed to load file '${url}': ${err.message}`;
    }
    throw err;
  }
}
