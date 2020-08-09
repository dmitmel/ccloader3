/* eslint-disable @typescript-eslint/explicit-member-accessibility */

export {};

declare global {
  namespace ig {
    interface Resource {
      cacheType: string;
      path: string;
      load(
        this: this,
        callback?: (cacheType: string, path: string, success: boolean) => void,
      ): void;
    }
    function addResource(resource: Resource): void;

    function _DOMReady(): void;

    class System {
      delegate: Game;

      setGameNow(gameClass: new () => ig.Game): void;
      setDelegate(delegate: ig.Game): void;
    }

    // eslint-disable-next-line @typescript-eslint/no-extraneous-class
    class Game {}

    let system: ig.System;
    let game: ig.Game;
  }

  function startCrossCode(): void;
}
