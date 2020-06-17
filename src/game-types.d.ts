export interface ChangelogFile {
  changelog: ChangelogFile.Entry[];
}
export namespace ChangelogFile {
  export interface Entry {
    name: string;
    version: string;
    date: string;
    fixes?: string[];
    changes?: string[];
  }
}

declare global {
  namespace ig {
    function _DOMReady(): void;

    interface System {
      setGameNow(this: this, gameClass: unknown): void;
    }

    var system: System;
  }

  function startCrossCode(): void;
}
