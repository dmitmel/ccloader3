export {};

declare global {
  namespace ig {
    function _DOMReady(): void;

    interface System {
      delegate: unknown;

      setGameNow(this: this, gameClass: unknown): void;
      setDelegate(this: this, delegate: unknown): void;
    }

    var system: System;
    var game: unknown;
  }

  function startCrossCode(): void;
}
