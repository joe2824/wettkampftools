<script lang="ts">
	import { PAGE_HEIGHT_MM, PAGE_WIDTH_MM } from "$lib/certificates/layout";
	import { formatSpacing, type Guide, type SpacingMark } from "$lib/certificates/snapping";

	// Hilfslinien und Abstandsmarken während des Ziehens; nur im Editor, nie im PDF.
	interface Props {
		guides: Guide[];
		spacings: SpacingMark[];
	}

	let { guides, spacings }: Props = $props();

	const GUIDE_CLASS = "stroke-fuchsia-500 [stroke-width:1px]";
	const TICK_MM = 1.2;
	const LABEL_MM = 2.6;
	const LABEL_GAP_MM = 1;

	/** Endpunkte in Seitenkoordinaten */
	function ends(mark: SpacingMark) {
		return mark.axis === "x"
			? { x1: mark.fromMm, y1: mark.crossMm, x2: mark.toMm, y2: mark.crossMm }
			: { x1: mark.crossMm, y1: mark.fromMm, x2: mark.crossMm, y2: mark.toMm };
	}

	function ticks(mark: SpacingMark) {
		return [mark.fromMm, mark.toMm].map((at) =>
			mark.axis === "x"
				? { x1: at, y1: mark.crossMm - TICK_MM, x2: at, y2: mark.crossMm + TICK_MM }
				: { x1: mark.crossMm - TICK_MM, y1: at, x2: mark.crossMm + TICK_MM, y2: at }
		);
	}

	function labelAt(mark: SpacingMark) {
		const center = (mark.fromMm + mark.toMm) / 2;
		return mark.axis === "x"
			? { x: center, y: mark.crossMm - TICK_MM - LABEL_GAP_MM, anchor: "middle" }
			: { x: mark.crossMm + TICK_MM + LABEL_GAP_MM, y: center + LABEL_MM / 3, anchor: "start" };
	}
</script>

<g class="pointer-events-none" aria-hidden="true">
	{#each guides as guide (`${guide.axis}:${guide.positionMm}`)}
		{#if guide.axis === "x"}
			<line
				x1={guide.positionMm}
				y1={0}
				x2={guide.positionMm}
				y2={PAGE_HEIGHT_MM}
				vector-effect="non-scaling-stroke"
				class={GUIDE_CLASS}
			/>
		{:else}
			<line
				x1={0}
				y1={guide.positionMm}
				x2={PAGE_WIDTH_MM}
				y2={guide.positionMm}
				vector-effect="non-scaling-stroke"
				class={GUIDE_CLASS}
			/>
		{/if}
	{/each}

	{#each spacings as mark, index (index)}
		{@const label = labelAt(mark)}
		<line {...ends(mark)} vector-effect="non-scaling-stroke" class={GUIDE_CLASS} />
		{#each ticks(mark) as tick, tickIndex (tickIndex)}
			<line {...tick} vector-effect="non-scaling-stroke" class={GUIDE_CLASS} />
		{/each}
		<text
			x={label.x}
			y={label.y}
			text-anchor={label.anchor}
			font-size={LABEL_MM}
			font-weight="600"
			stroke="white"
			stroke-width="0.6"
			paint-order="stroke"
			class="fill-fuchsia-600"
		>
			{formatSpacing(mark.toMm - mark.fromMm)}
		</text>
	{/each}
</g>
