<script lang="ts">
	import EyeOffIcon from "@lucide/svelte/icons/eye-off";
	import ImageIcon from "@lucide/svelte/icons/image";
	import TypeIcon from "@lucide/svelte/icons/type";
	import { isShown } from "$lib/certificates/editorOps";
	import type { LayoutObject } from "$lib/certificates/layout";
	import { cn } from "$lib/utils.js";

	interface Props {
		objects: LayoutObject[];
		selectedId: string | null;
		withMemberNames: boolean;
		/** Unterschriften, für die ein Bild hinterlegt ist. */
		availableSlots: ReadonlySet<string>;
		onselect: (id: string) => void;
	}

	let { objects, selectedId, withMemberNames, availableSlots, onselect }: Props = $props();

	function hint(object: LayoutObject): string | null {
		if (object.kind === "image") return availableSlots.has(object.slot) ? null : "kein Bild hinterlegt";
		if (object.visibleWhen === "withMemberNames") return "nur mit Mitgliedernamen";
		return null;
	}
</script>

<nav aria-label="Elemente der Urkunde" class="flex flex-col gap-1">
	<h2 class="px-2 pb-1 text-sm font-semibold text-muted-foreground">Elemente</h2>
	<ul class="flex flex-col gap-0.5">
		{#each objects as object (object.id)}
			{@const note = hint(object)}
			{@const hidden = !isShown(object, withMemberNames)}
			<li>
				<button
					type="button"
					aria-current={object.id === selectedId ? "true" : undefined}
					class={cn(
						"flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-start text-sm transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
						object.id === selectedId && "bg-primary/10 font-medium text-primary",
						hidden && "text-muted-foreground"
					)}
					onclick={() => onselect(object.id)}
				>
					{#if object.kind === "image"}
						<ImageIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
					{:else if hidden}
						<EyeOffIcon class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
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
		{/each}
	</ul>
</nav>
