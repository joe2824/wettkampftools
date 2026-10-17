// Wellen-Zeiten früherer Wellenwettkämpfe, ohne Namen: je Jahr, Altersklasse, Geschlecht und Disziplin die
// schnellste Zeit ohne Strafe (time), die langsamste Zeit, der Durchschnitt aller Mannschaften und deren Anzahl.
// Quelle: JAuswertung-Exporte und -Wettkampfdateien ab 2007, davor die Excel-Auswertungen des Vereins.
// Jahre ohne auswertbare Datei fehlen (1999, 2002, 2010, 2015, 2020, 2021). Die früheren Senioren-AKs
// „AkW 120/170/180“ zählen als „AkW Senioren“. Gespeicherte Zeiten desselben Jahres aus dem App-Datenordner haben Vorrang.
import type { BestTimes } from "./bestTimes";

export const WAVE_HISTORY: readonly BestTimes[] = [
	{
		year: 2000,
		entries: [
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 22330,
				slowest: 27650,
				average: 25388,
				teams: 4
			},
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 16520,
				slowest: 19430,
				average: 18188,
				teams: 4
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 20620,
				slowest: 22360,
				average: 21490,
				teams: 2
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 16540,
				slowest: 16540,
				average: 15690,
				teams: 2
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 22210,
				slowest: 25500,
				average: 23987,
				teams: 3
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15470,
				slowest: 17430,
				average: 16660,
				teams: 3
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18830,
				slowest: 22100,
				average: 21004,
				teams: 5
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 13760,
				slowest: 15620,
				average: 14678,
				teams: 5
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 20160,
				slowest: 27100,
				average: 23630,
				teams: 2
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15790,
				slowest: 16110,
				average: 15950,
				teams: 2
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 17600,
				slowest: 20540,
				average: 19070,
				teams: 2
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 13190,
				slowest: 13770,
				average: 13480,
				teams: 2
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 23070,
				slowest: 26950,
				average: 25010,
				teams: 2
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 16930,
				slowest: 18600,
				average: 17765,
				teams: 2
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18240,
				slowest: 23540,
				average: 20029,
				teams: 8
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 13100,
				slowest: 19020,
				average: 14971,
				teams: 8
			}
		]
	},
	{
		year: 2001,
		entries: [
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 23150,
				slowest: 28600,
				average: 25378,
				teams: 5
			},
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 16220,
				slowest: 19950,
				average: 18516,
				teams: 5
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 22330,
				slowest: 24910,
				average: 23365,
				teams: 4
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 16360,
				slowest: 18080,
				average: 17022,
				teams: 4
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 22650,
				slowest: 25270,
				average: 23535,
				teams: 4
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 17020,
				slowest: 19870,
				average: 18470,
				teams: 4
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18240,
				slowest: 22700,
				average: 20604,
				teams: 5
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 13990,
				slowest: 17870,
				average: 15486,
				teams: 5
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 22890,
				slowest: 22890,
				average: 22890,
				teams: 1
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15810,
				slowest: 16460,
				average: 16135,
				teams: 2
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 17500,
				slowest: 20770,
				average: 18997,
				teams: 9
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 13490,
				slowest: 17740,
				average: 14878,
				teams: 9
			}
		]
	},
	{
		year: 2003,
		entries: [
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21530,
				slowest: 24620,
				average: 23075,
				teams: 2
			},
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 14620,
				slowest: 17780,
				average: 16200,
				teams: 2
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 20700,
				slowest: 24740,
				average: 22252,
				teams: 6
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 14370,
				slowest: 19910,
				average: 17010,
				teams: 6
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 20660,
				slowest: 29060,
				average: 22722,
				teams: 5
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15640,
				slowest: 19630,
				average: 17158,
				teams: 5
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18330,
				slowest: 20000,
				average: 19194,
				teams: 5
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 14510,
				slowest: 17270,
				average: 15594,
				teams: 5
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 23360,
				slowest: 23990,
				average: 23675,
				teams: 2
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 18090,
				slowest: 18540,
				average: 18315,
				teams: 2
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18350,
				slowest: 18810,
				average: 18580,
				teams: 2
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 13930,
				slowest: 14180,
				average: 14055,
				teams: 2
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 19860,
				slowest: 24230,
				average: 21678,
				teams: 5
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 16400,
				slowest: 17590,
				average: 16906,
				teams: 5
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 16920,
				slowest: 23770,
				average: 19611,
				teams: 9
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 13340,
				slowest: 16560,
				average: 14259,
				teams: 9
			}
		]
	},
	{
		year: 2004,
		entries: [
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 22060,
				slowest: 26010,
				average: 23507,
				teams: 3
			},
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 17510,
				slowest: 19240,
				average: 18567,
				teams: 3
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 21560,
				slowest: 24050,
				average: 23027,
				teams: 3
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 14720,
				slowest: 18890,
				average: 17380,
				teams: 3
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 22820,
				slowest: 23770,
				average: 23223,
				teams: 3
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 17120,
				slowest: 19820,
				average: 17820,
				teams: 3
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 20090,
				slowest: 22740,
				average: 21415,
				teams: 2
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 14390,
				slowest: 15020,
				average: 14705,
				teams: 2
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21590,
				slowest: 26800,
				average: 24017,
				teams: 3
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 14680,
				slowest: 17526,
				average: 16562,
				teams: 3
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18520,
				slowest: 20500,
				average: 19475,
				teams: 4
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 13020,
				slowest: 16920,
				average: 14690,
				teams: 4
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 17430,
				slowest: 17430,
				average: 17430,
				teams: 1
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18420,
				slowest: 23790,
				average: 20595,
				teams: 6
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 13320,
				slowest: 16110,
				average: 14395,
				teams: 6
			}
		]
	},
	{
		year: 2005,
		entries: [
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21250,
				slowest: 25350,
				average: 23615,
				teams: 8
			},
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 16500,
				slowest: 18890,
				average: 17641,
				teams: 8
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18860,
				slowest: 30660,
				average: 25387,
				teams: 7
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 16160,
				slowest: 22250,
				average: 18956,
				teams: 7
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21030,
				slowest: 22580,
				average: 21805,
				teams: 2
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15090,
				slowest: 20090,
				average: 17450,
				teams: 3
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 19100,
				slowest: 32760,
				average: 25014,
				teams: 5
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 14850,
				slowest: 22280,
				average: 18350,
				teams: 5
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 20530,
				slowest: 23720,
				average: 21750,
				teams: 3
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15220,
				slowest: 18200,
				average: 16987,
				teams: 3
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 17890,
				slowest: 20320,
				average: 19420,
				teams: 3
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 13240,
				slowest: 16990,
				average: 15003,
				teams: 3
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 20070,
				slowest: 24500,
				average: 21833,
				teams: 3
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15160,
				slowest: 17780,
				average: 16597,
				teams: 3
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18190,
				slowest: 23630,
				average: 20049,
				teams: 7
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 13610,
				slowest: 16620,
				average: 15057,
				teams: 7
			}
		]
	},
	{
		year: 2006,
		entries: [
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 20870,
				slowest: 24030,
				average: 22860,
				teams: 5
			},
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15860,
				slowest: 19660,
				average: 18116,
				teams: 5
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 21170,
				slowest: 26650,
				average: 23252,
				teams: 5
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15600,
				slowest: 21410,
				average: 18612,
				teams: 5
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 25290,
				slowest: 26870,
				average: 26080,
				teams: 2
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 16930,
				slowest: 21030,
				average: 18980,
				teams: 2
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 19000,
				slowest: 26640,
				average: 21760,
				teams: 4
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15290,
				slowest: 17150,
				average: 15985,
				teams: 4
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21830,
				slowest: 22600,
				average: 22215,
				teams: 2
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 16570,
				slowest: 17610,
				average: 17090,
				teams: 2
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18690,
				slowest: 20300,
				average: 19495,
				teams: 2
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 13900,
				slowest: 13980,
				average: 13940,
				teams: 2
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21630,
				slowest: 26010,
				average: 23098,
				teams: 5
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15970,
				slowest: 18860,
				average: 17814,
				teams: 5
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 17590,
				slowest: 22700,
				average: 18905,
				teams: 8
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 12890,
				slowest: 17960,
				average: 14245,
				teams: 8
			}
		]
	},
	{
		year: 2007,
		entries: [
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 22946,
				slowest: 30442,
				average: 26709,
				teams: 4
			},
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15998,
				slowest: 22039,
				average: 18397,
				teams: 4
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 19211,
				slowest: 22799,
				average: 21284,
				teams: 5
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15197,
				slowest: 17706,
				average: 16435,
				teams: 5
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21269,
				slowest: 28783,
				average: 23299,
				teams: 5
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15542,
				slowest: 19347,
				average: 17241,
				teams: 5
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18145,
				slowest: 23587,
				average: 20369,
				teams: 6
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 14422,
				slowest: 18405,
				average: 15818,
				teams: 6
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 22846,
				slowest: 24270,
				average: 23558,
				teams: 2
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 14935,
				slowest: 15881,
				average: 15408,
				teams: 2
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 22400,
				slowest: 22400,
				average: 22400,
				teams: 1
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15309,
				slowest: 15309,
				average: 15309,
				teams: 1
			},
			{
				ageGroup: "AkW Senioren",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 19257,
				slowest: 19257,
				average: 19257,
				teams: 1
			},
			{
				ageGroup: "AkW Senioren",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 13871,
				slowest: 13871,
				average: 13871,
				teams: 1
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21949,
				slowest: 25646,
				average: 23847,
				teams: 5
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 17214,
				slowest: 19732,
				average: 18399,
				teams: 5
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 17202,
				slowest: 25836,
				average: 20177,
				teams: 12
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 12551,
				slowest: 17427,
				average: 15224,
				teams: 12
			}
		]
	},
	{
		year: 2008,
		entries: [
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21540,
				slowest: 28613,
				average: 23718,
				teams: 6
			},
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 16836,
				slowest: 21473,
				average: 18896,
				teams: 6
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 20298,
				slowest: 32518,
				average: 23286,
				teams: 7
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 16522,
				slowest: 20414,
				average: 18009,
				teams: 7
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 20335,
				slowest: 25222,
				average: 22246,
				teams: 6
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15436,
				slowest: 18244,
				average: 17192,
				teams: 6
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18291,
				slowest: 26503,
				average: 21701,
				teams: 4
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15054,
				slowest: 19351,
				average: 17138,
				teams: 4
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 24169,
				slowest: 24169,
				average: 24169,
				teams: 1
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 18472,
				slowest: 18472,
				average: 18472,
				teams: 1
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 16973,
				slowest: 21834,
				average: 18697,
				teams: 6
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 14009,
				slowest: 18258,
				average: 15117,
				teams: 6
			},
			{
				ageGroup: "AkW Senioren",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21504,
				slowest: 21504,
				average: 21504,
				teams: 1
			},
			{
				ageGroup: "AkW Senioren",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 17934,
				slowest: 29548,
				average: 22201,
				teams: 3
			},
			{
				ageGroup: "AkW Senioren",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 13490,
				slowest: 17467,
				average: 15192,
				teams: 3
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21785,
				slowest: 23320,
				average: 22179,
				teams: 4
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 16187,
				slowest: 18460,
				average: 17743,
				teams: 4
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 16221,
				slowest: 22293,
				average: 19850,
				teams: 9
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 12588,
				slowest: 19444,
				average: 15500,
				teams: 10
			}
		]
	},
	{
		year: 2009,
		entries: [
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 20655,
				slowest: 26855,
				average: 22851,
				teams: 7
			},
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 16192,
				slowest: 19129,
				average: 17144,
				teams: 7
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18612,
				slowest: 24595,
				average: 22058,
				teams: 8
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15677,
				slowest: 19980,
				average: 17416,
				teams: 8
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21354,
				slowest: 27372,
				average: 23758,
				teams: 3
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15869,
				slowest: 19269,
				average: 17224,
				teams: 3
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 17470,
				slowest: 24213,
				average: 21283,
				teams: 6
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 13380,
				slowest: 18767,
				average: 16175,
				teams: 6
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 20356,
				slowest: 24670,
				average: 22163,
				teams: 5
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15537,
				slowest: 18361,
				average: 17003,
				teams: 5
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 17423,
				slowest: 22102,
				average: 19611,
				teams: 6
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 13873,
				slowest: 16960,
				average: 15007,
				teams: 6
			},
			{
				ageGroup: "AkW Senioren",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21219,
				slowest: 21219,
				average: 21219,
				teams: 1
			},
			{
				ageGroup: "AkW Senioren",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 17218,
				slowest: 17218,
				average: 17218,
				teams: 1
			},
			{
				ageGroup: "AkW Senioren",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 16929,
				slowest: 21080,
				average: 19004,
				teams: 2
			},
			{
				ageGroup: "AkW Senioren",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 13908,
				slowest: 22565,
				average: 17238,
				teams: 3
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21226,
				slowest: 27187,
				average: 23392,
				teams: 3
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 16360,
				slowest: 18716,
				average: 17347,
				teams: 3
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 17075,
				slowest: 25348,
				average: 19640,
				teams: 9
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 12665,
				slowest: 18709,
				average: 14577,
				teams: 9
			}
		]
	},
	{
		year: 2011,
		entries: [
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 20592,
				slowest: 30381,
				average: 23712,
				teams: 5
			},
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15705,
				slowest: 21156,
				average: 17925,
				teams: 5
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 19715,
				slowest: 24862,
				average: 21959,
				teams: 8
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 14468,
				slowest: 20014,
				average: 16878,
				teams: 8
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 19981,
				slowest: 25995,
				average: 22277,
				teams: 10
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15416,
				slowest: 21557,
				average: 17206,
				teams: 10
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 16875,
				slowest: 25163,
				average: 21409,
				teams: 6
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 14419,
				slowest: 18704,
				average: 16099,
				teams: 5
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 20988,
				slowest: 27321,
				average: 23976,
				teams: 3
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15993,
				slowest: 20969,
				average: 17800,
				teams: 3
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18285,
				slowest: 23062,
				average: 21625,
				teams: 5
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 14361,
				slowest: 17991,
				average: 15723,
				teams: 5
			},
			{
				ageGroup: "AkW Senioren",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 22274,
				slowest: 22519,
				average: 22396,
				teams: 2
			},
			{
				ageGroup: "AkW Senioren",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15254,
				slowest: 17275,
				average: 16264,
				teams: 2
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 20813,
				slowest: 27109,
				average: 22940,
				teams: 5
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15147,
				slowest: 18719,
				average: 16604,
				teams: 5
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18020,
				slowest: 22094,
				average: 19353,
				teams: 9
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 13474,
				slowest: 16391,
				average: 14644,
				teams: 9
			}
		]
	},
	{
		year: 2012,
		entries: [
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21181,
				slowest: 22365,
				average: 21850,
				teams: 5
			},
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 16034,
				slowest: 17720,
				average: 16754,
				teams: 5
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 19406,
				slowest: 25867,
				average: 22148,
				teams: 6
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 16009,
				slowest: 20722,
				average: 17520,
				teams: 6
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 19572,
				slowest: 21458,
				average: 20533,
				teams: 3
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15260,
				slowest: 17919,
				average: 16237,
				teams: 3
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 19056,
				slowest: 24134,
				average: 21281,
				teams: 5
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 14342,
				slowest: 17776,
				average: 15681,
				teams: 5
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 22768,
				slowest: 23292,
				average: 23030,
				teams: 2
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15725,
				slowest: 16590,
				average: 16158,
				teams: 2
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 17906,
				slowest: 22221,
				average: 19850,
				teams: 4
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 13372,
				slowest: 15607,
				average: 14942,
				teams: 4
			},
			{
				ageGroup: "AkW Senioren",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18771,
				slowest: 21917,
				average: 20344,
				teams: 2
			},
			{
				ageGroup: "AkW Senioren",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 14497,
				slowest: 15527,
				average: 15012,
				teams: 2
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 20878,
				slowest: 27541,
				average: 23193,
				teams: 5
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 16184,
				slowest: 18158,
				average: 16966,
				teams: 6
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 17294,
				slowest: 23773,
				average: 19429,
				teams: 8
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 12676,
				slowest: 15390,
				average: 13827,
				teams: 8
			}
		]
	},
	{
		year: 2013,
		entries: [
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 20757,
				slowest: 31716,
				average: 24712,
				teams: 6
			},
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 16718,
				slowest: 22697,
				average: 18719,
				teams: 6
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18984,
				slowest: 28010,
				average: 23361,
				teams: 6
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15685,
				slowest: 20352,
				average: 17751,
				teams: 6
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21471,
				slowest: 23990,
				average: 22673,
				teams: 5
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 16940,
				slowest: 18281,
				average: 17567,
				teams: 5
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18036,
				slowest: 27485,
				average: 21235,
				teams: 7
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 13951,
				slowest: 18826,
				average: 15568,
				teams: 7
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 20600,
				slowest: 21239,
				average: 20925,
				teams: 3
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15866,
				slowest: 16104,
				average: 15946,
				teams: 3
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18746,
				slowest: 21512,
				average: 19870,
				teams: 3
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 13701,
				slowest: 17824,
				average: 16052,
				teams: 3
			},
			{
				ageGroup: "AkW Senioren",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 14562,
				slowest: 19043,
				average: 16802,
				teams: 2
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 20821,
				slowest: 23037,
				average: 21685,
				teams: 3
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15120,
				slowest: 17770,
				average: 16754,
				teams: 3
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 12663,
				slowest: 18177,
				average: 14951,
				teams: 6
			}
		]
	},
	{
		year: 2014,
		entries: [
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21453,
				slowest: 25154,
				average: 23594,
				teams: 4
			},
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 16978,
				slowest: 20101,
				average: 18490,
				teams: 4
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 20771,
				slowest: 24034,
				average: 22342,
				teams: 5
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 16014,
				slowest: 17709,
				average: 16724,
				teams: 5
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 19253,
				slowest: 23685,
				average: 21466,
				teams: 4
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 15927,
				slowest: 19703,
				average: 17450,
				teams: 4
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18028,
				slowest: 26002,
				average: 21645,
				teams: 5
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 13222,
				slowest: 17866,
				average: 15835,
				teams: 5
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 23574,
				slowest: 23574,
				average: 23574,
				teams: 2
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 16657,
				slowest: 18675,
				average: 17666,
				teams: 2
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 16954,
				slowest: 20936,
				average: 18767,
				teams: 4
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 13807,
				slowest: 16035,
				average: 14837,
				teams: 4
			},
			{
				ageGroup: "AkW Senioren",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 17114,
				slowest: 21758,
				average: 19436,
				teams: 2
			},
			{
				ageGroup: "AkW Senioren",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 13803,
				slowest: 15426,
				average: 14614,
				teams: 2
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 22421,
				slowest: 22787,
				average: 22604,
				teams: 2
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Schwimmen in der Welle",
				time: 16863,
				slowest: 17338,
				average: 17100,
				teams: 2
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 17387,
				slowest: 21289,
				average: 18968,
				teams: 7
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Schwimmen in der Welle",
				time: 13468,
				slowest: 15511,
				average: 14544,
				teams: 7
			}
		]
	},
	{
		year: 2016,
		entries: [
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21677,
				slowest: 24578,
				average: 22915,
				teams: 5
			},
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 13730,
				slowest: 15846,
				average: 14903,
				teams: 5
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 19491,
				slowest: 28871,
				average: 24220,
				teams: 7
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 13037,
				slowest: 16734,
				average: 14595,
				teams: 7
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 22626,
				slowest: 29693,
				average: 26160,
				teams: 2
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 15613,
				slowest: 15947,
				average: 15780,
				teams: 2
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18427,
				slowest: 23166,
				average: 20757,
				teams: 6
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 11949,
				slowest: 17860,
				average: 14398,
				teams: 6
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 20617,
				slowest: 20617,
				average: 20617,
				teams: 1
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 12747,
				slowest: 12747,
				average: 12747,
				teams: 1
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 17455,
				slowest: 21053,
				average: 19240,
				teams: 4
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 11515,
				slowest: 13866,
				average: 12604,
				teams: 4
			},
			{
				ageGroup: "AkW Senioren",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21229,
				slowest: 21229,
				average: 21229,
				teams: 1
			},
			{
				ageGroup: "AkW Senioren",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 11726,
				slowest: 11726,
				average: 11726,
				teams: 1
			},
			{
				ageGroup: "AkW Senioren",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 22861,
				slowest: 25282,
				average: 24072,
				teams: 2
			},
			{
				ageGroup: "AkW Senioren",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 13957,
				slowest: 15695,
				average: 14826,
				teams: 2
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 22105,
				slowest: 22597,
				average: 22351,
				teams: 2
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 13175,
				slowest: 14259,
				average: 13717,
				teams: 2
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18038,
				slowest: 19988,
				average: 19274,
				teams: 6
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 10806,
				slowest: 12448,
				average: 11714,
				teams: 6
			}
		]
	},
	{
		year: 2017,
		entries: [
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21601,
				slowest: 23898,
				average: 22506,
				teams: 4
			},
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 16111,
				slowest: 16242,
				average: 14990,
				teams: 4
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 21437,
				slowest: 31879,
				average: 25716,
				teams: 5
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 14431,
				slowest: 18146,
				average: 15878,
				teams: 5
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21297,
				slowest: 26899,
				average: 23570,
				teams: 5
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 13604,
				slowest: 14892,
				average: 14142,
				teams: 5
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18671,
				slowest: 23716,
				average: 20784,
				teams: 5
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 12112,
				slowest: 13796,
				average: 12723,
				teams: 5
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21634,
				slowest: 25313,
				average: 23474,
				teams: 2
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 14140,
				slowest: 14374,
				average: 14257,
				teams: 2
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 19945,
				slowest: 22814,
				average: 21262,
				teams: 4
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 11626,
				slowest: 14323,
				average: 12720,
				teams: 4
			},
			{
				ageGroup: "AkW Senioren",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 21778,
				slowest: 23571,
				average: 22674,
				teams: 2
			},
			{
				ageGroup: "AkW Senioren",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 13410,
				slowest: 14869,
				average: 14140,
				teams: 2
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21731,
				slowest: 25631,
				average: 23450,
				teams: 5
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 13548,
				slowest: 16622,
				average: 14802,
				teams: 5
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 17478,
				slowest: 19395,
				average: 18511,
				teams: 5
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 10330,
				slowest: 12426,
				average: 11016,
				teams: 5
			}
		]
	},
	{
		year: 2018,
		entries: [
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 22739,
				slowest: 24679,
				average: 23196,
				teams: 7
			},
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 12577,
				slowest: 16058,
				average: 14344,
				teams: 8
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 21450,
				slowest: 22031,
				average: 21661,
				teams: 3
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 12478,
				slowest: 15288,
				average: 13664,
				teams: 3
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21693,
				slowest: 27217,
				average: 23638,
				teams: 6
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 12343,
				slowest: 15675,
				average: 14361,
				teams: 6
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18350,
				slowest: 21547,
				average: 20308,
				teams: 4
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 11744,
				slowest: 14010,
				average: 13079,
				teams: 4
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21029,
				slowest: 23929,
				average: 22479,
				teams: 2
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 13247,
				slowest: 14336,
				average: 13792,
				teams: 2
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 20208,
				slowest: 20208,
				average: 20208,
				teams: 1
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 10213,
				slowest: 10213,
				average: 10213,
				teams: 1
			},
			{
				ageGroup: "AkW Senioren",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 24316,
				slowest: 24316,
				average: 24316,
				teams: 1
			},
			{
				ageGroup: "AkW Senioren",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 13955,
				slowest: 13955,
				average: 13955,
				teams: 1
			},
			{
				ageGroup: "AkW Senioren",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 21485,
				slowest: 21485,
				average: 21485,
				teams: 1
			},
			{
				ageGroup: "AkW Senioren",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 11732,
				slowest: 11732,
				average: 11732,
				teams: 1
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 20894,
				slowest: 24806,
				average: 22499,
				teams: 7
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 11925,
				slowest: 14280,
				average: 13133,
				teams: 7
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 16702,
				slowest: 26627,
				average: 20428,
				teams: 6
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 10286,
				slowest: 14204,
				average: 11856,
				teams: 6
			}
		]
	},
	{
		year: 2019,
		entries: [
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 22297,
				slowest: 26540,
				average: 23828,
				teams: 5
			},
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 13093,
				slowest: 17131,
				average: 15385,
				teams: 5
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 21012,
				slowest: 27710,
				average: 24348,
				teams: 7
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 13407,
				slowest: 17675,
				average: 15543,
				teams: 7
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21420,
				slowest: 29925,
				average: 24165,
				teams: 4
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 13304,
				slowest: 16065,
				average: 14334,
				teams: 4
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 19845,
				slowest: 26497,
				average: 22382,
				teams: 9
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 12774,
				slowest: 15658,
				average: 14118,
				teams: 9
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 20576,
				slowest: 29928,
				average: 24939,
				teams: 4
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 12760,
				slowest: 16488,
				average: 14558,
				teams: 4
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 20247,
				slowest: 23802,
				average: 21884,
				teams: 4
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 12013,
				slowest: 17835,
				average: 13622,
				teams: 4
			},
			{
				ageGroup: "AkW Senioren",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 24363,
				slowest: 24363,
				average: 24363,
				teams: 1
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21129,
				slowest: 25903,
				average: 23573,
				teams: 7
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 12131,
				slowest: 15488,
				average: 13866,
				teams: 7
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 17866,
				slowest: 24209,
				average: 21424,
				teams: 5
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 9913,
				slowest: 15727,
				average: 13304,
				teams: 5
			}
		]
	},
	{
		year: 2022,
		entries: [
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 22106,
				slowest: 26280,
				average: 24844,
				teams: 4
			},
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 15304,
				slowest: 16625,
				average: 15723,
				teams: 4
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 21711,
				slowest: 33467,
				average: 25026,
				teams: 7
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 13788,
				slowest: 23849,
				average: 17331,
				teams: 7
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 22748,
				slowest: 28102,
				average: 24993,
				teams: 5
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 14053,
				slowest: 17680,
				average: 15723,
				teams: 5
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 19565,
				slowest: 24653,
				average: 21182,
				teams: 7
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 10519,
				slowest: 15645,
				average: 13513,
				teams: 7
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 23066,
				slowest: 25397,
				average: 24046,
				teams: 3
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 13618,
				slowest: 14884,
				average: 14220,
				teams: 3
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 19578,
				slowest: 19578,
				average: 19578,
				teams: 1
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 10986,
				slowest: 10986,
				average: 10986,
				teams: 1
			},
			{
				ageGroup: "AkW Senioren",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 24797,
				slowest: 24797,
				average: 24797,
				teams: 1
			},
			{
				ageGroup: "AkW Senioren",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 16192,
				slowest: 16192,
				average: 16192,
				teams: 1
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 22015,
				slowest: 25721,
				average: 23370,
				teams: 3
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 12986,
				slowest: 15078,
				average: 13932,
				teams: 3
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18064,
				slowest: 21249,
				average: 19633,
				teams: 5
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 11597,
				slowest: 12831,
				average: 12168,
				teams: 5
			}
		]
	},
	{
		year: 2023,
		entries: [
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21186,
				slowest: 25177,
				average: 23993,
				teams: 4
			},
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 14199,
				slowest: 15828,
				average: 14782,
				teams: 4
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 20171,
				slowest: 30468,
				average: 24271,
				teams: 6
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 12714,
				slowest: 15450,
				average: 14056,
				teams: 6
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 22351,
				slowest: 26406,
				average: 24468,
				teams: 4
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 13421,
				slowest: 14828,
				average: 14271,
				teams: 4
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18522,
				slowest: 28579,
				average: 22129,
				teams: 7
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 10983,
				slowest: 20309,
				average: 13939,
				teams: 7
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 24928,
				slowest: 24928,
				average: 24928,
				teams: 1
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 13584,
				slowest: 13584,
				average: 13584,
				teams: 1
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 23734,
				slowest: 25905,
				average: 24820,
				teams: 2
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 14724,
				slowest: 14853,
				average: 14788,
				teams: 2
			},
			{
				ageGroup: "AkW Senioren",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 23411,
				slowest: 33903,
				average: 28657,
				teams: 2
			},
			{
				ageGroup: "AkW Senioren",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 15115,
				slowest: 17618,
				average: 16366,
				teams: 2
			},
			{
				ageGroup: "AkW Senioren",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 25477,
				slowest: 28052,
				average: 26764,
				teams: 2
			},
			{
				ageGroup: "AkW Senioren",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 13994,
				slowest: 15091,
				average: 14542,
				teams: 2
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 22398,
				slowest: 27935,
				average: 24729,
				teams: 5
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 12848,
				slowest: 14883,
				average: 14010,
				teams: 5
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18329,
				slowest: 27854,
				average: 21168,
				teams: 10
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 10409,
				slowest: 14008,
				average: 12448,
				teams: 10
			}
		]
	},
	{
		year: 2024,
		entries: [
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 22572,
				slowest: 29887,
				average: 26344,
				teams: 6
			},
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 14904,
				slowest: 18811,
				average: 16922,
				teams: 6
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 19283,
				slowest: 23975,
				average: 21621,
				teams: 6
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 12070,
				slowest: 16022,
				average: 13662,
				teams: 6
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21814,
				slowest: 24773,
				average: 23039,
				teams: 5
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 12799,
				slowest: 15270,
				average: 13951,
				teams: 5
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 20071,
				slowest: 20071,
				average: 20071,
				teams: 1
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 14867,
				slowest: 14867,
				average: 14867,
				teams: 1
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 24031,
				slowest: 25056,
				average: 24507,
				teams: 3
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 14395,
				slowest: 15702,
				average: 15144,
				teams: 3
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 23142,
				slowest: 23142,
				average: 23142,
				teams: 1
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 11597,
				slowest: 11597,
				average: 11597,
				teams: 1
			},
			{
				ageGroup: "AkW Senioren",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 24295,
				slowest: 24295,
				average: 24295,
				teams: 1
			},
			{
				ageGroup: "AkW Senioren",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 14876,
				slowest: 14876,
				average: 14876,
				teams: 1
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21203,
				slowest: 26553,
				average: 23651,
				teams: 6
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 11459,
				slowest: 16566,
				average: 13615,
				teams: 6
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 17451,
				slowest: 30147,
				average: 22049,
				teams: 10
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 10052,
				slowest: 18691,
				average: 13134,
				teams: 10
			}
		]
	},
	{
		year: 2025,
		entries: [
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21294,
				slowest: 27870,
				average: 25388,
				teams: 8
			},
			{
				ageGroup: "AkW 13/14",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 11660,
				slowest: 19132,
				average: 15691,
				teams: 8
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 20069,
				slowest: 25205,
				average: 21769,
				teams: 4
			},
			{
				ageGroup: "AkW 13/14",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 12403,
				slowest: 15294,
				average: 13438,
				teams: 4
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 23848,
				slowest: 26740,
				average: 25232,
				teams: 3
			},
			{
				ageGroup: "AkW 15/16",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 14015,
				slowest: 14841,
				average: 14341,
				teams: 3
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 18585,
				slowest: 22733,
				average: 20263,
				teams: 5
			},
			{
				ageGroup: "AkW 15/16",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 9876,
				slowest: 14313,
				average: 12037,
				teams: 5
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 21551,
				slowest: 24346,
				average: 22647,
				teams: 3
			},
			{
				ageGroup: "AkW 17/18",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 12292,
				slowest: 13055,
				average: 12678,
				teams: 3
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 19193,
				slowest: 22745,
				average: 20969,
				teams: 2
			},
			{
				ageGroup: "AkW 17/18",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 10667,
				slowest: 12856,
				average: 11762,
				teams: 2
			},
			{
				ageGroup: "AkW Senioren",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 23360,
				slowest: 23360,
				average: 23360,
				teams: 1
			},
			{
				ageGroup: "AkW Senioren",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 14991,
				slowest: 14991,
				average: 14991,
				teams: 1
			},
			{
				ageGroup: "AkW Senioren",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 22908,
				slowest: 23282,
				average: 23095,
				teams: 2
			},
			{
				ageGroup: "AkW Senioren",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 13077,
				slowest: 14702,
				average: 13890,
				teams: 2
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle",
				time: 20560,
				slowest: 24488,
				average: 22506,
				teams: 6
			},
			{
				ageGroup: "AkW offen",
				gender: "female",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 11182,
				slowest: 13413,
				average: 12217,
				teams: 6
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle",
				time: 17335,
				slowest: 25207,
				average: 21676,
				teams: 6
			},
			{
				ageGroup: "AkW offen",
				gender: "male",
				discipline: "4*50m Retten in der Welle mit Gurtretter",
				time: 10490,
				slowest: 12813,
				average: 11960,
				teams: 6
			}
		]
	}
];
