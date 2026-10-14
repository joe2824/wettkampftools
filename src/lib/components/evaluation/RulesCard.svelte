<script lang="ts">
	import InfoIcon from "@lucide/svelte/icons/info";
	import * as Alert from "$lib/components/ui/alert";
	import * as Card from "$lib/components/ui/card";

	interface Props {
		paragraphs: string[];
	}

	let { paragraphs }: Props = $props();
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>So wird gezählt</Card.Title>
	</Card.Header>
	<Card.Content class="flex flex-col gap-3">
		<Alert.Root>
			<InfoIcon />
			<Alert.Title>Pokalpunkte sind nicht die Wettkampfpunkte aus JAuswertung.</Alert.Title>
			<Alert.Description>Sie ergeben sich allein aus dem Platz und der Anzahl der Mannschaften.</Alert.Description>
		</Alert.Root>
		{#each paragraphs as paragraph (paragraph)}
			<p class="text-sm leading-relaxed">{paragraph}</p>
		{/each}
	</Card.Content>
</Card.Root>
