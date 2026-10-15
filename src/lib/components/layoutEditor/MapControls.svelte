<script lang="ts">
	import { Label } from "$lib/components/ui/label";
	import { Switch } from "$lib/components/ui/switch";

	interface Props {
		enabled: boolean;
		/** Gespeicherte Standortdaten vorhanden */
		locationsAvailable: boolean;
		/** Anzahl der Gliederungen mit Punkt auf der Karte */
		pointCount: number;
		onchange: (enabled: boolean) => void;
	}

	let { enabled, locationsAvailable, pointCount, onchange }: Props = $props();

	const hint = $derived.by(() => {
		if (!locationsAvailable)
			return "Ohne Standortdaten zeigt die Karte nur den Umriss. Standortdaten unter Entfernungen laden.";
		if (pointCount === 0) return "Punkte erscheinen, sobald Meldungen oder Ergebnisse geladen sind.";
		return pointCount === 1 ? "1 Gliederung auf der Karte." : `${pointCount} Gliederungen auf der Karte.`;
	});
</script>

<div class="flex flex-col gap-2">
	<div class="flex items-center justify-between gap-3">
		<Label for="layout-map">Karte auf der Urkunde</Label>
		<Switch id="layout-map" checked={enabled} onCheckedChange={onchange} />
	</div>
	{#if enabled}
		<p class="text-xs text-muted-foreground">{hint}</p>
	{/if}
</div>
