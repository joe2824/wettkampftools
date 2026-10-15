// Schritt-Assistent: Schritte, Zustände und Navigation ohne Oberfläche.

export type StepStatus = "done" | "warning" | "open" | "locked";

export interface Step {
	id: string;
	label: string;
	status: StepStatus;
	/** Kurzer Satz über dem Schrittinhalt. */
	description?: string;
	/** Warum der Schritt gesperrt ist. */
	lockedReason?: string;
}

const indexOf = (steps: readonly Step[], id: string): number => steps.findIndex((step) => step.id === id);

export function canEnter(steps: readonly Step[], id: string): boolean {
	const step = steps[indexOf(steps, id)];
	return step !== undefined && step.status !== "locked";
}

export function nextStep(steps: readonly Step[], id: string): Step | null {
	const index = indexOf(steps, id);
	return index < 0 ? null : (steps[index + 1] ?? null);
}

export function prevStep(steps: readonly Step[], id: string): Step | null {
	const index = indexOf(steps, id);
	return index < 0 ? null : (steps[index - 1] ?? null);
}

/** Erster nicht erledigte, betretbare Schritt; sonst der letzte betretbare. */
export function firstOpen(steps: readonly Step[]): Step | null {
	const enterable = steps.filter((step) => step.status !== "locked");
	return enterable.find((step) => step.status !== "done") ?? enterable.at(-1) ?? null;
}

/** Gemerkter Schritt, solange betretbar; sonst der erste offene. */
export function resolveActive(steps: readonly Step[], remembered: string | null): string {
	if (remembered !== null && canEnter(steps, remembered)) return remembered;
	return (firstOpen(steps) ?? steps[0])?.id ?? "";
}
