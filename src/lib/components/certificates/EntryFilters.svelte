<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import * as ToggleGroup from "$lib/components/ui/toggle-group";
	import {
		KIND_FILTER_LABELS,
		hiddenValuesFor,
		shownValues,
		type FilterOptions,
		type HiddenValues
	} from "./certificateSelection";

	interface Props {
		options: FilterOptions;
		hidden: HiddenValues;
		onchange: (hidden: HiddenValues) => void;
	}

	let { options, hidden, onchange }: Props = $props();

	function setAgeGroups(values: string[]) {
		onchange({ ...hidden, ageGroups: hiddenValuesFor(options.ageGroups, values) });
	}

	function setGenders(values: string[]) {
		onchange({ ...hidden, genders: hiddenValuesFor(options.genders, values) });
	}

	function setKinds(values: string[]) {
		onchange({ ...hidden, kinds: hiddenValuesFor(options.kinds, values) });
	}
</script>

<div class="flex flex-col gap-4">
	<div class="flex flex-col gap-2">
		<div class="flex flex-wrap items-center justify-between gap-2">
			<span id="filter-age-groups" class="text-sm font-medium">Altersklassen</span>
			<div class="flex gap-1">
				<Button variant="ghost" size="sm" onclick={() => setAgeGroups(options.ageGroups)}>Alle</Button>
				<Button variant="ghost" size="sm" onclick={() => setAgeGroups([])}>Keine</Button>
			</div>
		</div>
		<ToggleGroup.Root
			type="multiple"
			variant="outline"
			spacing={1}
			class="flex-wrap"
			aria-labelledby="filter-age-groups"
			bind:value={() => shownValues(options.ageGroups, hidden.ageGroups), setAgeGroups}
		>
			{#each options.ageGroups as ageGroup (ageGroup)}
				<ToggleGroup.Item value={ageGroup}>{ageGroup}</ToggleGroup.Item>
			{/each}
		</ToggleGroup.Root>
	</div>

	<div class="flex flex-wrap gap-6">
		<div class="flex flex-col gap-2">
			<span id="filter-genders" class="text-sm font-medium">Geschlecht</span>
			<ToggleGroup.Root
				type="multiple"
				variant="outline"
				aria-labelledby="filter-genders"
				bind:value={() => shownValues(options.genders, hidden.genders), setGenders}
			>
				{#each options.genders as gender (gender)}
					<ToggleGroup.Item value={gender}>{gender}</ToggleGroup.Item>
				{/each}
			</ToggleGroup.Root>
		</div>

		{#if options.kinds.length > 1}
			<div class="flex flex-col gap-2">
				<span id="filter-kinds" class="text-sm font-medium">Wertung</span>
				<ToggleGroup.Root
					type="multiple"
					variant="outline"
					aria-labelledby="filter-kinds"
					bind:value={() => shownValues(options.kinds, hidden.kinds), setKinds}
				>
					{#each options.kinds as kind (kind)}
						<ToggleGroup.Item value={kind}>{KIND_FILTER_LABELS[kind]}</ToggleGroup.Item>
					{/each}
				</ToggleGroup.Root>
			</div>
		{/if}
	</div>
</div>
