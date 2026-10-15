<script lang="ts" module>
	import type { ResizeHandle } from "$lib/certificates/objectResize";

	/** Mauszeiger je Anfasser, auch für die ganze Fläche während des Ziehens */
	export const HANDLE_CURSORS: Record<ResizeHandle, string> = {
		n: "cursor-ns-resize",
		s: "cursor-ns-resize",
		e: "cursor-ew-resize",
		w: "cursor-ew-resize",
		ne: "cursor-nesw-resize",
		sw: "cursor-nesw-resize",
		nw: "cursor-nwse-resize",
		se: "cursor-nwse-resize"
	};
</script>

<script lang="ts">
	import type { BoxMm } from "$lib/certificates/editorOps";
	import { handlePoint } from "$lib/certificates/objectResize";

	// Rahmen der Auswahl mit Anfassern zum Skalieren; nur im Editor.
	interface Props {
		box: BoxMm;
		handles: ResizeHandle[];
		/** Mehrere Objekte: Rahmen um die ganze Auswahl */
		group: boolean;
		onhandledown: (handle: ResizeHandle, event: PointerEvent) => void;
	}

	let { box, handles, group, onhandledown }: Props = $props();

	const HANDLE_MM = 2.4;

	function handleDown(handle: ResizeHandle, event: PointerEvent) {
		if (event.button !== 0) return;
		event.stopPropagation();
		onhandledown(handle, event);
	}
</script>

{#if group}
	<rect
		x={box.xMm}
		y={box.yMm}
		width={box.widthMm}
		height={box.heightMm}
		fill="none"
		vector-effect="non-scaling-stroke"
		class="pointer-events-none stroke-primary [stroke-dasharray:6_3] [stroke-width:1.5px]"
	/>
{/if}

{#each handles as handle (handle)}
	{@const point = handlePoint(box, handle)}
	<rect
		x={point.x - HANDLE_MM / 2}
		y={point.y - HANDLE_MM / 2}
		width={HANDLE_MM}
		height={HANDLE_MM}
		rx={HANDLE_MM / 4}
		vector-effect="non-scaling-stroke"
		class="fill-white stroke-primary [stroke-width:1.5px] {HANDLE_CURSORS[handle]}"
		role="presentation"
		onpointerdown={(event) => handleDown(handle, event)}
	/>
{/each}
