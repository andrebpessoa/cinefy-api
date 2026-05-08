export type CatalogSyncKind = "vod" | "series" | "live";

export type CatalogKindConfig = {
	kind: CatalogSyncKind;
	listPath: `/${string}`;
};

export const CATALOG_KIND_CONFIGS: CatalogKindConfig[] = [
	{ kind: "vod", listPath: "/vod" },
	{ kind: "series", listPath: "/series" },
	{ kind: "live", listPath: "/live" },
];
