<script lang="ts">
	import { tick } from "svelte";
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";

	interface Props {
		id: string;
		label: string;
		value: number;
		step: number;
		min?: number;
		max?: number;
		/** Erst beim Bestätigen (Enter, Verlassen, Pfeile), damit das Tippen nicht springt. */
		onvalue: (value: number) => void;
	}

	let { id, label, value, step, min, max, onvalue }: Props = $props();

	const DECIMALS = 100;
	const shown = $derived(String(Math.round(value * DECIMALS) / DECIMALS));

	async function handleChange(event: Event & { currentTarget: HTMLInputElement }) {
		const input = event.currentTarget;
		onvalue(input.valueAsNumber);
		// Begrenzte oder ungültige Eingaben zeigen danach den übernommenen Wert.
		await tick();
		input.value = shown;
	}
</script>

<div class="flex flex-col gap-1.5">
	<Label for={id}>{label}</Label>
	<Input {id} type="number" inputmode="decimal" value={shown} {step} {min} {max} onchange={handleChange} />
</div>
