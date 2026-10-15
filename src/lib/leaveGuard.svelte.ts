// Rückfrage beim Verlassen einer Seite mit ungespeicherten Änderungen (statt Browser-Dialog).

export type LeaveChoice = "save" | "discard" | "cancel";

export interface LeaveActions {
	save(): Promise<void>;
	discard(): void;
	goto(target: URL): Promise<void>;
}

export class LeaveGuard {
	#target = $state.raw<URL | null>(null);

	get open(): boolean {
		return this.#target !== null;
	}

	/** true, wenn die Navigation angehalten und nachgefragt werden soll. */
	intercept(target: URL | null, dirty: boolean): boolean {
		if (!dirty || target === null) return false;
		this.#target = target;
		return true;
	}

	/** Ein Speicherfehler wird weitergereicht; die Seite bleibt dann offen. */
	async choose(choice: LeaveChoice, actions: LeaveActions): Promise<void> {
		const target = this.#target;
		this.#target = null;
		if (target === null || choice === "cancel") return;
		if (choice === "save") await actions.save();
		else actions.discard();
		await actions.goto(target);
	}
}
