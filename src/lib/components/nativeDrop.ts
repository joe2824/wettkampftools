// Ablegen von Dateien aus dem Explorer: Die Desktop-Hülle meldet Pfade und Zeigerposition,
// hier wird die Ablagefläche unter dem Zeiger gesucht.
import { isTauri } from "$lib/platform/env";
import { listenFileDrop, type DropPayload } from "$lib/platform/inputFiles";

export type { DropPayload };

export interface Point {
	x: number;
	y: number;
}

interface Bounds {
	left: number;
	top: number;
	right: number;
	bottom: number;
	width: number;
	height: number;
}

export interface NativeDropZone {
	element: { getBoundingClientRect(): Bounds };
	onPaths: (paths: string[]) => void;
	onHover: (active: boolean) => void;
}

/** Physische Pixel der Desktop-Hülle in CSS-Pixel. */
export function toLogicalPoint(position: Point, scale: number): Point {
	const factor = scale > 0 ? scale : 1;
	return { x: position.x / factor, y: position.y / factor };
}

function contains(bounds: Bounds, point: Point): boolean {
	const visible = bounds.width > 0 && bounds.height > 0;
	return visible && point.x >= bounds.left && point.x <= bounds.right && point.y >= bounds.top && point.y <= bounds.bottom;
}

/** Fläche unter dem Zeiger; bei Überlagerung gewinnt die zuletzt angemeldete (z. B. im Dialog). */
export function zoneAt<T extends NativeDropZone>(point: Point, zones: readonly T[]): T | null {
	for (let index = zones.length - 1; index >= 0; index -= 1) {
		if (contains(zones[index].element.getBoundingClientRect(), point)) return zones[index];
	}
	return null;
}

/** Verteilt die Ereignisse der Desktop-Hülle auf die angemeldeten Flächen. */
export class NativeDropRouter {
	#zones: NativeDropZone[] = [];
	#hovered: NativeDropZone | null = null;
	#scale: () => number;

	constructor(scale: () => number) {
		this.#scale = scale;
	}

	get size(): number {
		return this.#zones.length;
	}

	register(zone: NativeDropZone): () => void {
		this.#zones = [...this.#zones, zone];
		return () => {
			this.#zones = this.#zones.filter((candidate) => candidate !== zone);
			if (this.#hovered === zone) this.#hover(null);
		};
	}

	handle(payload: DropPayload): void {
		if (payload.type === "leave") {
			this.#hover(null);
			return;
		}
		const target = zoneAt(toLogicalPoint(payload.position, this.#scale()), this.#zones);
		if (payload.type !== "drop") {
			this.#hover(target);
			return;
		}
		this.#hover(null);
		if (target && payload.paths.length > 0) target.onPaths(payload.paths);
	}

	#hover(zone: NativeDropZone | null): void {
		if (zone === this.#hovered) return;
		this.#hovered?.onHover(false);
		this.#hovered = zone;
		zone?.onHover(true);
	}
}

const router = new NativeDropRouter(() => window.devicePixelRatio);
let listening = false;

/** Meldet eine Ablagefläche an; das Lauschen beginnt erst mit der ersten Fläche. */
export function registerNativeDropZone(zone: NativeDropZone): () => void {
	if (!listening && isTauri()) {
		listening = true;
		void listenFileDrop((payload) => router.handle(payload)).catch(() => {
			listening = false;
		});
	}
	return router.register(zone);
}
