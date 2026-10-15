<script lang="ts">
	import type { Snippet } from "svelte";
	import Dropzone from "$lib/components/Dropzone.svelte";
	import type { CheckedFile } from "$lib/components/fileCheck";
	import { Button } from "$lib/components/ui/button";
	import * as Dialog from "$lib/components/ui/dialog";

	interface Props {
		open: boolean;
		title: string;
		description: string;
		fileTitle: string;
		onfile: (file: CheckedFile) => void;
		/** Beim Schließen, z. B. um Hinweise zu verwerfen. */
		onclose: () => void;
		/** Hinweise unter der Ablagefläche. */
		children?: Snippet;
	}

	let { open = $bindable(false), title, description, fileTitle, onfile, onclose, children }: Props = $props();

	function handleOpenChange(value: boolean) {
		open = value;
		if (!value) onclose();
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Description>{description}</Dialog.Description>
		</Dialog.Header>
		<Dropzone kinds={["json"]} compact title={fileTitle} {onfile} />
		{@render children?.()}
		<Dialog.Footer>
			<Button variant="outline" onclick={() => handleOpenChange(false)}>Schließen</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
