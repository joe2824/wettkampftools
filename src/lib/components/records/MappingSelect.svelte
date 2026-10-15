<script lang="ts">
	import * as Select from "$lib/components/ui/select";

	interface Props {
		label: string;
		value: string | null;
		options: readonly string[];
		emptyLabel: string;
		onchange: (value: string | null) => void;
	}

	let { label, value, options, emptyLabel, onchange }: Props = $props();

	// Eigener Wert für „keine Zuordnung“, da die Auswahl keinen leeren Wert kennt.
	const NONE = "\u0000";

	const choices = $derived([...new Set([...(value === null ? [] : [value]), ...options])]);

	function select(next: string) {
		onchange(next === NONE ? null : next);
	}
</script>

<Select.Root type="single" value={value ?? NONE} onValueChange={select}>
	<Select.Trigger class="w-full max-w-72" aria-label={label}>{value ?? emptyLabel}</Select.Trigger>
	<Select.Content>
		<Select.Item value={NONE} label={emptyLabel}>{emptyLabel}</Select.Item>
		{#each choices as choice (choice)}
			<Select.Item value={choice} label={choice}>{choice}</Select.Item>
		{/each}
	</Select.Content>
</Select.Root>
