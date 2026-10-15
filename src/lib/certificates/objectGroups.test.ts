import { describe, expect, it } from "vitest";
import { image, layoutOf, map, text } from "$lib/testing/layoutObjects";
import {
	canGroup,
	canUngroup,
	groupObjects,
	listRows,
	normalizeGroups,
	selectionUnits,
	ungroupObjects
} from "./objectGroups";

const groupOf = (layout: ReturnType<typeof layoutOf>, id: string) =>
	layout.objects.find((object) => object.id === id)?.groupId;

describe("groupObjects", () => {
	it("gibt den gewählten Objekten eine gemeinsame, neue Gruppe", () => {
		const layout = layoutOf([text({ id: "a" }), image({ id: "b", groupId: "group-1" }), map({ id: "c" })]);
		const grouped = groupObjects(layout, ["a", "c"]);
		expect(groupOf(grouped, "a")).toBe("group-2");
		expect(groupOf(grouped, "c")).toBe("group-2");
		expect(groupOf(grouped, "b")).toBeUndefined();
	});

	it("braucht mindestens zwei Objekte", () => {
		const layout = layoutOf([text({ id: "a" })]);
		expect(groupObjects(layout, ["a"])).toBe(layout);
	});
});

describe("ungroupObjects", () => {
	it("löst die Gruppen der gewählten Objekte vollständig auf", () => {
		const layout = layoutOf([text({ id: "a", groupId: "g" }), image({ id: "b", groupId: "g" }), map({ groupId: "h" })]);
		const ungrouped = ungroupObjects(layout, ["a"]);
		expect(groupOf(ungrouped, "a")).toBeUndefined();
		expect(groupOf(ungrouped, "b")).toBeUndefined();
		expect(groupOf(ungrouped, "map")).toBe("h");
		expect("groupId" in ungrouped.objects[0]).toBe(false);
	});
});

describe("normalizeGroups", () => {
	it("entfernt Gruppen mit nur einem Mitglied", () => {
		const layout = layoutOf([text({ id: "a", groupId: "g" }), image({ id: "b", groupId: "h" }), map({ groupId: "h" })]);
		const normalized = normalizeGroups(layout);
		expect(groupOf(normalized, "a")).toBeUndefined();
		expect(groupOf(normalized, "b")).toBe("h");
	});
});

describe("selectionUnits", () => {
	it("fasst Gruppen zu einer Einheit zusammen", () => {
		const objects = [text({ id: "a", groupId: "g" }), image({ id: "b" }), map({ groupId: "g" })];
		expect(selectionUnits(objects).map((unit) => unit.map((object) => object.id))).toEqual([["a", "map"], ["b"]]);
	});
});

describe("canGroup und canUngroup", () => {
	it("gruppiert ab zwei Einheiten, löst nur vorhandene Gruppen auf", () => {
		const grouped = [text({ id: "a", groupId: "g" }), map({ groupId: "g" })];
		expect(canGroup(grouped)).toBe(false);
		expect(canUngroup(grouped)).toBe(true);
		expect(canGroup([text({ id: "a" }), map()])).toBe(true);
		expect(canUngroup([text()])).toBe(false);
	});
});

describe("listRows", () => {
	it("zeigt Gruppen als Kopfzeile mit eingerückten Mitgliedern an der Stelle des ersten", () => {
		const objects = [text({ id: "a" }), image({ id: "b", groupId: "g" }), text({ id: "c" }), map({ groupId: "g" })];
		expect(
			listRows(objects).map((row) =>
				row.type === "group" ? `group:${row.ids.join("+")}` : `${row.object.id}:${row.nested}`
			)
		).toEqual(["a:false", "group:b+map", "b:true", "map:true", "c:false"]);
	});
});
