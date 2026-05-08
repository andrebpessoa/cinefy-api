export function bearerTokensEqual(a: string, b: string): boolean {
	const wa = new TextEncoder().encode(a);
	const wb = new TextEncoder().encode(b);
	if (wa.length !== wb.length) return false;
	return crypto.timingSafeEqual(wa, wb);
}
