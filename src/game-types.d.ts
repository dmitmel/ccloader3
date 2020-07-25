export {};

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
