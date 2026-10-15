<script lang="ts" module>
	export type CanvasZoom = "fit" | "actual";

	// Fortlaufende Nummer je Maus-Geste, damit eine Geste ein Rückgängig-Schritt bleibt.
	let gestures = 0;
</script>

<script lang="ts">
	import { dragObjects, type ObjectDrag } from "$lib/certificates/canvasDrag";
	import { gestureKey } from "$lib/certificates/editHistory";
	import { hitBox, isShown, objectAt, type PointMm } from "$lib/certificates/editorOps";
	import { editorShortcut, type EditorShortcut } from "$lib/certificates/editorShortcuts";
	import { PAGE_WIDTH_MM, type Layout, type LayoutObject } from "$lib/certificates/layout";
	import { HANDLE_SIDES, resizeHandles, type ResizeHandle } from "$lib/certificates/objectResize";
	import { boxFromPoints, clickSelection, marqueeSelection, selectionBox } from "$lib/certificates/objectSelection";
	import type { Guide, SpacingMark } from "$lib/certificates/snapping";
	import type { DrawOp } from "$lib/certificates/render";
	import GuidesOverlay from "$lib/components/layoutEditor/GuidesOverlay.svelte";
	import SelectionOverlay, { HANDLE_CURSORS } from "$lib/components/layoutEditor/SelectionOverlay.svelte";
	import { isApplePlatform } from "$lib/components/shell/fileShortcuts";
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
		selectedIds: string[];
		/** Hilfslinien und gleiche Abstände beim Ziehen */
		guidesEnabled: boolean;
		onselect: (ids: string[]) => void;
		/** Geänderte Objekte; gleicher Schlüssel = ein Rückgängig-Schritt */
		onchange: (objects: LayoutObject[], key: string) => void;
		onshortcut: (shortcut: EditorShortcut) => void;
	}

	let {
		layout,
		ops,
		imageUrls,
		backgroundOpacity,
		withMemberNames,
		zoom,
		selectedIds,
		guidesEnabled,
		onselect,
		onchange,
		onshortcut
	}: Props = $props();

	const ALL_HANDLES = Object.keys(HANDLE_SIDES) as ResizeHandle[];
	const apple = typeof navigator !== "undefined" && isApplePlatform(navigator.userAgent);

	let svg = $state<SVGSVGElement | null>(null);
	let drag = $state.raw<(ObjectDrag & { pointerId: number; gesture: number }) | null>(null);
	let marquee = $state.raw<{ pointerId: number; start: PointMm; end: PointMm; base: string[] } | null>(null);
	let guides = $state.raw<Guide[]>([]);
	let spacings = $state.raw<SpacingMark[]>([]);

	const selected = $derived(layout.objects.filter((object) => selectedIds.includes(object.id)));
	const selectedBox = $derived(selectionBox(selected));
	const handles = $derived(selected.length === 1 ? resizeHandles(selected[0]) : ALL_HANDLES);
	const shownObjects = $derived(layout.objects.filter((object) => isShown(object, withMemberNames)));
	const missingImages = $derived(
		layout.objects.filter((object) => object.kind === "image" && imageUrls[object.slot] === undefined)
	);
	const marqueeBox = $derived(marquee && boxFromPoints(marquee.start, marquee.end));

	function dragCursor(mode: ObjectDrag["mode"] | undefined): string {
		if (mode === undefined) return "cursor-default";
		return mode === "move" ? "cursor-grabbing" : HANDLE_CURSORS[mode];
	}

	function toMm(event: PointerEvent | MouseEvent): PointMm {
		const matrix = svg?.getScreenCTM();
		if (!matrix) return { x: 0, y: 0 };
		const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
		return { x: point.x, y: point.y };
	}

	function beginDrag(mode: ObjectDrag["mode"], event: PointerEvent, objects: LayoutObject[]) {
		svg?.focus();
		svg?.setPointerCapture(event.pointerId);
		const ids = new Set(objects.map((object) => object.id));
		const others = shownObjects.filter((object) => !ids.has(object.id));
		drag = { mode, start: toMm(event), objects, others, pointerId: event.pointerId, gesture: ++gestures };
	}

	function handlePointerDown(event: PointerEvent) {
		if (event.button !== 0) return;
		svg?.focus();
		const start = toMm(event);
		const hit = objectAt(layout.objects, start, withMemberNames);
		const ids = clickSelection(layout.objects, selectedIds, hit?.id ?? null, {
			additive: event.shiftKey,
			single: event.altKey
		});
		onselect(ids);
		if (hit === null) {
			svg?.setPointerCapture(event.pointerId);
			marquee = { pointerId: event.pointerId, start, end: start, base: event.shiftKey ? ids : [] };
		} else if (!event.shiftKey && ids.includes(hit.id)) {
			beginDrag(
				"move",
				event,
				layout.objects.filter((object) => ids.includes(object.id))
			);
		}
	}

	function handlePointerMove(event: PointerEvent) {
		if (marquee?.pointerId === event.pointerId) marquee = { ...marquee, end: toMm(event) };
		if (drag?.pointerId !== event.pointerId) return;
		const frame = dragObjects(drag, toMm(event), { alt: event.altKey, shift: event.shiftKey }, guidesEnabled);
		guides = frame.guides;
		spacings = frame.spacings;
		onchange(frame.objects, gestureKey(drag.gesture));
	}

	function handlePointerUp(event: PointerEvent) {
		if (marquee?.pointerId === event.pointerId && marqueeBox) {
			const inside = marqueeSelection(layout.objects, marqueeBox, withMemberNames);
			onselect([...new Set([...marquee.base, ...inside])]);
		}
		if (marquee?.pointerId === event.pointerId) marquee = null;
		if (drag?.pointerId !== event.pointerId) return;
		drag = null;
		guides = [];
		spacings = [];
	}

	/** Doppelklick wählt ein einzelnes Gruppenmitglied. */
	function handleDoubleClick(event: MouseEvent) {
		const hit = objectAt(layout.objects, toMm(event), withMemberNames);
		if (hit) onselect([hit.id]);
	}

	function handleKeyDown(event: KeyboardEvent) {
		const shortcut = editorShortcut(event, apple);
		if (shortcut === null) return;
		event.preventDefault();
		onshortcut(shortcut);
	}
