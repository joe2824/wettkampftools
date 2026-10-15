//! Arbeitsmappe als .xlsx erzeugen.

use std::collections::HashSet;

use rust_xlsxwriter::{Workbook as XlsxWorkbook, Worksheet, XlsxError};

use super::{Cell, Sheet};

const WRITE_ERROR: &str = "Die Excel-Datei konnte nicht erstellt werden.";
const MAX_SHEET_NAME_CHARS: usize = 31;
const FORBIDDEN_NAME_CHARS: [char; 7] = ['/', '\\', '?', '*', ':', '[', ']'];

pub fn build_workbook(sheets: &[Sheet]) -> Result<Vec<u8>, String> {
    validate_sheet_names(sheets)?;
    let mut book = XlsxWorkbook::new();
    for sheet in sheets {
        let worksheet = book.add_worksheet();
        worksheet
            .set_name(&sheet.name)
            .map_err(|_| WRITE_ERROR.to_string())?;
        write_rows(worksheet, &sheet.rows).map_err(|_| WRITE_ERROR.to_string())?;
    }
    book.save_to_buffer().map_err(|_| WRITE_ERROR.to_string())
}

/// Texte landen wie bei Excel in der Tabelle gemeinsamer Zeichenketten.
fn write_rows(worksheet: &mut Worksheet, rows: &[Vec<Cell>]) -> Result<(), XlsxError> {
    for (row_index, row) in rows.iter().enumerate() {
        for (col_index, cell) in row.iter().enumerate() {
            if *cell != Cell::Empty {
                let (Ok(row), Ok(col)) = (u32::try_from(row_index), u16::try_from(col_index))
                else {
                    return Err(XlsxError::RowColumnLimitError);
                };
                write_cell(worksheet, row, col, cell)?;
            }
        }
    }
    Ok(())
}

fn write_cell(worksheet: &mut Worksheet, row: u32, col: u16, cell: &Cell) -> Result<(), XlsxError> {
    match cell {
        Cell::Text(text) => worksheet.write_string(row, col, text)?,
        Cell::Number(number) => worksheet.write_number(row, col, *number)?,
        Cell::Bool(flag) => worksheet.write_boolean(row, col, *flag)?,
        Cell::Empty => worksheet,
    };
    Ok(())
}

fn validate_sheet_names(sheets: &[Sheet]) -> Result<(), String> {
    let mut seen = HashSet::new();
    for sheet in sheets {
        validate_sheet_name(&sheet.name)?;
        if !seen.insert(sheet.name.to_lowercase()) {
            return Err(format!(
                "Der Blattname „{}“ kommt mehrfach vor.",
                sheet.name
            ));
        }
    }
    Ok(())
}

/// Excel-Regeln für Blattnamen, mit verständlicher Meldung.
fn validate_sheet_name(name: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err("Ein Tabellenblatt braucht einen Namen.".to_string());
    }
    if name.chars().count() > MAX_SHEET_NAME_CHARS {
        return Err(format!(
            "Der Blattname „{name}“ ist länger als {MAX_SHEET_NAME_CHARS} Zeichen."
        ));
    }
    if name.contains(FORBIDDEN_NAME_CHARS) {
        return Err(format!(
            "Der Blattname „{name}“ enthält ein unzulässiges Zeichen (/ \\ ? * : [ ])."
        ));
    }
    if name.starts_with('\'') || name.ends_with('\'') {
        return Err(format!(
            "Der Blattname „{name}“ darf nicht mit einem Apostroph beginnen oder enden."
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sheet(name: &str) -> Sheet {
        Sheet {
            name: name.into(),
            rows: vec![],
        }
    }

    fn error_for(name: &str) -> String {
        build_workbook(&[sheet(name)]).unwrap_err()
    }

    #[test]
    fn accepts_regular_names() {
        assert!(build_workbook(&[sheet("Rettungswettkampf"), sheet("Aufschlüsselung")]).is_ok());
        assert!(build_workbook(&[sheet(&"x".repeat(31))]).is_ok());
    }

    #[test]
    fn texts_use_shared_strings_table() {
        use std::io::{Cursor, Read};
        let data = Sheet {
            name: "Daten".into(),
            rows: vec![vec![Cell::Text("Musterstadt".into())]],
        };
        let bytes = build_workbook(&[data]).unwrap();
        let mut archive = zip::ZipArchive::new(Cursor::new(bytes)).unwrap();
        let mut xml = String::new();
        archive
            .by_name("xl/sharedStrings.xml")
            .unwrap()
            .read_to_string(&mut xml)
            .unwrap();
        assert!(xml.contains("Musterstadt"));
    }

    #[test]
    fn rejects_empty_name() {
        assert_eq!(error_for(""), "Ein Tabellenblatt braucht einen Namen.");
    }

    #[test]
    fn rejects_too_long_name() {
        assert_eq!(
            error_for(&"ä".repeat(32)),
            "Der Blattname „ääääääääääääääääääääääääääääääää“ ist länger als 31 Zeichen."
        );
    }

    #[test]
    fn rejects_forbidden_characters() {
        for name in ["a/b", "a\\b", "a?b", "a*b", "a:b", "a[b", "a]b"] {
            assert_eq!(
                error_for(name),
                format!(
                    "Der Blattname „{name}“ enthält ein unzulässiges Zeichen (/ \\ ? * : [ ])."
                )
            );
        }
    }

    #[test]
    fn rejects_apostrophe_at_edges() {
        assert_eq!(
            error_for("'Daten"),
            "Der Blattname „'Daten“ darf nicht mit einem Apostroph beginnen oder enden."
        );
    }

    #[test]
    fn rejects_duplicate_names_ignoring_case() {
        assert_eq!(
            build_workbook(&[sheet("Daten"), sheet("daten")]).unwrap_err(),
            "Der Blattname „daten“ kommt mehrfach vor."
        );
    }

    #[test]
    fn rejects_rows_beyond_excel_limits() {
        let wide = Sheet {
            name: "Breit".into(),
            rows: vec![vec![Cell::Empty; 16_385]],
        };
        assert!(
            build_workbook(&[wide]).is_ok(),
            "leere Zellen werden nicht geschrieben"
        );
        let too_wide = Sheet {
            name: "Breit".into(),
            rows: vec![vec![Cell::Number(1.0); 16_385]],
        };
        assert_eq!(
            build_workbook(&[too_wide]).unwrap_err(),
            "Die Excel-Datei konnte nicht erstellt werden."
        );
    }
}
