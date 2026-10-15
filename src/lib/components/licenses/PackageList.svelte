<script lang="ts">
	import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
	import { Input } from "$lib/components/ui/input";
	import {
		filterPackages,
		loadThirdPartyLicenses,
		type NoticesResult,
		type ThirdPartyNotices
	} from "$lib/release/thirdPartyLicenses";

	let result = $state.raw<NoticesResult | null>(null);
	let query = $state("");

	$effect(() => {
		loadThirdPartyLicenses().then((loaded) => (result = loaded));
	});

	const notices = $derived(result?.status === "ok" ? result.notices : null);
	const visible = $derived(notices ? filterPackages(notices.packages, query) : []);

	function licenseText(source: ThirdPartyNotices, indices: number[]): string {
		return indices.map((index) => source.texts[index]).join("\n\n");
	}
</script>

{#if result === null}
	<p class="flex items-center gap-2 text-muted-foreground">
		<LoaderCircleIcon class="size-4 animate-spin" aria-hidden="true" />
		Wird geladen …
	</p>
{:else if notices === null}
	<p class="text-muted-foreground">Die Liste liegt nur der fertigen Anwendung bei.</p>
{:else}
	<div class="flex flex-col gap-3">
		<Input
			type="search"
			bind:value={query}
			placeholder="Paket oder Lizenz suchen"
			aria-label="Paket oder Lizenz suchen"
		/>
		<p class="text-xs text-muted-foreground" aria-live="polite">
			{visible.length} von {notices.packages.length} Paketen
			{#if notices.rust === "unavailable"}· Angaben zu den Rust-Bibliotheken nicht verfügbar{/if}
		</p>
		<ul class="flex flex-col divide-y rounded-lg border">
			{#each visible as pkg (`${pkg.source}:${pkg.name}@${pkg.version}`)}
				<li>
					<details class="group">
						<summary class="flex cursor-pointer flex-wrap items-baseline gap-x-2 px-3 py-2 hover:bg-muted/50">
							<span class="font-medium">{pkg.name}</span>
							<span class="text-xs text-muted-foreground tabular-nums">{pkg.version}</span>
							<span class="ms-auto text-xs text-muted-foreground">{pkg.license}</span>
						</summary>
						{#if pkg.texts.length > 0}
							<pre class="max-h-64 overflow-auto bg-muted/40 px-3 py-2 text-xs whitespace-pre-wrap">{licenseText(
									notices,
									pkg.texts
								)}</pre>
						{:else}
							<p class="px-3 py-2 text-xs text-muted-foreground">
								Das Paket bringt keinen eigenen Lizenztext mit; es gilt {pkg.license}.
							</p>
						{/if}
					</details>
				</li>
			{/each}
		</ul>
	</div>
{/if}
