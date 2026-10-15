<script lang="ts">
	import EyeOffIcon from "@lucide/svelte/icons/eye-off";
	import GroupIcon from "@lucide/svelte/icons/group";
	import ImageIcon from "@lucide/svelte/icons/image";
	import MapIcon from "@lucide/svelte/icons/map";
	import TypeIcon from "@lucide/svelte/icons/type";
	import { isShown } from "$lib/certificates/editorOps";
	import type { LayoutObject } from "$lib/certificates/layout";
	import { listRows } from "$lib/certificates/objectGroups";
	import { cn } from "$lib/utils.js";

	interface Props {
		objects: LayoutObject[];
		selectedIds: string[];
		withMemberNames: boolean;
		/** Unterschriften, für die ein Bild hinterlegt ist. */
		availableSlots: ReadonlySet<string>;
		/** Gewählte Kennungen; Umschalt fügt hinzu */
		onselect: (ids: string[], additive: boolean) => void;
	}

	let { objects, selectedIds, withMemberNames, availableSlots, onselect }: Props = $props();

	const rows = $derived(listRows(objects));
	const ROW_CLASS =
		"flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-start text-sm transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none";
	const isSelected = (ids: string[]) => ids.every((id) => selectedIds.includes(id));

	function hint(object: LayoutObject): string | null {
		if (object.kind === "image") return availableSlots.has(object.slot) ? null : "kein Bild hinterlegt";
		if (object.kind === "map") return object.visible === false ? "ausgeschaltet" : null;
		if (object.visibleWhen === "withMemberNames") return "nur mit Mitgliedernamen";
		return null;
	}
</script>

<nav aria-label="Elemente der Urkunde" class="flex flex-col gap-1">
	<h2 class="px-2 pb-1 text-sm font-semibold text-muted-foreground">Elemente</h2>
	<ul class="flex flex-col gap-0.5">
		{#each rows as row (row.type === "group" ? `group:${row.groupId}` : row.object.id)}
			{#if row.type === "group"}
				<li>
					<button
						type="button"
						aria-current={isSelected(row.ids) ? "true" : undefined}
						class={cn(ROW_CLASS, isSelected(row.ids) && "bg-primary/10 font-medium text-primary")}
						onclick={(event) => onselect(row.ids, event.shiftKey)}
					>
						<GroupIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
						<span class="truncate">Gruppe ({row.ids.length} Elemente)</span>
					</button>
				</li>
			{:else}
				{@const object = row.object}
				{@const note = hint(object)}
				{@const hidden = !isShown(object, withMemberNames)}
				{@const selected = selectedIds.includes(object.id)}
				<li class={row.nested ? "ms-4 border-s ps-1" : undefined}>
					<button
						type="button"
						aria-current={selected ? "true" : undefined}
						class={cn(
							ROW_CLASS,
							selected && "bg-primary/10 font-medium text-primary",
							hidden && "text-muted-foreground"
						)}
						onclick={(event) => onselect([object.id], event.shiftKey)}
					>
						{#if object.kind === "image"}
							<ImageIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
						{:else if hidden}
							<EyeOffIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
						{:else if object.kind === "map"}
							<MapIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
						{:else}
							<TypeIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
						{/if}
						<span class="flex min-w-0 flex-col">
							<span class="truncate">{object.label || object.id}</span>
							{#if note}
								<span class="text-xs font-normal text-muted-foreground">{note}</span>
							{/if}
						</span>
					</button>
				</li>
			{/if}
		{/each}
	</ul>
</nav>
