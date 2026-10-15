<script lang="ts">
	import type { DistanceRow } from "$lib/distance/matching";
	import { formatKm } from "$lib/format/distance";
	import { mapScene, ringsPath } from "$lib/maps/shapes";
	import { cn } from "$lib/utils.js";

	interface Props {
		rows: DistanceRow[];
		/** Gliederung, die in Karte und Tabelle hervorgehoben ist */
		highlighted: string | null;
		onhighlight: (name: string | null) => void;
		/** Klick auf einen Punkt: Tabellenzeile zeigen */
		onselect: (name: string) => void;
	}

	let { rows, highlighted, onhighlight, onselect }: Props = $props();

	const WIDTH = 600;
	const HEIGHT = 800;
	const BOX = { x: 20, y: 20, width: WIDTH - 40, height: HEIGHT - 40 };
	const SCENE_OPTIONS = { minStep: 1.5, homeRadius: 14 };
	const DOT_RADIUS = 6;
	const HIGHLIGHT_RADIUS = 10;
	const PERCENT = 100;

	// Umrisse hängen nicht von den Gliederungen ab: nur einmal berechnen.
	const statePaths = mapScene(BOX, [], SCENE_OPTIONS).states.map((state) => ({
		code: state.code,
		name: state.name,
		d: ringsPath(state.rings)
	}));
	const scene = $derived(
		mapScene(
			BOX,
			rows.map((row) => ({ name: row.name, position: row.position })),
			SCENE_OPTIONS
		)
	);
	const kmByName = $derived(new Map(rows.map((row) => [row.name, row.km])));
	const active = $derived(scene.markers.find((marker) => marker.name === highlighted) ?? null);
</script>

<div class="relative mx-auto w-full max-w-md">
	<svg viewBox="0 0 {WIDTH} {HEIGHT}" class="h-auto w-full" role="group" aria-label="Deutschlandkarte der Anreise">
		{#each statePaths as state (state.code)}
			<path
				d={state.d}
				fill-rule="evenodd"
				stroke-linejoin="round"
				class="fill-muted stroke-muted-foreground/40"
				stroke-width="1.5"
			>
				<title>{state.name}</title>
			</path>
		{/each}

		{#each scene.markers as marker (marker.name)}
			{@const isActive = marker.name === highlighted}
			<circle
				cx={marker.x}
				cy={marker.y}
				r={isActive ? HIGHLIGHT_RADIUS : DOT_RADIUS}
				role="button"
				tabindex="0"
				aria-label="{marker.name}, {formatKm(kmByName.get(marker.name) ?? 0)} km"
				class={cn(
					"cursor-pointer stroke-background outline-none transition-[r]",
					isActive ? "fill-destructive" : "fill-chart-1"
				)}
				stroke-width="2"
				onpointerenter={() => onhighlight(marker.name)}
				onpointerleave={() => onhighlight(null)}
				onfocus={() => onhighlight(marker.name)}
				onblur={() => onhighlight(null)}
				onclick={() => onselect(marker.name)}
				onkeydown={(event) => event.key === "Enter" && onselect(marker.name)}
			/>
		{/each}

		<path d={ringsPath([scene.home.points])} class="fill-primary stroke-background" stroke-width="2">
			<title>Bad Nauheim</title>
		</path>
	</svg>

	{#if active}
		<div
			class="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+0.75rem)] rounded-md border bg-popover px-2.5 py-1.5 text-sm whitespace-nowrap text-popover-foreground shadow-md"
			style:left="{(active.x / WIDTH) * PERCENT}%"
			style:top="{(active.y / HEIGHT) * PERCENT}%"
			role="status"
		>
			<span class="font-medium">{active.name}</span>
			<span class="text-muted-foreground tabular-nums">· {formatKm(kmByName.get(active.name) ?? 0)} km</span>
		</div>
	{/if}
</div>
