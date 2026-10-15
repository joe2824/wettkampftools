// Aktiver Schritt je Seite; bleibt beim Seitenwechsel bis zum Neustart erhalten.
export class ActiveSteps {
	#steps = $state<Record<string, string>>({});

	get(page: string): string | null {
		return this.#steps[page] ?? null;
	}

	set(page: string, stepId: string): void {
		this.#steps[page] = stepId;
	}

	/** Anfangsschritt merken, damit die Ansicht nicht springt, sobald ein Schritt erledigt ist. */
	init(page: string, stepId: string): void {
		if (this.get(page) === null) this.set(page, stepId);
	}
}

export const activeSteps = new ActiveSteps();
