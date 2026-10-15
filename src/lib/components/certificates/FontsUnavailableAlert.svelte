<script lang="ts">
	import CircleAlertIcon from "@lucide/svelte/icons/circle-alert";
	import * as Alert from "$lib/components/ui/alert";
</script>

<Alert.Root variant="destructive">
	<CircleAlertIcon />
	<Alert.Title>Vorschau nicht verfügbar</Alert.Title>
	<Alert.Description>Die Schriftdateien konnten nicht geladen werden. Bitte das Programm neu starten.</Alert.Description>
</Alert.Root>
