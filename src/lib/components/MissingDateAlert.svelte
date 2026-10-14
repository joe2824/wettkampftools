<script lang="ts">
	import TriangleAlertIcon from "@lucide/svelte/icons/triangle-alert";
	import * as Alert from "$lib/components/ui/alert";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";

	interface Props {
		message: string;
		/** Link zur Vorbereitung anbieten, wo das Datum eingetragen wird. */
		withLink?: boolean;
	}

	let { message, withLink = false }: Props = $props();

	const missing = $derived(settingsStore.settings.event.date === "");
</script>

{#if missing}
	<Alert.Root>
		<TriangleAlertIcon />
		<Alert.Title>Datum fehlt</Alert.Title>
		<Alert.Description>
			<p>
				{message}
				{#if withLink}
					<a href="/preparation" class="font-medium text-foreground underline underline-offset-4">Zur Vorbereitung</a>
				{/if}
			</p>
		</Alert.Description>
	</Alert.Root>
{/if}
