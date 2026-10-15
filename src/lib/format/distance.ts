const KM_DECIMALS = 2;

export function formatKm(km: number): string {
	return km.toLocaleString("de-DE", { minimumFractionDigits: KM_DECIMALS, maximumFractionDigits: KM_DECIMALS });
}
