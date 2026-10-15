<script lang="ts">
	import BracesIcon from "@lucide/svelte/icons/braces";
	import ImageIcon from "@lucide/svelte/icons/image";
	import MapIcon from "@lucide/svelte/icons/map";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import TypeIcon from "@lucide/svelte/icons/type";
	import type { SignatureSlot } from "$lib/certificates/layout";
	import { PLACEHOLDERS } from "$lib/certificates/layoutTemplate";
	import { Button } from "$lib/components/ui/button";
	import * as DropdownMenu from "$lib/components/ui/dropdown-menu";

	interface Props {
		/** Unterschriften, die im Layout fehlen */
		missingSlots: SignatureSlot[];
		mapAvailable: boolean;
		ontext: (template?: string) => void;
		onsignature: (slot: SignatureSlot) => void;
		onmap: () => void;
	}

	let { missingSlots, mapAvailable, ontext, onsignature, onmap }: Props = $props();

	const SLOT_LABELS: Record<SignatureSlot, string> = { signature1: "Unterschrift 1", signature2: "Unterschrift 2" };
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="outline" size="sm" class="w-full">
				<PlusIcon data-icon="inline-start" />
				Element hinzufügen
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="start" class="w-60">
		<DropdownMenu.Item onSelect={() => ontext()}>
			<TypeIcon />
			Textfeld
		</DropdownMenu.Item>
		<DropdownMenu.Sub>
			<DropdownMenu.SubTrigger>
				<BracesIcon />
				Platzhalter-Feld
			</DropdownMenu.SubTrigger>
			<DropdownMenu.SubContent class="max-h-80 w-64 overflow-y-auto">
				{#each PLACEHOLDERS as placeholder (placeholder.key)}
					<DropdownMenu.Item onSelect={() => ontext(placeholder.token)}>{placeholder.description}</DropdownMenu.Item>
				{/each}
			</DropdownMenu.SubContent>
		</DropdownMenu.Sub>
		{#if missingSlots.length > 0 || mapAvailable}
			<DropdownMenu.Separator />
		{/if}
		{#each missingSlots as slot (slot)}
			<DropdownMenu.Item onSelect={() => onsignature(slot)}>
				<ImageIcon />
				{SLOT_LABELS[slot]}
			</DropdownMenu.Item>
		{/each}
		{#if mapAvailable}
			<DropdownMenu.Item onSelect={onmap}>
				<MapIcon />
				Deutschlandkarte
			</DropdownMenu.Item>
		{/if}
	</DropdownMenu.Content>
</DropdownMenu.Root>
