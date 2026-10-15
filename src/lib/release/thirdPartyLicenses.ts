// Lizenzhinweise der Fremdpakete; die Datei entsteht beim Build (scripts/licenses-plugin.mjs).

export interface ThirdPartyPackage {
	name: string;
	version: string;
	license: string;
	source: "npm" | "cargo";
	/** Verweise in `texts`; leer, wenn das Paket keinen Lizenztext mitbringt. */
	texts: number[];
}

export interface ThirdPartyNotices {
	rust: "ok" | "unavailable";
	texts: string[];
	packages: ThirdPartyPackage[];
}

export type NoticesResult = { status: "ok"; notices: ThirdPartyNotices } | { status: "missing" };

export interface LicenseCount {
	license: string;
	count: number;
}

const NOTICES_URL = "/third-party-licenses.json";

function isNotices(value: unknown): value is ThirdPartyNotices {
	const candidate = value as ThirdPartyNotices | null;
	return Array.isArray(candidate?.texts) && Array.isArray(candidate?.packages);
}

/** Fehlt die Datei (Entwicklung) oder ist sie unlesbar, gilt sie als fehlend. */
export async function loadThirdPartyLicenses(fetchFn: typeof fetch = fetch): Promise<NoticesResult> {
	try {
		const response = await fetchFn(NOTICES_URL);
		if (!response.ok) return { status: "missing" };
		const notices: unknown = await response.json();
		return isNotices(notices) ? { status: "ok", notices } : { status: "missing" };
	} catch {
		return { status: "missing" };
	}
}

/** Suche in Name und Lizenz, ohne Groß-/Kleinschreibung. */
export function filterPackages(packages: ThirdPartyPackage[], query: string): ThirdPartyPackage[] {
	const needle = query.trim().toLowerCase();
	if (!needle) return packages;
	return packages.filter(
		(pkg) => pkg.name.toLowerCase().includes(needle) || pkg.license.toLowerCase().includes(needle)
	);
}

/** Anzahl je Lizenzangabe, häufigste zuerst, sonst alphabetisch. */
export function licenseCounts(packages: ThirdPartyPackage[]): LicenseCount[] {
	const counts = new Map<string, number>();
	for (const pkg of packages) counts.set(pkg.license, (counts.get(pkg.license) ?? 0) + 1);
	return [...counts]
		.map(([license, count]) => ({ license, count }))
		.sort((a, b) => b.count - a.count || a.license.localeCompare(b.license, "en"));
}
