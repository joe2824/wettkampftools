<script lang="ts">
	import { fontScale } from "./fontScaleState.svelte";
	import { fontScaleShortcut } from "./fontScale";
	import { isApplePlatform } from "./fileShortcuts";

	const apple = typeof navigator !== "undefined" && isApplePlatform(navigator.userAgent);

	$effect(() => {
		document.documentElement.style.fontSize = `${fontScale.current}%`;
	});

	function handleKeydown(event: KeyboardEvent) {
		const action = fontScaleShortcut(event, apple);
		if (action === null) return;
		event.preventDefault();
		fontScale.apply(action);
	}
</script>

<svelte:window onkeydown={handleKeydown} />
