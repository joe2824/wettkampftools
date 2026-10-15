<script lang="ts">
	import { beforeNavigate } from "$app/navigation";
	import { onMount } from "svelte";
	import { toast } from "svelte-sonner";
	import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";
	import { canRedo, canUndo, emptyHistory, record, redo, undo, type HistoryStep } from "$lib/certificates/editHistory";
	import { updateObject, replaceObject, type ObjectPatch } from "$lib/certificates/editorOps";
	import { createMetrics, type TextMetrics } from "$lib/certificates/fonts";
	import { SIGNATURE_SLOTS, type LayoutObject, type LayoutVariant } from "$lib/certificates/layout";
	import { layoutStore } from "$lib/certificates/layoutStore.svelte";
	import { ImageUrls } from "$lib/components/certificates/imageUrls.svelte";
	import LayoutCanvas, { type CanvasZoom } from "$lib/components/certificates/LayoutCanvas.svelte";
	import LayoutToolbar from "$lib/components/certificates/LayoutToolbar.svelte";
	import ObjectList from "$lib/components/certificates/ObjectList.svelte";
	import PropertiesPanel from "$lib/components/certificates/PropertiesPanel.svelte";
	import BackgroundControls from "$lib/components/layoutEditor/BackgroundControls.svelte";
	import PreviewOptions from "$lib/components/layoutEditor/PreviewOptions.svelte";
	import UndoControls from "$lib/components/layoutEditor/UndoControls.svelte";
	import * as Alert from "$lib/components/ui/alert";
	import * as Card from "$lib/components/ui/card";
	import { Separator } from "$lib/components/ui/separator";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { loadAppFonts } from "$lib/platform/assets";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import { layoutSnapshot, previewOps, sampleValues, saveLayoutEditor } from "$lib/workflows/layoutEditor";

	const LEAVE_QUESTION = "Es gibt ungespeicherte Änderungen am Layout. Seite trotzdem verlassen?";
	const VARIANT_NAMES: Record<LayoutVariant, string> = { team: "Mannschaft", individual: "Einzel" };
	const PERCENT = 100;
	const DEFAULT_OPACITY_PERCENT = 50;

	let variant = $state<LayoutVariant>("team");
	let selectedId = $state<string | null>(null);
	let withMemberNames = $state(true);
	let zoom = $state<CanvasZoom>("fit");
	let backgroundVisible = $state(true);
	let opacityPercent = $state(DEFAULT_OPACITY_PERCENT);
	let metrics = $state.raw<TextMetrics | null>(null);
	let fontsFailed = $state(false);
	let savedSnapshot = $state(layoutSnapshot(layoutStore.layouts));
	const images = new ImageUrls();
	let history = $state.raw(emptyHistory());
	// Zuletzt gesehener Stand; Änderungen dagegen landen im Verlauf.
	let currentSnapshot = layoutSnapshot(layoutStore.layouts);
	let changeKey = "other";
	let applyingHistory = false;

	const layout = $derived(layoutStore.layouts[variant]);
	const selected = $derived(layout.objects.find((object) => object.id === selectedId) ?? null);
	const availableSlots = $derived(new Set(SIGNATURE_SLOTS.filter((slot) => layoutStore.images[slot] !== null)));
	const values = $derived(sampleValues(variant, settingsStore.settings.event));
	const ops = $derived(metrics ? previewOps(layout, values, { withMemberNames, availableSlots }, metrics) : []);
	const dirty = $derived(layoutSnapshot(layoutStore.layouts) !== savedSnapshot || settingsStore.dirty);
	const backgroundOpacity = $derived(backgroundVisible ? opacityPercent / PERCENT : null);

	onMount(() => {
		loadAppFonts().then(
			(fonts) => (metrics = createMetrics(fonts)),
			() => (fontsFailed = true)
		);
		return images.track(() => layoutStore.images);
	});

	// Jede Layout-Änderung (Bearbeiten, Import, Zurücksetzen) wird für Rückgängig gemerkt.
	$effect(() => {
		const snapshot = layoutSnapshot(layoutStore.layouts);
		if (snapshot === currentSnapshot) return;
		if (!applyingHistory) history = record(history, currentSnapshot, changeKey, Date.now());
		currentSnapshot = snapshot;
		applyingHistory = false;
		changeKey = "other";
	});

	function applyStep(step: HistoryStep) {
		if (step.snapshot === null) return;
		history = step.history;
		applyingHistory = true;
		layoutStore.layouts = JSON.parse(step.snapshot);
	}

	// Schließen des Fensters ist ausgenommen: dort gibt es keine eigene Rückfrage.
	beforeNavigate(({ cancel, type }) => {
		if (type === "leave" || !dirty) return;
		if (!confirm(LEAVE_QUESTION)) cancel();
	});

	function commit(object: LayoutObject) {
		changeKey = `${variant}:${object.id}`;
		layoutStore.layouts[variant] = replaceObject(layout, object);
	}

	function patchSelected(patch: ObjectPatch) {
		if (selected) commit(updateObject(selected, patch));
	}

	async function save() {
		await saveLayoutEditor(layoutStore, settingsStore);
		savedSnapshot = layoutSnapshot(layoutStore.layouts);
	}

	function reset() {
		layoutStore.resetVariant(variant);
		selectedId = null;
		toast.info(`Standard für „${VARIANT_NAMES[variant]}“ eingesetzt`, { description: "Zum Übernehmen bitte speichern." });
	}
