<script lang="ts">
	import { FONT_WEIGHTS, type FontWeight } from "$lib/certificates/layout";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";

	interface Props {
		id: string;
		label: string;
		value: FontWeight;
		onchange: (value: FontWeight) => void;
	}

	let { id, label, value, onchange }: Props = $props();

	const FONT_LABELS: Record<FontWeight, string> = {
		light: "Leicht",
		regular: "Normal",
		bold: "Fett",
		black: "Extrafett"
	};
</script>

<div class="flex flex-col gap-1.5">
	<Label for={id}>{label}</Label>
	<Select.Root type="single" {value} onValueChange={(next) => onchange(next as FontWeight)}>
		<Select.Trigger {id} class="w-full">{FONT_LABELS[value]}</Select.Trigger>
		<Select.Content>
			{#each FONT_WEIGHTS as weight (weight)}
				<Select.Item value={weight} label={FONT_LABELS[weight]}>{FONT_LABELS[weight]}</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>
</div>
