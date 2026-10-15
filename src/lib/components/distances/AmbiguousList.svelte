<script lang="ts">
	import CircleQuestionMarkIcon from "@lucide/svelte/icons/circle-question-mark";
	import * as Alert from "$lib/components/ui/alert";
	import type { AmbiguousName } from "$lib/distance/matching";
	import ChoiceSelect from "./ChoiceSelect.svelte";

	interface Props {
		names: AmbiguousName[];
		onchoose: (name: string, id: string) => void;
	}

	let { names, onchoose }: Props = $props();
</script>

<Alert.Root class="border-primary/40 bg-muted/60">
	<CircleQuestionMarkIcon />
	<Alert.Title>Mehrdeutig ({names.length})</Alert.Title>
	<Alert.Description>
		<p>Diese Namen gibt es mehrmals bei der DLRG. Bitte die richtige Gliederung wählen – die Wahl wird gemerkt.</p>
		<ul class="mt-3 flex w-full flex-col gap-3">
			{#each names as entry (entry.name)}
				<li class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
					<span class="min-w-32 font-medium text-foreground">{entry.name}</span>
					<ChoiceSelect
						name={entry.name}
						candidates={entry.candidates}
						selectedId={null}
						onchoose={(id) => onchoose(entry.name, id)}
					/>
				</li>
			{/each}
		</ul>
	</Alert.Description>
</Alert.Root>
