//! Dokumenteigenschaften (docProps/core.xml) einer .xlsx-Datei.
//! .xls-Dateien liefern keine Eigenschaften.

use std::io::{Cursor, Read};

use super::WorkbookProperties;

const CORE_PATH: &str = "docProps/core.xml";
/// Schutz gegen aufgeblähte Archive; echte core.xml sind wenige KB groß.
const MAX_CORE_BYTES: u64 = 1024 * 1024;

pub fn read_properties(bytes: &[u8]) -> WorkbookProperties {
    core_xml(bytes)
        .map(|xml| properties_from_xml(&xml))
        .unwrap_or_default()
}

fn core_xml(bytes: &[u8]) -> Option<String> {
    let mut archive = zip::ZipArchive::new(Cursor::new(bytes)).ok()?;
    let file = archive.by_name(CORE_PATH).ok()?;
    let mut xml = String::new();
    file.take(MAX_CORE_BYTES).read_to_string(&mut xml).ok()?;
    Some(xml)
}

fn properties_from_xml(xml: &str) -> WorkbookProperties {
    WorkbookProperties {
        created: element_text(xml, "dcterms:created"),
        modified: element_text(xml, "dcterms:modified"),
    }
}

/// Text des ersten Elements `tag`, ohne Leerraum; leer ergibt None.
fn element_text(xml: &str, tag: &str) -> Option<String> {
    let open = format!("<{tag}");
    let start = xml.find(&open)? + open.len();
    let content_start = start + xml[start..].find('>')? + 1;
    let content_end = content_start + xml[content_start..].find(&format!("</{tag}>"))?;
    let text = xml[content_start..content_end].trim();
    (!text.is_empty()).then(|| text.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    const CORE_XML: &str = r#"<?xml version="1.0"?><cp:coreProperties xmlns:dcterms="http://purl.org/dc/terms/"><dc:creator>x</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">2025-06-01T08:30:00Z</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF"> 2025-06-02T09:00:00Z </dcterms:modified></cp:coreProperties>"#;

    #[test]
    fn extracts_created_and_modified() {
        assert_eq!(
            properties_from_xml(CORE_XML),
            WorkbookProperties {
                created: Some("2025-06-01T08:30:00Z".into()),
                modified: Some("2025-06-02T09:00:00Z".into()),
            }
        );
    }

    #[test]
    fn missing_or_empty_elements_are_none() {
        let xml = "<cp:coreProperties><dcterms:created></dcterms:created></cp:coreProperties>";
        assert_eq!(properties_from_xml(xml), WorkbookProperties::default());
    }

    #[test]
    fn non_zip_bytes_have_no_properties() {
        assert_eq!(read_properties(b"kein zip"), WorkbookProperties::default());
    }
}
