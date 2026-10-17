<script lang="ts">
	import type { ChartPoint, ChartSeries } from "./waveTimesFilter";

	// Verlauf je Jahr. Eine Gruppe: Band von der schnellsten bis zur längsten Zeit, darin der Durchschnitt.
	// Mehrere Gruppen: je Gruppe eine Linie mit dem Durchschnitt.
	interface Props {
		series: ChartSeries[];
	}

	let { series }: Props = $props();

	const WIDTH = 720;
	const HEIGHT = 260;
	const PAD = { top: 16, right: 20, bottom: 36, left: 56 };
	const HUNDREDTHS_PER_SECOND = 100;
	/** Abstände der Zeitachse in Sekunden; der erste mit höchstens fünf Linien gewinnt. */
	const TICK_STEPS_S = [5, 10, 15, 20, 30, 60, 90, 120, 180, 300];
	const MAX_X_LABELS = 9;
	const COLORS = [
		"var(--color-brand)",
		"oklch(0.62 0.17 255)",
		"oklch(0.66 0.19 40)",
		"oklch(0.6 0.2 320)",
		"oklch(0.65 0.14 190)",
		"oklch(0.7 0.17 85)",
		"oklch(0.55 0.2 20)",
		"oklch(0.6 0.12 140)",
		"oklch(0.58 0.15 290)",
		"oklch(0.68 0.12 60)",
		"oklch(0.5 0.1 230)",
		"oklch(0.62 0.16 350)"
	];

	const single = $derived(series.length === 3 && series[0].label === "Schnellste");
	const points = $derived(series.flatMap((line) => line.points));
	const years = $derived([...new Set(points.map((point) => point.year))].sort((a, b) => a - b));
	const minYear = $derived(years[0] ?? 0);
	const maxYear = $derived(years.at(-1) ?? 0);
	const minValue = $derived(Math.min(...points.map((point) => point.value)));
	const maxValue = $derived(Math.max(...points.map((point) => point.value)));
	const step = $derived(
		(TICK_STEPS_S.find((candidate) => (maxValue - minValue) / (candidate * HUNDREDTHS_PER_SECOND) <= 5) ?? 300) *
			HUNDREDTHS_PER_SECOND
	);
	const low = $derived(Math.floor(minValue / step) * step);
	const high = $derived(Math.ceil(maxValue / step) * step);
	const yTicks = $derived(Array.from({ length: (high - low) / step + 1 }, (_, index) => low + index * step));
	const xTicks = $derived(years.filter((_, index) => index % Math.ceil(years.length / MAX_X_LABELS) === 0));

	const x = (year: number): number =>
		maxYear === minYear
			? (PAD.left + WIDTH - PAD.right) / 2
			: PAD.left + ((year - minYear) / (maxYear - minYear)) * (WIDTH - PAD.left - PAD.right);
	const y = (value: number): number => PAD.top + ((high - value) / (high - low || 1)) * (HEIGHT - PAD.top - PAD.bottom);

	/** „3:12“ für die Achse, ohne Hundertstel. */
	function minutesSeconds(hundredths: number): string {
		const seconds = Math.round(hundredths / HUNDREDTHS_PER_SECOND);
		return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
	}

	/** Weiche Kurve durch alle Punkte (Catmull-Rom als Bézier). */
	function curve(line: ChartPoint[]): string {
		const p = line.map((point) => ({ x: x(point.year), y: y(point.value) }));
		if (p.length < 2) return p.map((point) => `M${point.x} ${point.y}`).join("");
		let d = `M${p[0].x} ${p[0].y}`;
		for (let i = 0; i < p.length - 1; i++) {
			const p0 = p[i - 1] ?? p[i];
			const p1 = p[i];
			const p2 = p[i + 1];
			const p3 = p[i + 2] ?? p2;
			const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
			const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
			d += ` C${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
		}
		return d;
	}

	/** Fläche zwischen schnellster (unten) und längster Zeit (oben). */
	function band(fastest: ChartPoint[], slowest: ChartPoint[]): string {
		const back = [...fastest].reverse().map((point) => `L${x(point.year)} ${y(point.value)}`);
		return `${curve(slowest)} ${back.join(" ")} Z`;
	}

	const tooltip = (label: string, point: ChartPoint): string =>
		`${label} ${point.year}: ${minutesSeconds(point.value)} min`;
</script>

{#if points.length === 0}
	<p class="text-sm text-muted-foreground">Keine Zeiten für diese Auswahl.</p>
{:else}
	<figure class="flex flex-col gap-3">
		<svg
			viewBox="0 0 {WIDTH} {HEIGHT}"
			class="w-full text-foreground"
			role="img"
			aria-label="Verlauf der Zeiten je Jahr"
		>
			{#each yTicks as tick (tick)}
				<line x1={PAD.left} x2={WIDTH - PAD.right} y1={y(tick)} y2={y(tick)} stroke="var(--color-border)" />
				<text x={PAD.left - 10} y={y(tick) + 4} text-anchor="end" font-size="11" fill="var(--color-muted-foreground)">
					{minutesSeconds(tick)}
				</text>
			{/each}
			{#each xTicks as year (year)}
				<text x={x(year)} y={HEIGHT - 12} text-anchor="middle" font-size="11" fill="var(--color-muted-foreground)">
					{year}
				</text>
			{/each}

			{#if single}
				{@const [fastest, average, slowest] = series}
				<path d={band(fastest.points, slowest.points)} fill="var(--color-brand)" opacity="0.14" />
				<path d={curve(slowest.points)} fill="none" stroke="var(--color-brand)" stroke-width="1" opacity="0.5" />
				<path d={curve(fastest.points)} fill="none" stroke="var(--color-brand)" stroke-width="2" />
				<path d={curve(average.points)} fill="none" stroke="currentColor" stroke-width="2.5" />
				{#each average.points as point (point.year)}
					<circle
						cx={x(point.year)}
						cy={y(point.value)}
						r="3.5"
						fill="var(--color-background)"
						stroke="currentColor"
						stroke-width="2"
					>
						<title>{tooltip("Durchschnitt", point)}</title>
					</circle>
				{/each}
				{#each fastest.points as point (point.year)}
					<circle cx={x(point.year)} cy={y(point.value)} r="2.5" fill="var(--color-brand)">
						<title>{tooltip("Schnellste", point)}</title>
					</circle>
				{/each}
			{:else}
				{#each series as line, index (line.label)}
					<path
						d={curve(line.points)}
						fill="none"
						stroke={COLORS[index % COLORS.length]}
						stroke-width="2"
						stroke-linejoin="round"
						opacity="0.9"
					/>
					{#each line.points as point (point.year)}
						<circle cx={x(point.year)} cy={y(point.value)} r="2.5" fill={COLORS[index % COLORS.length]}>
							<title>{tooltip(line.label, point)}</title>
						</circle>
					{/each}
				{/each}
			{/if}
		</svg>
		<figcaption class="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
			{#if single}
				<span class="flex items-center gap-1.5">
					<span class="inline-block h-0.5 w-4 rounded bg-foreground"></span>
					Durchschnitt aller Mannschaften
				</span>
				<span class="flex items-center gap-1.5">
					<span class="inline-block h-0.5 w-4 rounded bg-brand"></span>
					Schnellste Zeit
				</span>
				<span class="flex items-center gap-1.5">
					<span class="inline-block h-3 w-4 rounded-sm bg-brand/25"></span>
					Spanne bis zur längsten Zeit
				</span>
			{:else}
				{#each series as line, index (line.label)}
					<span class="flex items-center gap-1.5">
						<span class="inline-block size-2.5 rounded-full" style:background={COLORS[index % COLORS.length]}></span>
						{line.label}
					</span>
				{/each}
			{/if}
		</figcaption>
	</figure>
{/if}
