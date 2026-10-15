/** Dateityp im Öffnen- oder Speichern-Dialog, z. B. „Excel“ mit `["xlsx"]`. */
export interface DialogFilter {
	name: string;
	extensions: string[];
}
