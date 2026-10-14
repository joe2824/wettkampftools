<script lang="ts">
	import { Label } from "$lib/components/ui/label";
	import { Switch } from "$lib/components/ui/switch";

	interface Props {
		id: string;
		label: string;
		description: string;
		checked: boolean;
	}

	let { id, label, description, checked = $bindable() }: Props = $props();
</script>

<div class="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
	<div class="flex flex-col gap-1">
		<Label for={id}>{label}</Label>
		<p id="{id}-hint" class="text-sm text-muted-foreground">{description}</p>
	</div>
	<Switch {id} bind:checked aria-describedby="{id}-hint" />
</div>