</script>

<div class="h-full w-full overflow-auto rounded-lg bg-muted/50 p-4">
	<!-- Zeichenfläche als eigenes Bedienelement: Maus und Tasten bearbeiten die Auswahl. -->
	<CertificatePageView
		bind:svg
		{ops}
		{imageUrls}
		{backgroundOpacity}
		role="application"
		aria-label="Urkunden-Vorschau. Element anklicken und ziehen oder mit den Pfeiltasten verschieben, Umschalt für 5 mm. Anfasser ändern die Größe. Rahmen aufziehen wählt mehrere Elemente. Entf löscht."
		tabindex={0}
		class={cn(
			"mx-auto block touch-none rounded-sm shadow-md outline-none select-none focus-visible:ring-3 focus-visible:ring-ring/50",
			zoom === "fit" ? "h-full" : "",
			dragCursor(drag?.mode)
		)}
		style={zoom === "actual" ? `width: ${PAGE_WIDTH_MM}mm` : undefined}
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointercancel={handlePointerUp}
		ondblclick={handleDoubleClick}
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
				class={selectedIds.includes(object.id) ? "stroke-primary stroke-2" : "stroke-primary/25 [stroke-dasharray:4_3]"}
			/>
		{/each}

		{#if selectedBox}
			<SelectionOverlay
				box={selectedBox}
				{handles}
				group={selected.length > 1}
				onhandledown={(handle, event) => beginDrag(handle, event, selected)}
			/>
		{/if}

		<GuidesOverlay {guides} {spacings} />

		{#if marqueeBox}
			<rect
				x={marqueeBox.xMm}
				y={marqueeBox.yMm}
				width={marqueeBox.widthMm}
				height={marqueeBox.heightMm}
				vector-effect="non-scaling-stroke"
				class="pointer-events-none fill-primary/5 stroke-primary/60 [stroke-dasharray:3_2]"
			/>
		{/if}
	</CertificatePageView>
</div>
