import { describe, expect, it } from "vitest";
import { canRedo, canUndo, emptyHistory, HISTORY_LIMIT, record, redo, undo } from "./editHistory";

describe("editHistory", () => {
	it("macht eine Änderung rückgängig und wiederholt sie", () => {
		let history = record(emptyHistory(), "A", "name", 0);
		expect(canUndo(history)).toBe(true);

		const undone = undo(history, "B");
		expect(undone.snapshot).toBe("A");
		history = undone.history;
		expect(canRedo(history)).toBe(true);

		const redone = redo(history, "A");
		expect(redone.snapshot).toBe("B");
		expect(canRedo(redone.history)).toBe(false);
	});

	it("fasst schnelle Änderungen am selben Objekt zu einem Schritt zusammen", () => {
		let history = record(emptyHistory(), "A", "name", 0);
		history = record(history, "A1", "name", 200);
		history = record(history, "A2", "name", 400);
		expect(undo(history, "A3").snapshot).toBe("A");
		expect(canUndo(undo(history, "A3").history)).toBe(false);
	});

	it("trennt Schritte bei anderem Objekt oder nach einer Pause", () => {
		let history = record(emptyHistory(), "A", "name", 0);
		history = record(history, "B", "place", 100);
		history = record(history, "C", "place", 5000);
		const first = undo(history, "D");
		expect(first.snapshot).toBe("C");
		const second = undo(first.history, "C");
		expect(second.snapshot).toBe("B");
		expect(undo(second.history, "B").snapshot).toBe("A");
	});

	it("verwirft Wiederholen-Schritte nach einer neuen Änderung", () => {
		let history = record(emptyHistory(), "A", "name", 0);
		history = undo(history, "B").history;
		history = record(history, "A", "place", 100);
		expect(canRedo(history)).toBe(false);
	});

	it("liefert ohne Verlauf nichts", () => {
		expect(undo(emptyHistory(), "A").snapshot).toBeNull();
		expect(redo(emptyHistory(), "A").snapshot).toBeNull();
	});

	it("begrenzt die Zahl der gespeicherten Schritte", () => {
		let history = emptyHistory();
		for (let step = 0; step < HISTORY_LIMIT + 10; step++) history = record(history, `S${step}`, `k${step}`, step);
		let count = 0;
		let current = "X";
		while (canUndo(history)) {
			const result = undo(history, current);
			history = result.history;
			current = result.snapshot ?? current;
			count++;
		}
		expect(count).toBe(HISTORY_LIMIT);
	});
});
