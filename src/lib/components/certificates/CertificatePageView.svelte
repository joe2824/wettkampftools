<script lang="ts">
	import type { Snippet } from "svelte";
	import type { SVGAttributes } from "svelte/elements";
	import { PAGE_HEIGHT_MM, PAGE_WIDTH_MM, ptToMm, type FontWeight } from "$lib/certificates/layout";
	import type { DrawOp } from "$lib/certificates/render";
	import type { ImageUrlMap } from "./imageUrls.svelte";

	// Eine Urkundenseite aus denselben Zeichenbefehlen wie im PDF, als SVG in Millimetern.
	interface Props extends SVGAttributes<SVGSVGElement> {
		ops: DrawOp[];
		/** Blob-Adressen der Unterschriften und des Hintergrund-Scans. */
		imageUrls: ImageUrlMap;
		/** Deckkraft des Hintergrund-Scans; null blendet ihn aus (wird nie gedruckt). */
		backgroundOpacity: number | null;
		svg?: SVGSVGElement | null;
		/** Zusätzliche Ebenen über der Seite, z. B. Markierungen im Editor. */
		children?: Snippet;
	}

	let { ops, imageUrls, backgroundOpacity, svg = $bindable(null), children, ...rest }: Props = $props();

	const CSS_WEIGHTS: Record<FontWeight, number> = { light: 300, regular: 400, bold: 700, black: 900 };
	const VIEW_BOX = `0 0 ${PAGE_WIDTH_MM} ${PAGE_HEIGHT_MM}`;
</script>

<svg bind:this={svg} viewBox={VIEW_BOX} style:aspect-ratio="{PAGE_WIDTH_MM} / {PAGE_HEIGHT_MM}" {...rest}>
	<rect width={PAGE_WIDTH_MM} height={PAGE_HEIGHT_MM} fill="white" />
	{#if backgroundOpacity !== null && imageUrls.background}
		<image
			href={imageUrls.background}
			width={PAGE_WIDTH_MM}
			height={PAGE_HEIGHT_MM}
			preserveAspectRatio="none"
			opacity={backgroundOpacity}
		/>
	{/if}

	{#each ops as op, index (index)}
		{#if op.kind === "text"}
			<text
				x={op.xMm}
				y={op.baselineMm}
				font-family="Nunito"
				font-weight={CSS_WEIGHTS[op.font]}
				font-size={ptToMm(op.sizePt)}
				fill="black"
				style:white-space="pre">{op.text}</text
			>
		{:else if op.kind === "image"}
			<image
				href={imageUrls[op.slot]}
				x={op.xMm}
				y={op.topMm}
				width={op.widthMm}
				height={op.heightMm}
				preserveAspectRatio="xMidYMid meet"
			/>
		{:else}
			<line x1={op.x1Mm} y1={op.y1Mm} x2={op.x2Mm} y2={op.y2Mm} stroke="black" stroke-width={op.thicknessMm} />
		{/if}
	{/each}

	{@render children?.()}
</svg>
