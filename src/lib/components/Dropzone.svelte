<script lang="ts">
	import FileUpIcon from "@lucide/svelte/icons/file-up";
	import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
	import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";
	import * as Alert from "$lib/components/ui/alert";
	import { Button } from "$lib/components/ui/button";
	import { cn } from "$lib/utils.js";
	import { acceptAttribute, DEFAULT_MAX_BYTES, readCheckedFile, type CheckedFile, type FileKind } from "./fileCheck";

	interface Props {
		kinds: FileKind[];
		title: string;
		hint?: string;
		maxBytes?: number;
		disabled?: boolean;
		compact?: boolean;
		onfile: (file: CheckedFile) => void;
	}

	let { kinds, title, hint, maxBytes = DEFAULT_MAX_BYTES, disabled = false, compact = false, onfile }: Props = $props();

	let input = $state<HTMLInputElement | null>(null);
	let dragDepth = $state(0);
	let loading = $state(false);
	let error = $state<string | null>(null);
	let notice = $state<string | null>(null);

	const dragging = $derived(dragDepth > 0 && !disabled);
	const accept = $derived(acceptAttribute(kinds));

	async function take(files: FileList | null | undefined) {
		const first = files?.[0];
		if (!first || disabled || loading) return;
		error = null;
		notice = files.length > 1 ? "Es wurde nur die erste Datei übernommen." : null;
		loading = true;
		try {
			const result = await readCheckedFile(first, kinds, maxBytes);
			if (result.ok) onfile(result.file);
			else error = result.message;
		} finally {
			loading = false;
		}
	}

	function handleDragEnter(event: DragEvent) {
		event.preventDefault();
		dragDepth += 1;
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = disabled ? "none" : "copy";
	}

	function handleDragLeave() {
		dragDepth = Math.max(0, dragDepth - 1);
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		dragDepth = 0;
		void take(event.dataTransfer?.files);
	}

	function handleChange() {
		void take(input?.files).finally(() => {
			// Gleiche Datei soll erneut gewählt werden können.
			if (input) input.value = "";
		});
	}
</script>

<div class="flex flex-col gap-3">
	<div
		role="group"
		aria-label={title}
		aria-busy={loading}
		aria-disabled={disabled}
		ondragenter={handleDragEnter}
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		class={cn(
			"flex rounded-xl border-2 border-dashed border-border bg-muted/30 transition-colors",
			compact ? "flex-row items-center gap-4 p-4" : "flex-col items-center gap-3 px-6 py-10 text-center",
			dragging && "border-primary bg-primary/5",
			disabled && "opacity-60"
		)}
	>
		<div
			class={cn(
				"flex shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground",
				compact ? "size-10" : "size-14",
				dragging && "bg-primary/10 text-primary"
			)}
		>
			{#if loading}
				<LoaderCircleIcon class={cn("animate-spin", compact ? "size-5" : "size-7")} />
			{:else}
				<FileUpIcon class={compact ? "size-5" : "size-7"} />
			{/if}
		</div>
		<div class={cn("flex min-w-0 flex-col gap-1", compact && "flex-1")}>
			<p class="font-medium">{title}</p>
			<p class="text-sm text-muted-foreground">
				{hint ?? "Datei hierher ziehen oder auswählen."}
			</p>
		</div>
		<Button variant={compact ? "outline" : "default"} disabled={disabled || loading} onclick={() => input?.click()}>
			{loading ? "Wird gelesen …" : "Datei auswählen"}
		</Button>
		<input bind:this={input} type="file" class="hidden" {accept} {disabled} onchange={handleChange} tabindex="-1" aria-hidden="true" />
	</div>

	{#if error}
		<Alert.Root variant="destructive">
			<CircleAlertIcon />
			<Alert.Title>Datei nicht übernommen</Alert.Title>
			<Alert.Description>{error}</Alert.Description>
		</Alert.Root>
	{:else if notice}
		<p class="text-sm text-muted-foreground" role="status">{notice}</p>
	{/if}
</div>
