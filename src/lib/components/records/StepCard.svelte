<script lang="ts">
	import type { Snippet } from "svelte";
	import StepHeader from "$lib/components/StepHeader.svelte";
	import * as Card from "$lib/components/ui/card";

	interface Props {
		step: number;
		title: string;
		description?: string;
		done?: boolean;
		children: Snippet;
	}

	let { step, title, description, done = false, children }: Props = $props();
</script>

<Card.Root>
	<Card.Header>
		<StepHeader {step} {title} {description} {done} />
	</Card.Header>
	<Card.Content>
		{@render children()}
	</Card.Content>
</Card.Root>
