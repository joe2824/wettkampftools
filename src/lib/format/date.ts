const MONTHS = [
	"Januar",
	"Februar",
	"März",
	"April",
	"Mai",
	"Juni",
	"Juli",
	"August",
	"September",
	"Oktober",
	"November",
	"Dezember"
];
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** „2026-11-14“ → „14. November 2026“; leer oder ungültig → leer. */
export function formatGermanDate(iso: string): string {
	const match = ISO_DATE.exec(iso);
	if (!match) return "";
	const month = MONTHS[Number(match[2]) - 1];
	if (month === undefined) return "";
	return `${Number(match[3])}. ${month} ${match[1]}`;
}

const pad2 = (value: number): string => String(value).padStart(2, "0");

/** ISO-Zeitpunkt → „14.10.2026, 11:05 Uhr“ in Ortszeit; ungültig → leer. */
export function formatGermanDateTime(iso: string): string {
	const date = new Date(iso);
	if (Number.isNaN(date.getTime())) return "";
	const day = `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`;
	return `${day}, ${pad2(date.getHours())}:${pad2(date.getMinutes())} Uhr`;
}
