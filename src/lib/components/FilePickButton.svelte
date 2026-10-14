<script lang="ts">
	import FileUpIcon from "@lucide/svelte/icons/file-up";
	import type { Snippet } from "svelte";
	import { Button, type ButtonVariant } from "$lib/components/ui/button";
	import { isTauri } from "$lib/platform/env";
	import { acceptAttribute, readCheckedFile, type CheckedFile, type FileKind, type ReadFileResult } from "./fileCheck";
	import { chooseNativeFile, loadNativeFile } from "./nativeFile";

	// Schlanke Dateiauswahl ohne Ablagefläche, z. B. für schmale Seitenspalten.
	interface Props {
		kinds: FileKind[];
		variant?: ButtonVariant;
		disabled?: boolean;
		onfile: (file: CheckedFile) => void;
		onerror: (message: string) => void;
		children: Snippet;
	}

	let { kinds, variant = "outline", disabled = false, onfile, onerror, children }: Props = $props();

	let input = $state<HTMLInputElement | null>(null);
	let busy = $state(false);

	async function handle(result: Promise<ReadFileResult | null>) {
		busy = true;
		try {
			const outcome = await result;
			if (outcome === null) return;
			if (outcome.ok) onfile(outcome.file);
			else onerror(outcome.message);
		} finally {
			busy = false;
		}
	}

	async function pickNative(): Promise<ReadFileResult | null> {
		const path = await chooseNativeFile(kinds);
		return path === null ? null : loadNativeFile(path, kinds);
	}

	function pick() {
		if (isTauri()) handle(pickNative());
		else input?.click();
	}

	function handleInput(event: Event) {
		const target = event.currentTarget as HTMLInputElement;
		const file = target.files?.[0];
		target.value = "";
		if (file) handle(readCheckedFile(file, kinds));
	}
</script>

<Button {variant} size="sm" disabled={disabled || busy} onclick={pick}>
	<FileUpIcon data-icon="inline-start" />
	{@render children()}
</Button>
<input bind:this={input} type="file" class="hidden" accept={acceptAttribute(kinds)} onchange={handleInput} />
