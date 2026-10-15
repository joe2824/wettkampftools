<script lang="ts">
	import * as Dialog from "$lib/components/ui/dialog";
	import CreditList from "./CreditList.svelte";
	import PackageList from "./PackageList.svelte";

	let { open = $bindable(false) }: { open: boolean } = $props();
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="flex max-h-[85vh] flex-col sm:max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Lizenzen und Quellen</Dialog.Title>
			<Dialog.Description>Was in Wettkampftools steckt und woher die Daten kommen.</Dialog.Description>
		</Dialog.Header>
		<div class="-mx-4 flex min-h-0 flex-col gap-6 overflow-y-auto px-4">
			<section class="flex flex-col gap-3" aria-labelledby="credits-heading">
				<h2 id="credits-heading" class="font-semibold">Programm, Schrift und Daten</h2>
				<CreditList />
			</section>
			<section class="flex flex-col gap-3" aria-labelledby="packages-heading">
				<h2 id="packages-heading" class="font-semibold">Verwendete Bibliotheken</h2>
				<PackageList />
			</section>
		</div>
	</Dialog.Content>
</Dialog.Root>
