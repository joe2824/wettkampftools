<script lang="ts">
	import { beforeNavigate } from "$app/navigation";
	import { onMount } from "svelte";
	import { toast } from "svelte-sonner";
	import { updateObject, type ObjectPatch } from "$lib/certificates/editorOps";
	import type { EditorShortcut } from "$lib/certificates/editorShortcuts";
	import { SIGNATURE_SLOTS, type LayoutObject, type LayoutVariant } from "$lib/certificates/layout";
	import { layoutStore } from "$lib/certificates/layoutStore.svelte";
	import { missingSignatureSlots } from "$lib/certificates/layoutObjects";
	import { isMapEnabled } from "$lib/certificates/mapObject";
	import { canDistribute, type AlignReference } from "$lib/certificates/objectAlign";
	import { canGroup, canUngroup, selectionUnits } from "$lib/certificates/objectGroups";
	import { selectAll, toggleSelection } from "$lib/certificates/objectSelection";
	import FontsUnavailableAlert from "$lib/components/certificates/FontsUnavailableAlert.svelte";
	import { ImageUrls } from "$lib/components/certificates/imageUrls.svelte";
	import LayoutCanvas, { type CanvasZoom } from "$lib/components/certificates/LayoutCanvas.svelte";
	import LayoutToolbar from "$lib/components/certificates/LayoutToolbar.svelte";
	import { MapLocations } from "$lib/components/certificates/mapLocations.svelte";
	import ObjectList from "$lib/components/certificates/ObjectList.svelte";
	import { PreviewFonts } from "$lib/components/certificates/previewFonts.svelte";
	import PropertiesPanel from "$lib/components/certificates/PropertiesPanel.svelte";
	import AddObjectMenu from "$lib/components/layoutEditor/AddObjectMenu.svelte";
	import BackgroundControls from "$lib/components/layoutEditor/BackgroundControls.svelte";
	import { LayoutEditorSession } from "$lib/components/layoutEditor/editorSession.svelte";
	import MapControls from "$lib/components/layoutEditor/MapControls.svelte";
	import PreviewOptions from "$lib/components/layoutEditor/PreviewOptions.svelte";
	import SelectionActions from "$lib/components/layoutEditor/SelectionActions.svelte";
	import UndoControls from "$lib/components/layoutEditor/UndoControls.svelte";
	import { isApplePlatform } from "$lib/components/shell/fileShortcuts";
	import { readStoredFlag, writeStoredFlag } from "$lib/components/storedFlag";
	import * as Card from "$lib/components/ui/card";
	import { Separator } from "$lib/components/ui/separator";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { session as competition } from "$lib/session.svelte";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import { participantNames } from "$lib/workflows/certificateMap";
	import { layoutSnapshot, previewOps, sampleValues, saveLayoutEditor } from "$lib/workflows/layoutEditor";

	const LEAVE_QUESTION = "Es gibt ungespeicherte Änderungen am Layout. Seite trotzdem verlassen?";
	const VARIANT_NAMES: Record<LayoutVariant, string> = { team: "Mannschaft", individual: "Einzel" };
	const PERCENT = 100;
	const DEFAULT_OPACITY_PERCENT = 50;
	const GUIDES_KEY = "layoutEditor.guides";
	const MEMBER_NAMES_KEY = "layoutEditor.memberNames";
	const MODIFIER = typeof navigator !== "undefined" && isApplePlatform(navigator.userAgent) ? "⌘" : "Strg+";

	const editor = new LayoutEditorSession();
	let withMemberNames = $state(readStoredFlag(MEMBER_NAMES_KEY, true));
	let zoom = $state<CanvasZoom>("fit");
	let guides = $state(readStoredFlag(GUIDES_KEY, true));
	let alignReference = $state<AlignReference>("selection");
	let backgroundVisible = $state(true);
	let opacityPercent = $state(DEFAULT_OPACITY_PERCENT);
	const fonts = new PreviewFonts();
	let savedSnapshot = $state(layoutSnapshot(layoutStore.layouts));
	const images = new ImageUrls();
	const locations = new MapLocations();

	const layout = $derived(editor.layout);
	const selected = $derived(editor.selected);
	const availableSlots = $derived(new Set(SIGNATURE_SLOTS.filter((slot) => layoutStore.images[slot] !== null)));
	const values = $derived(sampleValues(editor.variant, settingsStore.settings.event));
	const map = $derived(locations.mapData(participantNames(competition.results, competition.registration)));
	const ops = $derived(
		fonts.metrics ? previewOps(layout, values, { withMemberNames, availableSlots, map }, fonts.metrics) : []
	);
	const dirty = $derived(layoutSnapshot(layoutStore.layouts) !== savedSnapshot || settingsStore.dirty);
	const backgroundOpacity = $derived(backgroundVisible ? opacityPercent / PERCENT : null);

	onMount(() => {
		void fonts.load();
		void locations.load();
		return images.track(() => layoutStore.images);
	});

	$effect(() => writeStoredFlag(GUIDES_KEY, guides));
	$effect(() => writeStoredFlag(MEMBER_NAMES_KEY, withMemberNames));

	// Schließen des Fensters ist ausgenommen: dort gibt es keine eigene Rückfrage.
	beforeNavigate(({ cancel, type }) => {
		if (type === "leave" || !dirty) return;
		if (!confirm(LEAVE_QUESTION)) cancel();
	});

	function patchSelected(patch: ObjectPatch) {
		const [object] = selected;
		if (object) editor.commitObjects([updateObject(object, patch)], `${editor.variant}:${object.id}`);
	}

	function runShortcut(shortcut: EditorShortcut) {
		if (shortcut.kind === "nudge") editor.nudge(shortcut.delta);
		else if (shortcut.kind === "deselect") editor.select([]);
		else if (shortcut.kind === "selectAll") editor.select(selectAll(layout.objects, withMemberNames));
		else if (shortcut.kind === "delete") editor.remove();
		else if (shortcut.kind === "duplicate") editor.duplicate();
		else if (shortcut.kind === "group") editor.group();
		else editor.ungroup();
	}

	function selectFromList(ids: string[], additive: boolean) {
		editor.select(additive ? toggleSelection(layout.objects, editor.selectedIds, ids) : ids);
	}

	async function save() {
		await saveLayoutEditor(layoutStore, settingsStore);
		savedSnapshot = layoutSnapshot(layoutStore.layouts);
	}

	function reset() {
		layoutStore.resetVariant(editor.variant);
		editor.select([]);
		toast.info(`Standard für „${VARIANT_NAMES[editor.variant]}“ eingesetzt`, {
			description: "Zum Übernehmen bitte speichern."
		});
	}
