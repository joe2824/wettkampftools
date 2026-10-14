<script lang="ts">
	import Redo2Icon from "@lucide/svelte/icons/redo-2";
	import Undo2Icon from "@lucide/svelte/icons/undo-2";
	import { Button } from "$lib/components/ui/button";

	interface Props {
		canUndo: boolean;
		canRedo: boolean;
		onundo: () => void;
		onredo: () => void;
	}

	let { canUndo, canRedo, onundo, onredo }: Props = $props();

	const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.userAgent);
	const modifier = isMac ? "⌘" : "Strg";
	const undoHint = `Rückgängig (${modifier}+Z)`;
	const redoHint = isMac ? "Wiederholen (⌘+Umschalt+Z)" : "Wiederholen (Strg+Y)";

	// In Eingabefeldern bleibt das normale Rückgängig des Textfelds aktiv.
	function isTextInput(target: EventTarget | null): boolean {
		return (
			target instanceof HTMLElement &&
			(target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
		);
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!(event.metaKey || event.ctrlKey) || event.altKey || isTextInput(event.target)) return;
		const key = event.key.toLowerCase();
		const wantsRedo = (key === "z" && event.shiftKey) || (key === "y" && !event.shiftKey);
		if (key === "z" && !event.shiftKey) {
			event.preventDefault();
			if (canUndo) onundo();
		} else if (wantsRedo) {
			event.preventDefault();
			if (canRedo) onredo();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="flex gap-1" role="group" aria-label="Änderungen">
	<Button variant="outline" size="sm" disabled={!canUndo} title={undoHint} aria-label={undoHint} onclick={onundo}>
		<Undo2Icon data-icon="inline-start" />
		Rückgängig
	</Button>
	<Button variant="outline" size="sm" disabled={!canRedo} title={redoHint} aria-label={redoHint} onclick={onredo}>
		<Redo2Icon data-icon="inline-start" />
		Wiederholen
	</Button>
</div>
