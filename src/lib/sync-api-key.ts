export function getBearerToken(request: Request): string | null {
	const h = request.headers.get("authorization");
	if (!h?.toLowerCase().startsWith("bearer ")) return null;
	return h.slice(7).trim();
}
