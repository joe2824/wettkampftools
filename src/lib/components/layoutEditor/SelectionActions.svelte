<script lang="ts">
	import AlignCenterHorizontalIcon from "@lucide/svelte/icons/align-center-horizontal";
	import AlignCenterVerticalIcon from "@lucide/svelte/icons/align-center-vertical";
	import AlignEndHorizontalIcon from "@lucide/svelte/icons/align-end-horizontal";
	import AlignEndVerticalIcon from "@lucide/svelte/icons/align-end-vertical";
	import AlignHorizontalSpaceAroundIcon from "@lucide/svelte/icons/align-horizontal-space-around";
	import AlignStartHorizontalIcon from "@lucide/svelte/icons/align-start-horizontal";
	import AlignStartVerticalIcon from "@lucide/svelte/icons/align-start-vertical";
	import AlignVerticalSpaceAroundIcon from "@lucide/svelte/icons/align-vertical-space-around";
	import CopyPlusIcon from "@lucide/svelte/icons/copy-plus";
	import GroupIcon from "@lucide/svelte/icons/group";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import UngroupIcon from "@lucide/svelte/icons/ungroup";
	import type { Axis } from "$lib/certificates/editorOps";
	import type { AlignEdge, AlignReference } from "$lib/certificates/objectAlign";
	import { Button } from "$lib/components/ui/button";
	import * as ToggleGroup from "$lib/components/ui/toggle-group";

	// Werkzeuge für die Auswahl: ausrichten, verteilen, gruppieren, duplizieren, entfernen.
	interface Props {
		count: number;
		/** Mehrere Einheiten: Bezug Seite oder Auswahl wählbar */
		multiple: boolean;
		reference: AlignReference;
		canGroup: boolean;
		canUngroup: boolean;
		canDistribute: boolean;
		canDuplicate: boolean;
		/** Kürzel-Taste: „⌘“ oder „Strg+“ */
		modifier: string;
		onalign: (edge: AlignEdge) => void;
		ondistribute: (axis: Axis) => void;
		ongroup: () => void;
		onungroup: () => void;
		onduplicate: () => void;
		onremove: () => void;
	}

	let { reference = $bindable(), ...props }: Props = $props();

	const ALIGNMENTS: { edge: AlignEdge; label: string; icon: typeof GroupIcon }[] = [
		{ edge: "left", label: "Links ausrichten", icon: AlignStartVerticalIcon },
		{ edge: "centerX", label: "Horizontal zentrieren", icon: AlignCenterVerticalIcon },
		{ edge: "right", label: "Rechts ausrichten", icon: AlignEndVerticalIcon },
		{ edge: "top", label: "Oben ausrichten", icon: AlignStartHorizontalIcon },
		{ edge: "centerY", label: "Vertikal zentrieren", icon: AlignCenterHorizontalIcon },
		{ edge: "bottom", label: "Unten ausrichten", icon: AlignEndHorizontalIcon }
	];
	const DISTRIBUTIONS: { axis: Axis; label: string; icon: typeof GroupIcon }[] = [
		{ axis: "x", label: "Horizontal gleichmäßig verteilen", icon: AlignHorizontalSpaceAroundIcon },
		{ axis: "y", label: "Vertikal gleichmäßig verteilen", icon: AlignVerticalSpaceAroundIcon }
	];
</script>

<section aria-label="Auswahl bearbeiten" class="flex flex-col gap-3">
	<div class="flex items-center justify-between gap-2">
		<h2 class="text-sm font-semibold">
			{props.count === 1 ? "Ausrichten" : `${props.count} Elemente gewählt`}
		</h2>
		{#if props.multiple}
			<ToggleGroup.Root
				type="single"
				variant="outline"
				size="sm"
				aria-label="Ausrichten an"
				value={reference}
				onValueChange={(value) => value && (reference = value as AlignReference)}
			>
				<ToggleGroup.Item value="page" class="px-2 text-xs">an Seite</ToggleGroup.Item>
				<ToggleGroup.Item value="selection" class="px-2 text-xs">an Auswahl</ToggleGroup.Item>
			</ToggleGroup.Root>
		{/if}
	</div>

	<div class="flex flex-wrap gap-1" role="group" aria-label="Ausrichten">
		{#each ALIGNMENTS as alignment (alignment.edge)}
			<Button
				variant="outline"
				size="icon-sm"
				title={alignment.label}
				aria-label={alignment.label}
				onclick={() => props.onalign(alignment.edge)}
			>
				<alignment.icon />
			</Button>
		{/each}
		{#each DISTRIBUTIONS as distribution (distribution.axis)}
			<Button
				variant="outline"
				size="icon-sm"
				title={`${distribution.label} (ab drei Elementen)`}
				aria-label={distribution.label}
				disabled={!props.canDistribute}
				onclick={() => props.ondistribute(distribution.axis)}
			>
				<distribution.icon />
			</Button>
		{/each}
	</div>

	<div class="flex flex-wrap gap-1">
		{#if props.canUngroup}
			<Button
				variant="outline"
				size="sm"
				title={`Gruppe auflösen (${props.modifier}Umschalt+G)`}
				onclick={props.onungroup}
			>
				<UngroupIcon data-icon="inline-start" />
				Gruppe auflösen
			</Button>
		{/if}
		{#if props.canGroup}
			<Button variant="outline" size="sm" title={`Gruppieren (${props.modifier}G)`} onclick={props.ongroup}>
				<GroupIcon data-icon="inline-start" />
				Gruppieren
			</Button>
		{/if}
		<Button
			variant="outline"
			size="sm"
			title={`Duplizieren (${props.modifier}D) – nur Texte`}
			disabled={!props.canDuplicate}
			onclick={props.onduplicate}
		>
			<CopyPlusIcon data-icon="inline-start" />
			Duplizieren
		</Button>
		<Button variant="outline" size="sm" title="Element entfernen (Entf)" onclick={props.onremove}>
			<Trash2Icon data-icon="inline-start" />
			{props.count === 1 ? "Element entfernen" : "Entfernen"}
		</Button>
	</div>
</section>
