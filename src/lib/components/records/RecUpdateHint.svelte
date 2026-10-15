<script lang="ts">
	import ArrowRightIcon from "@lucide/svelte/icons/arrow-right";
	import TimerIcon from "@lucide/svelte/icons/timer";
</script>

<a
	href="/records"
	class="group flex items-center gap-3 rounded-lg border bg-muted/30 p-3 transition-colors hover:bg-muted/60 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
>
	<TimerIcon class="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
	<span class="flex min-w-0 flex-1 flex-col">
		<span class="font-medium">Rec-Werte fürs neue Jahr aktualisieren</span>
		<span class="text-sm text-muted-foreground">
			Neue offizielle Werte und die Bestzeiten des Vorjahres ins Regelwerk für JAuswertung übernehmen.
		</span>
	</span>
	<ArrowRightIcon
		class="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
		aria-hidden="true"
	/>
</a>
