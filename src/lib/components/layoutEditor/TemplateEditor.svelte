<script lang="ts">
	import { tick } from "svelte";
	import { insertAtCursor } from "$lib/certificates/editorOps";
	import { MAX_TEMPLATE_LENGTH } from "$lib/certificates/layout";
	import { PLACEHOLDERS } from "$lib/certificates/layoutTemplate";
	import { Label } from "$lib/components/ui/label";
	import { Textarea } from "$lib/components/ui/textarea";

	interface Props {
		template: string;
		onchange: (template: string) => void;
	}

	let { template, onchange }: Props = $props();

	let textarea = $state<HTMLTextAreaElement | null>(null);

	async function insert(token: string) {
		const { text, cursor } = insertAtCursor(template, token, textarea?.selectionStart ?? null, textarea?.selectionEnd ?? null);
		onchange(text);
		await tick();
		textarea?.focus();
		textarea?.setSelectionRange(cursor, cursor);
	}
</script>

<div class="flex flex-col gap-1.5">
	<Label for="prop-template">Text</Label>
	<Textarea
		id="prop-template"
		bind:ref={textarea}
		value={template}
		rows={2}
		maxlength={MAX_TEMPLATE_LENGTH}
		aria-describedby="prop-template-hint"
		oninput={(event) => onchange(event.currentTarget.value)}
	/>
	<p id="prop-template-hint" class="text-xs text-muted-foreground">
		Platzhalter werden auf jeder Urkunde ersetzt. Text zwischen <code>**</code> wird fett gedruckt, z. B.
		<code>**{"{platz}"}. Platz**</code>.
	</p>
	<div class="flex flex-wrap gap-1" role="group" aria-label="Platzhalter einfügen">
		{#each PLACEHOLDERS as placeholder (placeholder.key)}
			<button
				type="button"
				title={placeholder.description}
				aria-label="{placeholder.description} einfügen"
				class="rounded-md border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-xs transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
				onclick={() => insert(placeholder.token)}
			>
				{placeholder.token}
			</button>
		{/each}
	</div>
</div>
