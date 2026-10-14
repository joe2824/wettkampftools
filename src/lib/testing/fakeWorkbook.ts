// Arbeitsmappe im Speicher für Tests: "Excel-Datei" ist einfach JSON.
import type { Sheet, WorkbookAdapter, WorkbookProperties } from "$lib/platform/workbook";

const READ_ERROR = "Die Datei konnte nicht als Excel-Tabelle gelesen werden.";

export interface FakeWorkbookOptions {
	properties?: WorkbookProperties;
}

export function createFakeWorkbookAdapter(options: FakeWorkbookOptions = {}): WorkbookAdapter {
	const properties = options.properties ?? { created: null, modified: null };
	return {
		write: async (sheets) => new TextEncoder().encode(JSON.stringify(sheets)),
		read: async (bytes) => {
			let sheets: Sheet[];
			try {
				sheets = JSON.parse(new TextDecoder().decode(bytes));
			} catch {
				throw new Error(READ_ERROR);
			}
			return { sheets, properties: { ...properties } };
		}
	};
}
