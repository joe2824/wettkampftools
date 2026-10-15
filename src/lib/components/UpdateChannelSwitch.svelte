<script lang="ts">
	import { toast } from "svelte-sonner";
	import { Button } from "$lib/components/ui/button";
	import { Label } from "$lib/components/ui/label";
	import { Switch } from "$lib/components/ui/switch";
	import { settingsStore } from "$lib/settings/settingsStore.svelte";
	import { changeBetaUpdates, restartApp } from "$lib/workflows/updateChannel";

	let changed = $state(false);

	async function handleChange(enabled: boolean) {
		const error = await changeBetaUpdates(settingsStore, enabled);
		if (error) {
			toast.error(error);
			return;
		}
		changed = true;
	}

	async function handleRestart() {
		const error = await restartApp();
		if (error) toast.error(error);
	}
</script>

<div class="flex flex-col gap-3 rounded-lg border border-border p-3">
	<div class="flex items-start justify-between gap-4">
		<div class="flex flex-col gap-1">
			<Label for="beta-updates">Beta-Versionen erhalten</Label>
			<p id="beta-updates-hint" class="text-sm text-muted-foreground">
				Neue Funktionen früher ausprobieren. Dafür kann auch mal etwas nicht rund laufen.
			</p>
		</div>
		<Switch
			id="beta-updates"
			checked={settingsStore.settings.betaUpdates}
			onCheckedChange={handleChange}
			aria-describedby="beta-updates-hint"
		/>
	</div>
	{#if changed}
		<div class="flex flex-wrap items-center justify-between gap-2 rounded-md bg-muted/40 p-2 text-sm" role="status">
			<span class="text-muted-foreground">Gilt nach einem Neustart.</span>
			<Button variant="outline" size="sm" onclick={handleRestart}>Jetzt neu starten</Button>
		</div>
	{/if}
</div>
