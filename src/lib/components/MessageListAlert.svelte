<script lang="ts">
	import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";
	import * as Alert from "$lib/components/ui/alert";

	interface Props {
		title: string;
		messages: readonly string[];
		variant?: "default" | "destructive";
		/** Warnsymbol vor dem Titel. */
		withIcon?: boolean;
	}

	let { title, messages, variant = "default", withIcon = false }: Props = $props();
</script>

<Alert.Root {variant}>
	{#if withIcon}
		<CircleAlertIcon />
	{/if}
	<Alert.Title>{title}</Alert.Title>
	<Alert.Description>
		<ul class="list-disc space-y-1 ps-4">
			{#each messages as message (message)}
				<li>{message}</li>
			{/each}
		</ul>
	</Alert.Description>
</Alert.Root>
