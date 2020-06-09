declare namespace ig {
	function _DOMReady(): void;

	interface System {
		setGameNow(this: this, gameClass: unknown): void;
	}

	const system: System;
}

declare function startCrossCode(): void;
