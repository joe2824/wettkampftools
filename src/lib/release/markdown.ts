// Kleiner Markdown-Leser für Release-Notes: Überschriften, Listen, Absätze, Fett, Kursiv, Code, Links.
// Erzeugt Bausteine statt HTML, damit nichts aus den Notes als Markup ins Fenster gelangt.

export type Inline =
	| { kind: "text"; text: string }
	| { kind: "strong"; children: Inline[] }
	| { kind: "em"; children: Inline[] }
	| { kind: "code"; text: string }
	| { kind: "link"; url: string; children: Inline[] };

export type Block =
	| { kind: "heading"; level: 1 | 2 | 3; children: Inline[] }
	| { kind: "list"; ordered: boolean; items: Inline[][] }
	| { kind: "paragraph"; children: Inline[] };

const HEADING = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const BULLET = /^\s*[-*+]\s+(.*)$/;
const NUMBERED = /^\s*\d+[.)]\s+(.*)$/;
const CONTINUATION = /^\s+\S/;
const SAFE_URL = /^https?:\/\//i;

const INLINE =
	/(`[^`]+`)|\*\*(.+?)\*\*|__(.+?)__|(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])|(?<!\w)_(?!\s)(.+?)(?<!\s)_(?!\w)|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function parseInline(text: string): Inline[] {
	const result: Inline[] = [];
	let last = 0;
	for (const match of text.matchAll(INLINE)) {
		const index = match.index ?? 0;
		if (index > last) result.push({ kind: "text", text: text.slice(last, index) });
		const [, code, strongA, strongB, emA, emB, linkText, url] = match;
		if (code) result.push({ kind: "code", text: code.slice(1, -1) });
		else if (strongA ?? strongB) result.push({ kind: "strong", children: parseInline(strongA ?? strongB) });
		else if (emA ?? emB) result.push({ kind: "em", children: parseInline(emA ?? emB) });
		else if (SAFE_URL.test(url)) result.push({ kind: "link", url, children: parseInline(linkText) });
		else result.push(...parseInline(linkText));
		last = index + match[0].length;
	}
	if (last < text.length) result.push({ kind: "text", text: text.slice(last) });
	return result;
}

function listMatch(line: string): { ordered: boolean; text: string } | null {
	const bullet = BULLET.exec(line);
	if (bullet) return { ordered: false, text: bullet[1] };
	const numbered = NUMBERED.exec(line);
	return numbered ? { ordered: true, text: numbered[1] } : null;
}

export function parseMarkdown(source: string): Block[] {
	const blocks: Block[] = [];
	let paragraph: string[] = [];
	let list: { ordered: boolean; items: string[] } | null = null;

	const flush = () => {
		if (paragraph.length > 0) blocks.push({ kind: "paragraph", children: parseInline(paragraph.join(" ")) });
		if (list) blocks.push({ kind: "list", ordered: list.ordered, items: list.items.map(parseInline) });
		paragraph = [];
		list = null;
	};

	for (const line of source.replace(/\r\n?/g, "\n").split("\n")) {
		if (line.trim() === "") {
			flush();
			continue;
		}
		const heading = HEADING.exec(line);
		if (heading) {
			flush();
			const level = Math.min(heading[1].length, 3) as 1 | 2 | 3;
			blocks.push({ kind: "heading", level, children: parseInline(heading[2]) });
			continue;
		}
		const item = listMatch(line);
		if (item) {
			if (paragraph.length > 0 || (list && list.ordered !== item.ordered)) flush();
			list ??= { ordered: item.ordered, items: [] };
			list.items.push(item.text.trim());
			continue;
		}
		if (list && CONTINUATION.test(line)) {
			list.items[list.items.length - 1] += ` ${line.trim()}`;
			continue;
		}
		if (list) flush();
		paragraph.push(line.trim());
	}
	flush();
	return blocks;
}
