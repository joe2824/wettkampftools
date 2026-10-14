//! Arbeitsmappe aus Bytes lesen (Format wird erkannt).

use std::io::Cursor;

use calamine::{open_workbook_auto_from_rs, Data, Range, Reader, SheetType};

use super::properties::read_properties;
use super::{Cell, Sheet, Workbook, READ_ERROR};

pub fn parse_workbook(bytes: &[u8]) -> Result<Workbook, String> {
    let mut book =
        open_workbook_auto_from_rs(Cursor::new(bytes)).map_err(|_| READ_ERROR.to_string())?;
    let names: Vec<String> = book
        .sheets_metadata()
        .iter()
        .filter(|sheet| sheet.typ == SheetType::WorkSheet)
        .map(|sheet| sheet.name.clone())
        .collect();
    let mut sheets = Vec::with_capacity(names.len());
    for name in names {
        let range = book
            .worksheet_range(&name)
            .map_err(|_| READ_ERROR.to_string())?;
        sheets.push(Sheet {
            name,
            rows: range_to_rows(&range),
        });
    }
    Ok(Workbook {
        sheets,
        properties: read_properties(bytes),
    })
}

/// Zeilen ab A1; calamine beginnt erst bei der ersten belegten Zelle.
fn range_to_rows(range: &Range<Data>) -> Vec<Vec<Cell>> {
    let Some((first_row, first_col)) = range.start() else {
        return Vec::new();
    };
    let mut rows = vec![Vec::new(); first_row as usize];
    for row in range.rows() {
        let mut cells = vec![Cell::Empty; first_col as usize];
        cells.extend(row.iter().map(to_cell));
        rows.push(cells);
    }
    trim(rows)
}

/// Schneidet leere Zeilen/Spalten am Ende ab und macht alle Zeilen gleich lang.
fn trim(mut rows: Vec<Vec<Cell>>) -> Vec<Vec<Cell>> {
    let used = |row: &Vec<Cell>| row.iter().rposition(|cell| *cell != Cell::Empty);
    let width = rows
        .iter()
        .filter_map(used)
        .map(|last| last + 1)
        .max()
        .unwrap_or(0);
    while rows.last().is_some_and(|row| used(row).is_none()) {
        rows.pop();
    }
    for row in &mut rows {
        row.resize(width, Cell::Empty);
    }
    rows
}

fn to_cell(value: &Data) -> Cell {
    match value {
        Data::Int(number) => Cell::Number(*number as f64),
        Data::Float(number) => Cell::Number(*number),
        Data::DateTime(date) => Cell::Number(date.as_f64()),
        Data::String(text) | Data::DateTimeIso(text) | Data::DurationIso(text) => {
            Cell::Text(text.clone())
        }
        Data::Bool(flag) => Cell::Bool(*flag),
        Data::Error(error) => Cell::Text(error.to_string()),
        Data::Empty => Cell::Empty,
    }
}

#[cfg(test)]
mod tests {
    use super::super::xls_fixture::{build_xls, XlsValue};
    use super::super::Cell;
    use super::*;

    #[test]
    fn rejects_garbage_with_german_message() {
        let err = parse_workbook(b"kein Excel, nur Text").unwrap_err();
        assert_eq!(
            err,
            "Die Datei konnte nicht als Excel-Tabelle gelesen werden."
        );
    }

    #[test]
    fn rejects_empty_bytes() {
        assert_eq!(parse_workbook(&[]).unwrap_err(), READ_ERROR);
    }

    #[test]
    fn reads_xls_with_offset_and_trims() {
        let bytes = build_xls(
            "Wertung",
            &[
                (1, 1, XlsValue::Text("Anna Meier")),
                (1, 2, XlsValue::Number(12.5)),
                (2, 3, XlsValue::Bool(true)),
                (3, 1, XlsValue::Text("Größe")),
            ],
        );
        let book = parse_workbook(&bytes).expect("xls lesen");
        assert_eq!(book.sheets.len(), 1);
        let sheet = &book.sheets[0];
        assert_eq!(sheet.name, "Wertung");
        let e = Cell::Empty;
        assert_eq!(
            sheet.rows,
            vec![
                vec![e.clone(), e.clone(), e.clone(), e.clone()],
                vec![
                    e.clone(),
                    Cell::Text("Anna Meier".into()),
                    Cell::Number(12.5),
                    e.clone()
                ],
                vec![e.clone(), e.clone(), e.clone(), Cell::Bool(true)],
                vec![e.clone(), Cell::Text("Größe".into()), e.clone(), e.clone()],
            ]
        );
        assert_eq!(book.properties.created, None);
    }

    #[test]
    fn trims_trailing_empty_rows_and_columns() {
        let rows = vec![
            vec![Cell::Text("a".into()), Cell::Empty, Cell::Empty],
            vec![Cell::Empty, Cell::Number(1.0), Cell::Empty],
            vec![Cell::Empty, Cell::Empty, Cell::Empty],
        ];
        assert_eq!(
            trim(rows),
            vec![
                vec![Cell::Text("a".into()), Cell::Empty],
                vec![Cell::Empty, Cell::Number(1.0)],
            ]
        );
    }

    #[test]
    fn maps_calamine_values() {
        use calamine::{CellErrorType, Data};
        assert_eq!(to_cell(&Data::Int(3)), Cell::Number(3.0));
        assert_eq!(to_cell(&Data::Float(2.5)), Cell::Number(2.5));
        assert_eq!(to_cell(&Data::String("x".into())), Cell::Text("x".into()));
        assert_eq!(to_cell(&Data::Bool(false)), Cell::Bool(false));
        assert_eq!(to_cell(&Data::Empty), Cell::Empty);
        assert_eq!(
            to_cell(&Data::Error(CellErrorType::Div0)),
            Cell::Text("#DIV/0!".into())
        );
        assert_eq!(
            to_cell(&Data::DateTimeIso("2026-10-14".into())),
            Cell::Text("2026-10-14".into())
        );
    }
}
