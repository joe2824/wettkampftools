<script lang="ts">
	import { setMode, userPrefersMode } from "mode-watcher";

	type Mode = "light" | "dark" | "system";
	import { Label } from "$lib/components/ui/label";
	import * as Select from "$lib/components/ui/select";

	// Hell, dunkel oder wie das System; gilt sofort und wird auf diesem Rechner gemerkt, nicht in den Einstellungen.
	const OPTIONS: { value: Mode; label: string }[] = [
		{ value: "system", label: "Wie Windows" },
		{ value: "light", label: "Hell" },
		{ value: "dark", label: "Dunkel" }
	];

	const current = $derived(userPrefersMode.current);
	const label = $derived(OPTIONS.find((option) => option.value === current)?.label ?? "Wie Windows");
</script>

<div class="flex flex-col gap-2 rounded-lg border border-border p-4">
	<Label for="appearance-mode">Farbschema</Label>
	<Select.Root type="single" value={current} onValueChange={(value) => value && setMode(value as Mode)}>
		<Select.Trigger id="appearance-mode" class="w-56" aria-describedby="appearance-mode-hint">{label}</Select.Trigger>
		<Select.Content>
			{#each OPTIONS as option (option.value)}
				<Select.Item value={option.value} label={option.label}>{option.label}</Select.Item>
			{/each}
		</Select.Content>
	</Select.Root>
	<p id="appearance-mode-hint" class="text-sm text-muted-foreground">
		Gilt sofort und nur auf diesem Rechner; „Speichern“ ist dafür nicht nötig.
	</p>
</div>
