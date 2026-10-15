import { describe, expect, it } from "vitest";
import type { DistanceRow } from "./matching";
import { distanceMapSvg, MAP_IMAGE_SIZE } from "./mapSvg";

const rows: DistanceRow[] = [
	{ name: "Musterstadt", km: 412.5, position: { lat: 53.55, lon: 9.99 } },
	{ name: "Beispielhausen <AG>", km: 302, position: { lat: 48.14, lon: 11.58 } }
];

const count = (svg: string, tag: string) => svg.split(`<${tag} `).length - 1;

describe("distanceMapSvg", () => {
	const svg = distanceMapSvg(rows);

	it("ist ein eigenständiges SVG mit fester Größe und weißem Hintergrund", () => {
		expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
		expect(svg).toContain(`width="${MAP_IMAGE_SIZE.width}" height="${MAP_IMAGE_SIZE.height}"`);
		expect(svg).toContain('fill="#ffffff"');
	});

	it("zeichnet Bundesländer, einen Punkt je Gliederung und den Stern", () => {
		expect(count(svg, "path")).toBe(17);
		expect(count(svg, "circle")).toBe(2);
		expect(svg).toContain("2 Gliederungen");
	});

	it("enthält keine Namen", () => {
		expect(svg).not.toContain("Musterstadt");
		expect(svg).not.toContain("<AG>");
	});
});
