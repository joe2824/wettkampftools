// Lizenzen und Quellen, die nicht aus Paketen stammen (von Hand gepflegt).
// Jede Adresse muss im Opener freigegeben sein (src-tauri/capabilities/default.json).
import { AUTHOR, PROJECT_URL } from "./about";
import { APP_NAME } from "./appName";

export interface CreditLink {
	label: string;
	url: string;
}

export interface Credit {
	title: string;
	license: string;
	/** Urheberrechtsvermerk, wörtlich aus der Lizenzdatei. */
	copyright?: string;
	text: string;
	links: CreditLink[];
}

export const NUNITO_DOWNLOAD_URL = "https://fonts.google.com/specimen/Nunito";

export const CREDITS: Credit[] = [
	{
		title: APP_NAME,
		license: "MIT",
		copyright: `Copyright (c) 2023 ${AUTHOR} (joe2824)`,
		text: "Dieses Programm ist freie Software unter der MIT-Lizenz.",
		links: [{ label: "Lizenztext", url: `${PROJECT_URL}/blob/main/LICENSE.txt` }]
	},
	{
		title: "Schrift Nunito",
		license: "SIL Open Font License 1.1",
		copyright: "Copyright 2014 The Nunito Project Authors (https://github.com/googlefonts/nunito)",
		text: "In die Anwendung und in erzeugte PDFs eingebettet; die Lizenz erlaubt das ausdrücklich.",
		links: [
			{ label: "Lizenz", url: "https://openfontlicense.org/" },
			{ label: "Google Fonts", url: NUNITO_DOWNLOAD_URL }
		]
	},
	{
		title: "Deutschlandkarte",
		license: "Gemeinfrei",
		text: "Kartendaten von Natural Earth, vereinfacht.",
		links: [{ label: "naturalearthdata.com", url: "https://www.naturalearthdata.com/" }]
	},
	{
		title: "DLRG-Standortdaten",
		license: "Datenquelle",
		text: "Öffentliche Standortdaten der DLRG (services.dlrg.net). Werden bei Bedarf abgerufen und nicht mitgeliefert.",
		links: []
	},
	{
		title: "Regelwerke aus JAuswertung",
		license: "Datenquelle",
		text: "Offizielle Regelwerke aus dem Projekt JAuswertung. Werden bei Bedarf geladen und nicht mitgeliefert.",
		links: [{ label: "JAuswertung", url: "https://github.com/dennisfabri/JAuswertung" }]
	},
	{
		title: "Bedienelemente",
		license: "MIT",
		text: "Die Bedienelemente beruhen auf shadcn-svelte.",
		links: [{ label: "shadcn-svelte.com", url: "https://shadcn-svelte.com/" }]
	}
];
