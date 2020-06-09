// TODO: mention somewhere in docs that modification of `TypeError`'s `message`
// doesn't work.
export function hasMessage(error: unknown): error is { message: string } {
	return typeof error === 'object' && error != null && 'message' in error && typeof (error as { message: unknown }).message === 'string';
}

export function hasCode(error: unknown): error is { code: string } {
	return typeof error === 'object' && error != null && 'code' in error && typeof (error as { code: unknown }).code === 'string';
}
