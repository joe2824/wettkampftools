import { Geodesic } from "geographiclib-geodesic";

export interface Coordinates {
	lat: number;
	lon: number;
}

export interface Organisation extends Coordinates {
	name: string;
}

export interface DistanceResult {
	matched: { name: string; km: number }[];
	unmatched: string[];
}

export interface GldCache {
	fetchedAt: string;
	organisations: Organisation[];
}

export const BAD_NAUHEIM: Coordinates = { lat: 50.367073, lon: 8.74088 };
export const POI_URL = "https://services.dlrg.net/service.php?doc=poi&strict=1&limit=5000";

const ORGANISATION_TYPE = "Gld";
const NAME_NOISE = /(ortsgruppe|bezirk|ortsverband|landesverband|e\.v\.)/gi;
const METERS_PER_KM = 1000;
const KM_DECIMALS_FACTOR = 100;
const MAX_LAT = 90;
const MAX_LON = 180;

export function cleanName(name: string): string {
	return name.replace(NAME_NOISE, "").trim();
}

export function distanceKm(a: Coordinates, b: Coordinates): number {
	// Standard-Outmask enthält immer die Distanz s12
	return Geodesic.WGS84.Inverse(a.lat, a.lon, b.lat, b.lon).s12! / METERS_PER_KM;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function toCoordinate(value: unknown, limit: number): number | null {
	let parsed = Number.NaN;
	if (typeof value === "number") parsed = value;
	else if (typeof value === "string" && value.trim() !== "") parsed = Number(value);
	return Number.isFinite(parsed) && Math.abs(parsed) <= limit ? parsed : null;
}

function parseLocation(loc: unknown): Organisation[] {
	if (!isRecord(loc) || loc.typ !== ORGANISATION_TYPE || !Array.isArray(loc.pois)) return [];
	const lat = toCoordinate(loc.lat, MAX_LAT);
	const lon = toCoordinate(loc.lon, MAX_LON);
	if (lat === null || lon === null) return [];
	return loc.pois
		.filter((poi): poi is { name: string } => isRecord(poi) && typeof poi.name === "string" && poi.name !== "")
		.map((poi) => ({ name: poi.name, lat, lon }));
}

export function parsePoiResponse(json: unknown): Organisation[] {
	if (!isRecord(json) || !Array.isArray(json.locs)) return [];
	return json.locs.flatMap(parseLocation);
}

export async function fetchOrganisations(fetchFn: (url: string) => Promise<unknown>): Promise<Organisation[]> {
	return parsePoiResponse(await fetchFn(POI_URL));
}

function matchKey(name: string): string {
	return cleanName(name).toLowerCase();
}

function roundKm(km: number): number {
	return Math.round(km * KM_DECIMALS_FACTOR) / KM_DECIMALS_FACTOR;
}

export function distancesToBadNauheim(names: string[], orgs: Organisation[]): DistanceResult {
	const firstByKey = new Map<string, Organisation>();
	for (const org of orgs) {
		const key = matchKey(org.name);
		if (!firstByKey.has(key)) firstByKey.set(key, org);
	}
	const result: DistanceResult = { matched: [], unmatched: [] };
	for (const name of names) {
		const org = firstByKey.get(matchKey(name));
		if (org) result.matched.push({ name, km: roundKm(distanceKm(BAD_NAUHEIM, org)) });
		else result.unmatched.push(name);
	}
	result.matched.sort((a, b) => b.km - a.km);
	return result;
}

function isOrganisation(value: unknown): value is Organisation {
	return (
		isRecord(value) &&
		typeof value.name === "string" &&
		typeof value.lat === "number" &&
		typeof value.lon === "number" &&
		toCoordinate(value.lat, MAX_LAT) !== null &&
		toCoordinate(value.lon, MAX_LON) !== null
	);
}

export function parseGldCache(value: unknown): GldCache | null {
	if (!isRecord(value) || typeof value.fetchedAt !== "string") return null;
	if (Number.isNaN(Date.parse(value.fetchedAt))) return null;
	if (!Array.isArray(value.organisations) || !value.organisations.every(isOrganisation)) return null;
	return {
		fetchedAt: value.fetchedAt,
		organisations: value.organisations.map(({ name, lat, lon }) => ({ name, lat, lon }))
	};
}
