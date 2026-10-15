// XStream-Verweise (reference="…") auflösen: XPath-Pfade relativ zum Element oder ab der Wurzel.

const STEP = /^([A-Za-z_][\w.:-]*)(?:\[(\d+)\])?$/;

export type BlockReferenceCheck = "ok" | "inside" | "into" | "unresolved";

function childStep(node: Node, step: string): Element | null {
	const match = STEP.exec(step);
	if (!match) return null;
	const [, tag, position] = match;
	const children = Array.from(node.childNodes).filter((n): n is Element => n.nodeType === 1 && n.nodeName === tag);
	return children[Number(position ?? 1) - 1] ?? null;
}

/** Alle durchlaufenen Elemente bis zum Ziel (letztes Element); null, wenn der Pfad nicht passt. */
export function resolveReference(from: Element, path: string): Element[] | null {
	const absolute = path.startsWith("/");
	let current: Node | null = absolute ? from.ownerDocument : from;
	const visited: Element[] = [];
	for (const step of (absolute ? path.slice(1) : path).split("/")) {
		current = step === ".." ? current.parentNode : childStep(current, step);
		if (current === null || current.nodeType !== 1) return null;
		visited.push(current as Element);
	}
	return visited.length > 0 ? visited : null;
}

/**
 * Darf `block` ersetzt werden? Nein, wenn er selbst Verweise enthält, ein Verweis
 * von außen hinein- oder durch ihn hindurchführt oder ein Verweis nicht auflösbar ist.
 */
export function checkBlockReferences(root: Element, block: Element): BlockReferenceCheck {
	for (const element of [root, ...Array.from(root.getElementsByTagName("*"))]) {
		const path = element.getAttribute("reference");
		if (path === null) continue;
		if (block.contains(element)) return "inside";
		const visited = resolveReference(element, path);
		if (visited === null) return "unresolved";
		if (visited.some((node) => block.contains(node))) return "into";
	}
	return "ok";
}
