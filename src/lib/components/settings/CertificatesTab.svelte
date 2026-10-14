<script lang="ts">
	import { Input } from "$lib/components/ui/input";
	import { Label } from "$lib/components/ui/label";
	import { MAX_COPIES, MAX_PRINT_OFFSET_MM, MIN_COPIES } from "$lib/settings/settings";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import { toCopies, toOffsetMm } from "$lib/workflows/settings";
	import SettingSwitch from "./SettingSwitch.svelte";

	const OFFSET_STEP_MM = 0.5;
	const certificates = $derived(settingsStore.settings.certificates);

	type CopyKey = "copiesPerTeam" | "copiesPerIndividual";
	type Axis = "x" | "y";

	const copyFields: { key: CopyKey; label: string }[] = [
		{ key: "copiesPerTeam", label: "Urkunden je Mannschaft" },
		{ key: "copiesPerIndividual", label: "Urkunden je Einzelstarter" }
	];
	const offsetFields: { axis: Axis; label: string }[] = [
		{ axis: "x", label: "Versatz nach rechts (mm)" },
		{ axis: "y", label: "Versatz nach unten (mm)" }
	];

	function setCopies(key: CopyKey, input: HTMLInputElement) {
		certificates[key] = toCopies(input.valueAsNumber, certificates[key]);
		input.value = String(certificates[key]);
	}

	function setOffset(axis: Axis, input: HTMLInputElement) {
		certificates.printOffsetMm[axis] = toOffsetMm(input.valueAsNumber, certificates.printOffsetMm[axis]);
		input.value = String(certificates.printOffsetMm[axis]);
	}
</script>

<div class="flex flex-col gap-4">
	<SettingSwitch
		id="member-names"
		label="Mitgliedernamen auf Mannschaftsurkunden"
		description="Druckt die Namen der Mannschaftsmitglieder mit auf die Urkunde."
		bind:checked={certificates.withMemberNames}
	/>
	<div class="grid gap-4 rounded-lg border border-border p-4 md:grid-cols-2">
		{#each copyFields as field (field.key)}
			<div class="flex flex-col gap-2">
				<Label for="copies-{field.key}">{field.label}</Label>
				<Input
					id="copies-{field.key}"
					type="number"
					min={MIN_COPIES}
					max={MAX_COPIES}
					step="1"
					value={certificates[field.key]}
					onchange={(e) => setCopies(field.key, e.currentTarget)}
				/>
			</div>
		{/each}
	</div>
	<div class="flex flex-col gap-3 rounded-lg border border-border p-4">
		<div class="grid gap-4 md:grid-cols-2">
			{#each offsetFields as field (field.axis)}
				<div class="flex flex-col gap-2">
					<Label for="offset-{field.axis}">{field.label}</Label>
					<Input
						id="offset-{field.axis}"
						type="number"
						min={-MAX_PRINT_OFFSET_MM}
						max={MAX_PRINT_OFFSET_MM}
						step={OFFSET_STEP_MM}
						value={certificates.printOffsetMm[field.axis]}
						onchange={(e) => setOffset(field.axis, e.currentTarget)}
					/>
				</div>
			{/each}
		</div>
		<p class="text-sm text-muted-foreground">
			Gleicht aus, wenn der Drucker etwas verschoben druckt. Den passenden Wert zeigt die Kalibrierseite unter
			<a href="/certificates/layout" class="underline underline-offset-2">Urkunden-Layout</a>. Negative Werte
			verschieben nach links bzw. oben.
		</p>
	</div>
</div>