</script>

<div class="flex flex-col gap-4">
	<header class="flex flex-col gap-1">
		<h1 class="text-2xl font-bold">Urkunden-Layout</h1>
		<p class="text-muted-foreground">
			Texte und Unterschriften auf der Urkunde platzieren. Die Vorschau zeigt Beispieldaten genau so, wie sie gedruckt
			werden.
		</p>
	</header>

	<div class="flex flex-wrap items-center justify-between gap-2">
		<LayoutToolbar bind:variant={editor.variant} {dirty} onsave={save} onreset={reset} />
		<UndoControls
			canUndo={editor.canUndo}
			canRedo={editor.canRedo}
			onundo={() => editor.undo()}
			onredo={() => editor.redo()}
		/>
	</div>

	<div class="grid gap-4 lg:grid-cols-[13rem_minmax(0,1fr)_19rem]">
		<Card.Root class="lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto">
			<Card.Content class="flex flex-col gap-4">
				<PreviewOptions bind:withMemberNames bind:zoom bind:guides />
				<Separator />
				<BackgroundControls bind:visible={backgroundVisible} bind:opacityPercent />
				<Separator />
				<MapControls
					enabled={isMapEnabled(layout)}
					locationsAvailable={!locations.loaded || locations.available}
					pointCount={map?.markers.length ?? 0}
					onchange={(enabled) => editor.setMap(enabled)}
				/>
				<Separator />
				<AddObjectMenu
					missingSlots={missingSignatureSlots(layout)}
					mapAvailable={!isMapEnabled(layout)}
					ontext={(template) => editor.addText(template)}
					onsignature={(slot) => editor.addSignature(slot)}
					onmap={() => editor.setMap(true)}
				/>
				<ObjectList
					objects={layout.objects}
					selectedIds={editor.selectedIds}
					{withMemberNames}
					{availableSlots}
					onselect={selectFromList}
				/>
			</Card.Content>
		</Card.Root>

		<div class="h-[calc(100vh-14rem)] min-h-128">
			{#if fonts.failed}
				<FontsUnavailableAlert />
			{:else if fonts.metrics === null}
				<Skeleton class="mx-auto aspect-210/297 h-full" />
			{:else}
				<LayoutCanvas
					{layout}
					{ops}
					imageUrls={images.urls}
					{backgroundOpacity}
					{withMemberNames}
					{zoom}
					selectedIds={editor.selectedIds}
					guidesEnabled={guides}
					onselect={(ids) => editor.select(ids)}
					onchange={(objects, key) => editor.commitObjects(objects, key)}
					onshortcut={runShortcut}
				/>
			{/if}
		</div>

		<Card.Root class="lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto">
			<Card.Content class="flex flex-col gap-4">
				{#if selected.length > 0}
					<SelectionActions
						count={selected.length}
						multiple={selectionUnits(selected).length > 1}
						bind:reference={alignReference}
						canGroup={canGroup(selected)}
						canUngroup={canUngroup(selected)}
						canDistribute={canDistribute(selected)}
						canDuplicate={selected.some((object: LayoutObject) => object.kind === "text")}
						modifier={MODIFIER}
						onalign={(edge) => editor.align(edge, alignReference)}
						ondistribute={(axis) => editor.distribute(axis)}
						ongroup={() => editor.group()}
						onungroup={() => editor.ungroup()}
						onduplicate={() => editor.duplicate()}
						onremove={() => editor.remove()}
					/>
					<Separator />
				{/if}
				<PropertiesPanel
					object={selected.length === 1 ? selected[0] : null}
					count={selected.length}
					onchange={patchSelected}
				/>
			</Card.Content>
		</Card.Root>
	</div>
</div>
