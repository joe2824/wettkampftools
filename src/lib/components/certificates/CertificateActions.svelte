<script lang="ts">
	import FileDownIcon from "@lucide/svelte/icons/file-down";
	import FileSpreadsheetIcon from "@lucide/svelte/icons/file-spreadsheet";
	import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
	import { toast } from "svelte-sonner";
	import type { CertificateMapData } from "$lib/certificates/mapRender";
	import type { CertificateEntry } from "$lib/certificates/model";
	import { layoutStore } from "$lib/certificates/layoutStore.svelte";
	import SaveResult from "$lib/components/SaveResult.svelte";
	import { Button } from "$lib/components/ui/button";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import { createCertificatesPdf, saveSerialLetter } from "$lib/workflows/certificates";
	import { YEAR_CONFIRMATION_HINT } from "$lib/workflows/results";
	import type { CompetitionKind } from "$lib/wwk/results";
	import PrintHints from "./PrintHints.svelte";

	interface Props {
		entries: CertificateEntry[];
		competition: CompetitionKind;
		pageCount: number;
		/** Gesperrt, solange die Ergebnisdatei nicht bestätigt ist. */
		locked?: boolean;
		/** Punkte der Deutschlandkarte; fehlt ohne Standortdaten. */
		map?: CertificateMapData;
	}

	let { entries, competition, pageCount, locked = false, map }: Props = $props();

	let busy = $state<"pdf" | "serialLetter" | null>(null);
	let pdfPath = $state<string | null>(null);
	let serialLetterPath = $state<string | null>(null);

	const empty = $derived(entries.length === 0);
	const blocked = $derived(empty || locked || busy !== null);
	const entryLabel = $derived(entries.length === 1 ? "1 Eintrag" : `${entries.length} Einträge`);
	const pageLabel = $derived(pageCount === 1 ? "1 Seite" : `${pageCount} Seiten`);

	function job() {
		return {
			entries,
			competition,
			settings: $state.snapshot(settingsStore.settings),
			layouts: $state.snapshot(layoutStore.layouts),
			images: layoutStore.images,
			map
		};
	}

	async function createPdf() {
		busy = "pdf";
		try {
			const outcome = await createCertificatesPdf(job());
			if (outcome.status === "failed") toast.error(outcome.message);
			if (outcome.status !== "saved") return;
			pdfPath = outcome.path;
			const description = outcome.opened
				? "Das PDF wird geöffnet."
				: "Das PDF konnte nicht automatisch geöffnet werden.";
			toast.success(`Urkunden gespeichert (${outcome.pageCount} Seiten)`, { description });
		} finally {
			busy = null;
		}
	}

	async function exportSerialLetter() {
		busy = "serialLetter";
		try {
			const outcome = await saveSerialLetter(job());
			if (outcome.status === "failed") toast.error(outcome.message);
			if (outcome.status !== "saved") return;
			serialLetterPath = outcome.path;
			toast.success("Seriendruck-Tabelle gespeichert");
		} finally {
			busy = null;
		}
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap items-center gap-4">
		<p class="text-lg font-semibold tabular-nums" aria-live="polite">{entryLabel} → {pageLabel}</p>
		<Button size="lg" disabled={blocked} onclick={createPdf}>
			{#if busy === "pdf"}
				<LoaderCircleIcon class="animate-spin" data-icon="inline-start" />
				PDF wird erzeugt …
			{:else}
				<FileDownIcon data-icon="inline-start" />
				PDF erzeugen &amp; öffnen
			{/if}
		</Button>
	</div>
	{#if locked}
		<p class="text-sm font-medium text-destructive">{YEAR_CONFIRMATION_HINT}</p>
	{:else if empty}
		<p class="text-sm text-muted-foreground">Mindestens einen Eintrag auswählen.</p>
	{/if}

	<SaveResult path={pdfPath} label="Urkunden gespeichert" />

	<PrintHints signaturesMissing={!layoutStore.images.signature1 || !layoutStore.images.signature2} />

	<div class="flex flex-col gap-2 border-t pt-4">
		<p class="text-sm text-muted-foreground">
			Notlösung: Tabelle für den Seriendruck mit der bisherigen Word-Vorlage, sortiert wie die Urkunden.
		</p>
		<Button variant="outline" class="self-start" disabled={blocked} onclick={exportSerialLetter}>
			{#if busy === "serialLetter"}
				<LoaderCircleIcon class="animate-spin" data-icon="inline-start" />
			{:else}
				<FileSpreadsheetIcon data-icon="inline-start" />
			{/if}
			Seriendruck-Tabelle für Word speichern
		</Button>
		<SaveResult path={serialLetterPath} label="Seriendruck-Tabelle gespeichert" />
	</div>
</div>
