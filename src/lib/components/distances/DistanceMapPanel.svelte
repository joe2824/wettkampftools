<script lang="ts">
	import type { DistanceRow } from "$lib/distance/matching";
	import DistanceMap from "./DistanceMap.svelte";
	import DistanceOverview from "./DistanceOverview.svelte";
	import MapSaveButtons from "./MapSaveButtons.svelte";

	interface Props {
		rows: DistanceRow[];
		highlighted: string | null;
		onhighlight: (name: string | null) => void;
		onselect: (name: string) => void;
	}

	let { rows, highlighted, onhighlight, onselect }: Props = $props();
</script>

<section aria-label="Karte und Übersicht" class="flex flex-col gap-4">
	<DistanceOverview {rows} />
	<MapSaveButtons {rows} />
	<DistanceMap {rows} {highlighted} {onhighlight} {onselect} />
	<p class="text-xs text-muted-foreground">
		Punkt anklicken, um die Gliederung in der Liste zu zeigen. Der Stern markiert Bad Nauheim. Kartengrundlage: Natural
		Earth (gemeinfrei), ohne Internet nutzbar.
	</p>
</section>
