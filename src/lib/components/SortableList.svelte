<script lang="ts">
	import ArrowDownIcon from "@lucide/svelte/icons/arrow-down";
	import ArrowUpIcon from "@lucide/svelte/icons/arrow-up";
	import GripVerticalIcon from "@lucide/svelte/icons/grip-vertical";
	import ListIcon from "@lucide/svelte/icons/list";
	import TextIcon from "@lucide/svelte/icons/text";
	import PlusIcon from "@lucide/svelte/icons/plus";
	import Trash2Icon from "@lucide/svelte/icons/trash-2";
	import { untrack } from "svelte";
	import { dndzone, type DndEvent } from "svelte-dnd-action";
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import { listEditMode, type ListEditMode } from "./listEditMode.svelte";
	import { addItem, moveItem, removeItem } from "./sortableList";
	import TextListEditor from "./TextListEditor.svelte";

	interface Props {
		items: string[];
		addLabel?: string;
		placeholder?: string;
	}

	interface Row {
		id: string;
		value: string;
	}

	const FLIP_DURATION_MS = 150;

	let { items = $bindable(), addLabel = "Hinzufügen", placeholder = "Neuer Eintrag" }: Props = $props();

	const MODES: { value: ListEditMode; label: string; icon: typeof ListIcon }[] = [
		{ value: "list", label: "Liste", icon: ListIcon },
		{ value: "text", label: "Text", icon: TextIcon }
	];

	let rows = $state<Row[]>([]);
	let draft = $state("");
	let error = $state<string | null>(null);
	let nextId = 0;

	const toRows = (values: string[]): Row[] => values.map((value) => ({ id: `row-${nextId++}`, value }));
	const sameValues = (current: Row[], values: string[]): boolean =>
		current.length === values.length && current.every((row, index) => row.value === values[index]);

	// Von außen geänderte Einträge übernehmen, ohne laufendes Ziehen zu stören.
	$effect.pre(() => {
		const values = items;
		untrack(() => {
			if (!sameValues(rows, values)) rows = toRows(values);
		});
	});

	function handleConsider(event: CustomEvent<DndEvent<Row>>) {
		rows = event.detail.items;
	}

	function handleFinalize(event: CustomEvent<DndEvent<Row>>) {
		rows = event.detail.items;
		items = rows.map((row) => row.value);
	}

	function move(from: number, to: number) {
		items = moveItem(items, from, to);
	}

	function remove(index: number) {
		items = removeItem(items, index);
	}

	function add(event: SubmitEvent) {
		event.preventDefault();
		const result = addItem(items, draft);
		error = result.error ?? null;
		if (result.error) return;
		items = result.list;
		draft = "";
	}
</script>

<div class="flex flex-col gap-3">
	<div class="flex justify-end gap-1" role="group" aria-label="Bearbeitungsmodus">
		{#each MODES as mode (mode.value)}
			<Button
				variant={listEditMode.current === mode.value ? "secondary" : "ghost"}
				size="sm"
				aria-pressed={listEditMode.current === mode.value}
				onclick={() => listEditMode.set(mode.value)}
			>
				<mode.icon data-icon="inline-start" />
				{mode.label}
			</Button>
		{/each}
	</div>

	{#if listEditMode.current === "text"}
		<TextListEditor bind:items label={placeholder} />
	{:else}
		<ul
			class="flex flex-col gap-1.5"
			aria-label="Einträge, per Ziehen oder Pfeiltasten sortierbar"
			use:dndzone={{
				items: rows,
				flipDurationMs: FLIP_DURATION_MS,
				dropTargetStyle: {},
				dropTargetClasses: ["rounded-lg", "ring-2", "ring-ring/50"]
			}}
			onconsider={handleConsider}
			onfinalize={handleFinalize}
		>
			{#each rows as row, index (row.id)}
				<li class="flex items-center gap-2 rounded-lg border border-border bg-card px-2 py-1.5 text-sm">
					<GripVerticalIcon class="size-4 shrink-0 cursor-grab text-muted-foreground" aria-hidden="true" />
					<span class="min-w-0 flex-1 truncate">{row.value}</span>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="„{row.value}“ nach oben"
						disabled={index === 0}
						onclick={() => move(index, index - 1)}
					>
						<ArrowUpIcon />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						aria-label="„{row.value}“ nach unten"
						disabled={index === rows.length - 1}
						onclick={() => move(index, index + 1)}
					>
						<ArrowDownIcon />
					</Button>
					<Button variant="ghost" size="icon-sm" aria-label="„{row.value}“ entfernen" onclick={() => remove(index)}>
						<Trash2Icon />
					</Button>
				</li>
			{/each}
		</ul>

		<form class="flex gap-2" onsubmit={add}>
			<Input
				bind:value={draft}
				{placeholder}
				aria-label={placeholder}
				aria-invalid={error ? true : undefined}
				oninput={() => (error = null)}
			/>
			<Button type="submit" variant="outline">
				<PlusIcon data-icon="inline-start" />
				{addLabel}
			</Button>
		</form>
		{#if error}
			<p class="text-sm text-destructive" role="alert">{error}</p>
		{/if}
	{/if}
</div>
