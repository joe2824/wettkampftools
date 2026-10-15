import { Geodesic } from "geographiclib-geodesic";

export interface Coordinates {
	lat: number;
	lon: number;
}

export interface Organisation extends Coordinates {
	name: string;
	/** Kennung im DLRG-Dienst; fehlt in älteren Zwischenspeichern. */
	id?: string;
	plz?: string;
	ort?: string;
	/** Art der Gliederung, z. B. Ortsgruppe oder Bezirk. */
	bez?: string;
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

const DETAIL_FIELDS = ["id", "plz", "ort", "bez"] as const;
type DetailField = (typeof DETAIL_FIELDS)[number];
type Details = Pick<Organisation, DetailField>;

function readDetail(value: unknown): string | undefined {
	if (typeof value === "string") return value.trim();
	if (typeof value === "number" && Number.isFinite(value)) return String(value);
	return undefined;
}

/** Nur vorhandene Angaben, damit fehlende Felder gar nicht erst auftauchen. */
function readDetails(poi: Record<string, unknown> | Organisation): Details {
	const details: Details = {};
	for (const field of DETAIL_FIELDS) {
		const value = readDetail(poi[field]);
		if (value !== undefined) details[field] = value;
	}
	return details;
}

// Orte mit mehreren Einträgen (z. B. Ortsgruppe und Jugend) tragen den Typ am einzelnen Eintrag.
function isOrganisationPoi(poi: unknown, locationType: unknown): poi is { name: string } & Record<string, unknown> {
	if (!isRecord(poi) || typeof poi.name !== "string" || poi.name === "") return false;
	return (poi.typ ?? locationType) === ORGANISATION_TYPE;
}

function parseLocation(loc: unknown): Organisation[] {
	if (!isRecord(loc) || !Array.isArray(loc.pois)) return [];
	const lat = toCoordinate(loc.lat, MAX_LAT);
	const lon = toCoordinate(loc.lon, MAX_LON);
	if (lat === null || lon === null) return [];
	return loc.pois
		.filter((poi) => isOrganisationPoi(poi, loc.typ))
		.map((poi) => ({ name: poi.name, lat, lon, ...readDetails(poi) }));
}

export function parsePoiResponse(json: unknown): Organisation[] {
	if (!isRecord(json) || !Array.isArray(json.locs)) return [];
	return json.locs.flatMap(parseLocation);
}

export async function fetchOrganisations(fetchFn: (url: string) => Promise<unknown>): Promise<Organisation[]> {
	return parsePoiResponse(await fetchFn(POI_URL));
}

function isOrganisation(value: unknown): value is Organisation {
	return (
		isRecord(value) &&
		typeof value.name === "string" &&
		typeof value.lat === "number" &&
		typeof value.lon === "number" &&
		toCoordinate(value.lat, MAX_LAT) !== null &&
		toCoordinate(value.lon, MAX_LON) !== null &&
		DETAIL_FIELDS.every((field) => value[field] === undefined || typeof value[field] === "string")
	);
}

export function parseGldCache(value: unknown): GldCache | null {
	if (!isRecord(value) || typeof value.fetchedAt !== "string") return null;
	if (Number.isNaN(Date.parse(value.fetchedAt))) return null;
	if (!Array.isArray(value.organisations) || !value.organisations.every(isOrganisation)) return null;
	return {
		fetchedAt: value.fetchedAt,
		organisations: value.organisations.map((org) => ({
			name: org.name,
			lat: org.lat,
			lon: org.lon,
			...readDetails(org)
		}))
	};
}