</script>

<div class="flex flex-col gap-4">
	<header class="flex flex-col gap-1">
		<h1 class="text-2xl font-bold">Urkunden-Layout</h1>
		<p class="text-muted-foreground">
			Texte und Unterschriften auf der Urkunde platzieren. Die Vorschau zeigt Beispieldaten genau so, wie sie
			gedruckt werden.
		</p>
	</header>

	<div class="flex flex-wrap items-center justify-between gap-2">
		<LayoutToolbar bind:variant {dirty} onsave={save} onreset={reset} />
		<UndoControls
			canUndo={canUndo(history)}
			canRedo={canRedo(history)}
			onundo={() => applyStep(undo(history, currentSnapshot))}
			onredo={() => applyStep(redo(history, currentSnapshot))}
		/>
	</div>

	<div class="grid gap-4 lg:grid-cols-[13rem_minmax(0,1fr)_19rem]">
		<Card.Root class="lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto">
			<Card.Content class="flex flex-col gap-4">
				<PreviewOptions bind:withMemberNames bind:zoom />
				<Separator />
				<BackgroundControls bind:visible={backgroundVisible} bind:opacityPercent />
				<Separator />
				<ObjectList
					objects={layout.objects}
					{selectedId}
					{withMemberNames}
					{availableSlots}
					onselect={(id) => (selectedId = id)}
				/>
			</Card.Content>
		</Card.Root>

		<div class="h-[calc(100vh-14rem)] min-h-128">
			{#if fontsFailed}
				<Alert.Root variant="destructive">
					<CircleAlertIcon />
					<Alert.Title>Vorschau nicht verfügbar</Alert.Title>
					<Alert.Description>
						Die Schriftdateien konnten nicht geladen werden. Bitte das Programm neu starten.
					</Alert.Description>
				</Alert.Root>
			{:else if metrics === null}
				<Skeleton class="mx-auto aspect-210/297 h-full" />
			{:else}
				<LayoutCanvas
					{layout}
					{ops}
					imageUrls={images.urls}
					{backgroundOpacity}
					{withMemberNames}
					{zoom}
					{selectedId}
					onselect={(id) => (selectedId = id)}
					onchange={commit}
				/>
			{/if}
		</div>

		<Card.Root class="lg:max-h-[calc(100vh-14rem)] lg:overflow-y-auto">
			<Card.Content>
				<PropertiesPanel object={selected} onchange={patchSelected} />
			</Card.Content>
		</Card.Root>
	</div>
</div>
