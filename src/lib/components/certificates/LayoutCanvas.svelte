<script lang="ts" module>
	export type CanvasZoom = "fit" | "actual";
</script>

<script lang="ts">
	import { hitBox, isShown, moveObject, nudgeDelta, objectAt, type PointMm } from "$lib/certificates/editorOps";
	import { PAGE_WIDTH_MM, type Layout, type LayoutObject } from "$lib/certificates/layout";
	import type { DrawOp } from "$lib/certificates/render";
	import { cn } from "$lib/utils.js";
	import CertificatePageView from "./CertificatePageView.svelte";
	import type { ImageUrlMap } from "./imageUrls.svelte";

	interface Props {
		layout: Layout;
		ops: DrawOp[];
		/** Blob-Adressen der Unterschriften und des Hintergrund-Scans. */
		imageUrls: ImageUrlMap;
		backgroundOpacity: number | null;
		withMemberNames: boolean;
		zoom: CanvasZoom;
		selectedId: string | null;
		onselect: (id: string | null) => void;
		onchange: (object: LayoutObject) => void;
	}

	let { layout, ops, imageUrls, backgroundOpacity, withMemberNames, zoom, selectedId, onselect, onchange }: Props =
		$props();

	let svg = $state<SVGSVGElement | null>(null);
	let drag = $state.raw<{ pointerId: number; start: PointMm; object: LayoutObject } | null>(null);

	const selected = $derived(layout.objects.find((object) => object.id === selectedId) ?? null);
	const shownObjects = $derived(layout.objects.filter((object) => isShown(object, withMemberNames)));
	const missingImages = $derived(
		layout.objects.filter((object) => object.kind === "image" && imageUrls[object.slot] === undefined)
	);

	function toMm(event: PointerEvent): PointMm {
		const matrix = svg?.getScreenCTM();
		if (!matrix) return { x: 0, y: 0 };
		const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
		return { x: point.x, y: point.y };
	}

	function handlePointerDown(event: PointerEvent) {
		if (event.button !== 0) return;
		const start = toMm(event);
		const object = objectAt(layout.objects, start, withMemberNames);
		onselect(object?.id ?? null);
		svg?.focus();
		if (!object) return;
		svg?.setPointerCapture(event.pointerId);
		drag = { pointerId: event.pointerId, start, object };
	}

	function handlePointerMove(event: PointerEvent) {
		if (!drag || event.pointerId !== drag.pointerId) return;
		const point = toMm(event);
		const delta = { x: point.x - drag.start.x, y: point.y - drag.start.y };
		// Alt gedrückt: ohne Raster
		onchange(moveObject(drag.object, delta, !event.altKey));
	}

	function handlePointerUp(event: PointerEvent) {
		if (drag?.pointerId === event.pointerId) drag = null;
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === "Escape") {
			onselect(null);
			return;
		}
		const delta = nudgeDelta(event.key, event.shiftKey);
		if (!selected || !delta) return;
		event.preventDefault();
		onchange(moveObject(selected, delta, false));
	}
</script>

<div class="h-full w-full overflow-auto rounded-lg bg-muted/50 p-4">
	<!-- Zeichenfläche als eigenes Bedienelement: Maus und Pfeiltasten verschieben das gewählte Element. -->
	<CertificatePageView
		bind:svg
		{ops}
		{imageUrls}
		{backgroundOpacity}
		role="application"
		aria-label="Urkunden-Vorschau. Element anklicken und ziehen oder mit den Pfeiltasten verschieben, Umschalt für 5 mm."
		tabindex={0}
		class={cn(
			"mx-auto block touch-none rounded-sm shadow-md outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50",
			zoom === "fit" ? "h-full" : "",
			drag ? "cursor-grabbing" : "cursor-default"
		)}
		style={zoom === "actual" ? `width: ${PAGE_WIDTH_MM}mm` : undefined}
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointercancel={handlePointerUp}
		onkeydown={handleKeyDown}
	>
		{#each missingImages as object (object.id)}
			{@const box = hitBox(object)}
			<rect x={box.xMm} y={box.yMm} width={box.widthMm} height={box.heightMm} class="fill-muted/60" />
			<text x={box.xMm + 1} y={box.yMm + 4} font-size="3" class="fill-muted-foreground">{object.label}</text>
		{/each}

		{#each shownObjects as object (object.id)}
			{@const box = hitBox(object)}
			<rect
				x={box.xMm}
				y={box.yMm}
				width={box.widthMm}
				height={box.heightMm}
				fill="none"
				vector-effect="non-scaling-stroke"
				class={object.id === selectedId ? "stroke-primary stroke-2" : "stroke-primary/25 [stroke-dasharray:4_3]"}
			/>
		{/each}
	</CertificatePageView>
</div>
