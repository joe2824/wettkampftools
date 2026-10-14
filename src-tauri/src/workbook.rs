//! Excel-Arbeitsmappen lesen (.xls/.xlsx) und schreiben (.xlsx).
//!
//! Datumszellen kommen als Excel-Seriennummer (Zahl) zurück, Fehlerzellen als Text
//! (z. B. "#DIV/0!"). Leere Zeilen und Spalten am Ende werden abgeschnitten, alle
//! Zeilen eines Blatts sind gleich lang.

mod properties;
mod read;
mod write;
#[cfg(test)]
mod xls_fixture;

use serde::{Deserialize, Serialize};
use tauri::ipc::{InvokeBody, Request, Response};

pub use read::parse_workbook;
pub use write::build_workbook;

/// Inhalt einer Zelle; im JSON string | number | boolean | null.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(untagged)]
pub enum Cell {
    Text(String),
    Number(f64),
    Bool(bool),
    Empty,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Sheet {
    pub name: String,
    pub rows: Vec<Vec<Cell>>,
}

/// Dokumenteigenschaften als ISO-Zeitpunkt, soweit vorhanden (nur .xlsx).
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkbookProperties {
    pub created: Option<String>,
    pub modified: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Workbook {
    pub sheets: Vec<Sheet>,
    pub properties: WorkbookProperties,
}

pub const READ_ERROR: &str = "Die Datei konnte nicht als Excel-Tabelle gelesen werden.";

/// Liest eine Arbeitsmappe; die Dateibytes kommen als roher Request-Body
/// (Uint8Array), nicht als JSON-Zahlenliste.
#[tauri::command]
pub async fn read_workbook(request: Request<'_>) -> Result<Workbook, String> {
    match request.body() {
        InvokeBody::Raw(bytes) => parse_workbook(bytes),
        InvokeBody::Json(_) => Err(READ_ERROR.to_string()),
    }
}

/// Schreibt die Blätter als .xlsx und gibt die Bytes roh zurück (ArrayBuffer).
#[tauri::command]
pub async fn write_workbook(sheets: Vec<Sheet>) -> Result<Response, String> {
    build_workbook(&sheets).map(Response::new)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn text(value: &str) -> Cell {
        Cell::Text(value.to_string())
    }

    fn sample_sheets() -> Vec<Sheet> {
        vec![
            Sheet {
                name: "Daten".into(),
                rows: vec![
                    vec![
                        text("Name"),
                        text("Gliederung"),
                        text("Punkte"),
                        text("Mitglied"),
                    ],
                    vec![
                        text("Anna Meier"),
                        text("Musterstadt"),
                        Cell::Number(1234.5),
                        Cell::Bool(true),
                    ],
                    vec![
                        text("Max Mustermann"),
                        Cell::Empty,
                        Cell::Number(-7.0),
                        Cell::Bool(false),
                    ],
                    vec![
                        Cell::Empty,
                        text("Beispielhausen – Größe"),
                        Cell::Empty,
                        Cell::Empty,
                    ],
                ],
            },
            Sheet {
                name: "Übersicht".into(),
                rows: vec![vec![text("ä ö ü ß"), Cell::Number(0.0)]],
            },
        ]
    }

    #[test]
    fn round_trip_keeps_names_types_and_empty_cells() {
        let sheets = sample_sheets();
        let bytes = build_workbook(&sheets).expect("schreiben");
        let book = parse_workbook(&bytes).expect("lesen");
        assert_eq!(book.sheets, sheets);
    }

    #[test]
    fn round_trip_reads_created_and_modified() {
        let bytes = build_workbook(&sample_sheets()).expect("schreiben");
        let props = parse_workbook(&bytes).expect("lesen").properties;
        let created = props.created.expect("Erstellungsdatum");
        assert!(created.len() >= "2026-01-01T00:00:00Z".len(), "{created}");
        assert!(created.starts_with("20"), "{created}");
        assert!(props.modified.is_some());
    }

    #[test]
    fn cells_serialize_as_plain_json_values() {
        let row = vec![text("a"), Cell::Number(1.5), Cell::Bool(true), Cell::Empty];
        assert_eq!(
            serde_json::to_string(&row).unwrap(),
            r#"["a",1.5,true,null]"#
        );
        let parsed: Vec<Cell> = serde_json::from_str(r#"["a",2,false,null]"#).unwrap();
        assert_eq!(
            parsed,
            vec![text("a"), Cell::Number(2.0), Cell::Bool(false), Cell::Empty]
        );
    }

    #[test]
    fn workbook_serializes_camel_case_properties() {
        let book = Workbook {
            sheets: vec![],
            properties: WorkbookProperties::default(),
        };
        assert_eq!(
            serde_json::to_string(&book).unwrap(),
            r#"{"sheets":[],"properties":{"created":null,"modified":null}}"#
        );
    }
}
