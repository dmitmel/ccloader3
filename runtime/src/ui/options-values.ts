const DEFAULT_LOG_FLAGS = 0b011;

function getLogFlagsBitset(): number {
	let logFlagsStr = localStorage.getItem('logFlags');
	let logFlags = logFlagsStr ? parseInt(logFlagsStr, 10) : DEFAULT_LOG_FLAGS;
	if (Number.isNaN(logFlags)) {
		logFlags = DEFAULT_LOG_FLAGS;
	}
	return logFlags;
}

function setLogFlagsBitset(value: number): void {
	localStorage.setItem('logFlags', String(value));
}

function getLogFlag(index: number): boolean {
	return Boolean((getLogFlagsBitset() >> index) & 1);
}

function setLogFlag(index: number, value: boolean): void {
	let bitset = getLogFlagsBitset();
	if (value) {
		bitset |= 1 << index;
	} else {
		bitset &= ~(1 << index);
	}
	setLogFlagsBitset(bitset);
}

Object.defineProperties(sc.options.values, {
	'logLevel-log': {
		get: () => getLogFlag(2),
		set: (value) => setLogFlag(2, value),
	},
	'logLevel-warn': {
		get: () => getLogFlag(1),
		set: (value) => setLogFlag(1, value),
	},
	'logLevel-error': {
		get: () => getLogFlag(0),
		set: (value) => setLogFlag(0, value),
	},
});

for (let modId of modloader.installedMods.keys()) {
	if (modId === 'ccloader-runtime') {
		continue;
	}
	let optionId = `modEnabled-${modId}`;

	Object.defineProperty(sc.options.values, optionId, {
		get() {
			return localStorage.getItem(optionId) === 'true';
		},
		set(value) {
			localStorage.setItem(optionId, String(Boolean(value)));
		},
	});
}
