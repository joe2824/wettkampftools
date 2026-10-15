<script lang="ts">
	import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";
	import { onMount } from "svelte";
	import { createMetrics, type TextMetrics } from "$lib/certificates/fonts";
	import { SIGNATURE_SLOTS, type Layout } from "$lib/certificates/layout";
	import { layoutStore } from "$lib/certificates/layoutStore.svelte";
	import type { CertificatePage } from "$lib/certificates/model";
	import * as Alert from "$lib/components/ui/alert";
	import { Label } from "$lib/components/ui/label";
	import { Skeleton } from "$lib/components/ui/skeleton";
	import { Switch } from "$lib/components/ui/switch";
	import { loadAppFonts } from "$lib/platform/assets";
	import { previewOps } from "$lib/workflows/layoutEditor";
	import CertificatePageView from "./CertificatePageView.svelte";
	import { clampPage, pageCaption, pageForKey } from "./certificatePreview";
	import { ImageUrls } from "./imageUrls.svelte";
	import PreviewNavigation from "./PreviewNavigation.svelte";

	interface Props {
		pages: CertificatePage[];
		/** Layout für die Art des Wettkampfs (Mannschaft oder Einzel). */
		layout: Layout;
		withMemberNames: boolean;
	}

	let { pages, layout, withMemberNames }: Props = $props();

	const BACKGROUND_OPACITY = 0.5;

	let requested = $state(0);
	let metrics = $state.raw<TextMetrics | null>(null);
	let fontsFailed = $state(false);
	let showBackground = $state(false);
	const images = new ImageUrls();

	const index = $derived(clampPage(requested, pages.length));
	const page = $derived(pages[index]);
	const availableSlots = $derived(new Set(SIGNATURE_SLOTS.filter((slot) => layoutStore.images[slot] !== null)));
	// Nur die aktuelle Seite berechnen; ohne Druckversatz.
	const ops = $derived(
		metrics && page ? previewOps(layout, page.values, { withMemberNames, availableSlots }, metrics) : []
	);
	const caption = $derived(pageCaption(pages, index));
	const hasBackground = $derived(images.urls.background !== undefined);

	onMount(() => {
		loadAppFonts().then(
			(fonts) => (metrics = createMetrics(fonts)),
			() => (fontsFailed = true)
		);
		return images.track(() => layoutStore.images);
	});

	function handleKeyDown(event: KeyboardEvent) {
		const target = pageForKey(event.key, index, pages.length);
		if (target === null) return;
		event.preventDefault();
		requested = target;
	}
</script>

<div class="flex flex-col gap-4">
	<PreviewNavigation {index} count={pages.length} onchange={(next) => (requested = clampPage(next, pages.length))} />

	<p class="text-center text-sm font-medium" aria-live="polite">{caption}</p>

	{#if fontsFailed}
		<Alert.Root variant="destructive">
			<CircleAlertIcon />
			<Alert.Title>Vorschau nicht verfügbar</Alert.Title>
			<Alert.Description>Die Schriftdateien konnten nicht geladen werden. Bitte das Programm neu starten.</Alert.Description>
		</Alert.Root>
	{:else}
		<!-- Mit Fokus blättern die Pfeiltasten durch die Seiten. -->
		<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
		<div
			class="rounded-lg bg-muted/50 p-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
			role="group"
			aria-label="Urkunden-Vorschau. Mit den Pfeiltasten blättern."
			tabindex="0"
			onkeydown={handleKeyDown}
		>
			{#if metrics === null}
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
