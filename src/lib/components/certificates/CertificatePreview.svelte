<script lang="ts">
	import { onMount } from "svelte";
	import { SIGNATURE_SLOTS, type Layout } from "$lib/certificates/layout";
	import { layoutStore } from "$lib/certificates/layoutStore.svelte";
	import type { CertificateMapData } from "$lib/certificates/mapRender";
	import type { CertificatePage } from "$lib/certificates/model";
	import { Label } from "$lib/components/ui/label";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { Switch } from "$lib/components/ui/switch";
	import { previewOps } from "$lib/workflows/layoutEditor";
	import CertificatePageView from "./CertificatePageView.svelte";
	import {
		clampPage,
		hasMultiplePagesPerEntry,
		nextEntryPage,
		pageCaption,
		pageForKey,
		previousEntryPage
	} from "./certificatePreview";
	import FontsUnavailableAlert from "./FontsUnavailableAlert.svelte";
	import { ImageUrls } from "./imageUrls.svelte";
	import PreviewNavigation from "./PreviewNavigation.svelte";
	import { PreviewFonts } from "./previewFonts.svelte";

	interface Props {
		pages: CertificatePage[];
		/** Layout für die Art des Wettkampfs (Mannschaft oder Einzel). */
		layout: Layout;
		withMemberNames: boolean;
		/** Punkte der Deutschlandkarte; fehlt ohne Standortdaten. */
		map?: CertificateMapData;
	}

	let { pages, layout, withMemberNames, map }: Props = $props();

	const BACKGROUND_OPACITY = 0.5;

	let requested = $state(0);
	const fonts = new PreviewFonts();
	let showBackground = $state(false);
	const images = new ImageUrls();

	const index = $derived(clampPage(requested, pages.length));
	const page = $derived(pages[index]);
	const availableSlots = $derived(new Set(SIGNATURE_SLOTS.filter((slot) => layoutStore.images[slot] !== null)));
	// Nur die aktuelle Seite berechnen; ohne Druckversatz.
	const ops = $derived(
		fonts.metrics && page
			? previewOps(layout, page.values, { withMemberNames, availableSlots, map }, fonts.metrics)
			: []
	);
	const caption = $derived(pageCaption(pages, index));
	// Sprung von Platz zu Platz lohnt nur bei mehreren Urkunden je Eintrag.
	const entryJumps = $derived(hasMultiplePagesPerEntry(pages));
	const previousEntry = $derived(entryJumps ? previousEntryPage(pages, index) : null);
	const nextEntry = $derived(entryJumps ? nextEntryPage(pages, index) : null);
	const hasBackground = $derived(images.urls.background !== undefined);

	onMount(() => {
		void fonts.load();
		return images.track(() => layoutStore.images);
	});

	function handleKeyDown(event: KeyboardEvent) {
		const target = pageForKey(event.key, index, pages);
		if (target === null) return;
		event.preventDefault();
		requested = target;
	}
</script>

<div class="flex flex-col gap-4">
	<PreviewNavigation
		{index}
		count={pages.length}
		{previousEntry}
		{nextEntry}
		onchange={(next) => (requested = clampPage(next, pages.length))}
	/>

	<p class="text-center text-sm font-medium" aria-live="polite">{caption}</p>

	{#if fonts.failed}
		<FontsUnavailableAlert />
	{:else}
		<!-- Mit Fokus blättern die Pfeiltasten durch die Seiten. -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
		<div
			class="rounded-lg bg-muted/50 p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
			role="group"
			aria-label="Urkunden-Vorschau. Mit den Pfeiltasten blättern, mit Bild auf und ab von Platz zu Platz springen."
			tabindex="0"
			onkeydown={handleKeyDown}
		>
			{#if fonts.metrics === null}
				<Skeleton class="mx-auto aspect-210/297 h-[min(70vh,48rem)] max-w-full" />
			{:else}
				<CertificatePageView
					{ops}
					imageUrls={images.urls}
					backgroundOpacity={showBackground ? BACKGROUND_OPACITY : null}
					class="mx-auto block h-[min(70vh,48rem)] max-w-full rounded-sm shadow-md"
					aria-hidden="true"
				/>
			{/if}
		</div>
	{/if}

	{#if hasBackground}
		<div class="flex items-center gap-2">
			<Switch id="preview-background" bind:checked={showBackground} />
			<Label for="preview-background" class="font-normal">Hintergrund-Scan einblenden (wird nicht gedruckt)</Label>
		</div>
	{/if}
</div>
