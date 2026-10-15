<script lang="ts">
	import RotateCcwIcon from "@lucide/svelte/icons/rotate-ccw";
	import type { Snippet } from "svelte";
	import * as AlertDialog from "$lib/components/ui/alert-dialog";
	import { buttonVariants, type ButtonSize, type ButtonVariant } from "$lib/components/ui/button";

	interface Props {
		triggerLabel: string;
		triggerVariant?: ButtonVariant;
		triggerSize?: ButtonSize;
		disabled?: boolean;
		title: string;
		/** Erklärung, was beim Bestätigen passiert. */
		children: Snippet;
		confirmLabel: string;
		onconfirm: () => void;
	}

	let {
		triggerLabel,
		triggerVariant = "ghost",
		triggerSize,
		disabled = false,
		title,
		children,
		confirmLabel,
		onconfirm
	}: Props = $props();
</script>

<AlertDialog.Root>
	<AlertDialog.Trigger class={buttonVariants({ variant: triggerVariant, size: triggerSize })} {disabled}>
		<RotateCcwIcon data-icon="inline-start" />
		{triggerLabel}
	</AlertDialog.Trigger>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>{title}</AlertDialog.Title>
			<AlertDialog.Description>{@render children()}</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Abbrechen</AlertDialog.Cancel>
			<AlertDialog.Action onclick={onconfirm}>{confirmLabel}</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
