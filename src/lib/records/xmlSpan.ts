// Textbereich eines Elements in einem XML-Dokument, damit der Rest byte-genau erhalten bleibt.

export interface TextSpan {
	start: number;
	end: number;
}

/** Kommentare, CDATA, Verarbeitungsanweisungen und DOCTYPE werden übersprungen; Attribute dürfen „>“ enthalten. */
const TOKEN =
	/<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\?[\s\S]*?\?>|<!DOCTYPE[^>]*>|<(\/?)([A-Za-z_][\w.:-]*)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>/g;

class MalformedXmlError extends Error {
	constructor() {
		super("Ungültiges XML.");
		this.name = "MalformedXmlError";
	}
}

const samePath = (stack: readonly string[], path: readonly string[]): boolean =>
	stack.length === path.length && stack.every((name, i) => name === path[i]);

/**
 * Bereich des Elements mit genau diesem Pfad ab der Wurzel. null, wenn es fehlt
 * oder mehrfach vorkommt; wirft bei unausgeglichenen Tags.
 */
export function findElementSpan(xml: string, path: readonly string[]): TextSpan | null {
	const stack: string[] = [];
	const starts: number[] = [];
	const found: TextSpan[] = [];
	for (const match of xml.matchAll(TOKEN)) {
		const [token, closing, name, , selfClosing] = match;
		if (name === undefined) continue;
		const index = match.index;
		if (closing) {
			if (stack.at(-1) !== name) throw new MalformedXmlError();
			if (samePath(stack, path)) found.push({ start: starts.at(-1)!, end: index + token.length });
			stack.pop();
			starts.pop();
			continue;
		}
		stack.push(name);
		starts.push(index);
		if (selfClosing) {
			if (samePath(stack, path)) found.push({ start: index, end: index + token.length });
			stack.pop();
			starts.pop();
		}
	}
	if (stack.length > 0) throw new MalformedXmlError();
	return found.length === 1 ? found[0] : null;
}
