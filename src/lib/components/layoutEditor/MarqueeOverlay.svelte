<script lang="ts">
	import type { BoxMm } from "$lib/certificates/editorOps";

	// Aufgezogener Auswahlrahmen und Vorschau der Elemente, die er erfassen würde.
	interface Props {
		box: BoxMm;
		/** Flächen der Elemente, die beim Loslassen gewählt würden */
		marked: BoxMm[];
	}

	let { box, marked }: Props = $props();
</script>

{#each marked as mark, index (index)}
	<rect
		x={mark.xMm}
		y={mark.yMm}
		width={mark.widthMm}
		height={mark.heightMm}
		vector-effect="non-scaling-stroke"
		data-marquee-mark
		class="pointer-events-none fill-primary/15 stroke-primary [stroke-width:1.5px]"
	/>
{/each}
<rect
	x={box.xMm}
	y={box.yMm}
	width={box.widthMm}
	height={box.heightMm}
	vector-effect="non-scaling-stroke"
	data-marquee
	class="pointer-events-none fill-primary/10 stroke-primary [stroke-dasharray:4_2] [stroke-width:1px]"
/>
