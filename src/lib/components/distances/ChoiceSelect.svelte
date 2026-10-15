<script lang="ts">
	import * as Select from "$lib/components/ui/select";
	import type { Candidate } from "$lib/distance/matching";
	import { candidateText } from "$lib/workflows/distances";

	interface Props {
		name: string;
		candidates: Candidate[];
		selectedId: string | null;
		onchoose: (id: string) => void;
	}

	let { name, candidates, selectedId, onchoose }: Props = $props();

	const selected = $derived(candidates.find((candidate) => candidate.id === selectedId) ?? null);
</script>

<Select.Root type="single" value={selectedId ?? undefined} onValueChange={onchoose}>
	<Select.Trigger class="w-full max-w-md" aria-label={`Gliederung für ${name} wählen`}>
		<span class="truncate">{selected ? candidateText(selected) : "Bitte Gliederung wählen"}</span>
	</Select.Trigger>
	<Select.Content>
		{#each candidates as candidate (candidate.id)}
			<Select.Item value={candidate.id} label={candidateText(candidate)}>{candidateText(candidate)}</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
