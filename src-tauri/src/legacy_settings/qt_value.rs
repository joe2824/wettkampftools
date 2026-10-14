// Dekodiert Registry-Werte, wie QSettings (Qt, Windows) sie schreibt.
// Nachgebildet nach qsettings.cpp (stringToVariant) und qsettings_win.cpp (readKey).
use super::data_stream::{parse_variant, StreamValue};

/// Rohwert aus der Registry, bereits nach Typ getrennt.
#[derive(Debug, Clone, PartialEq)]
pub enum RegValue {
    Sz(String),
    MultiSz(Vec<String>),
    Binary(Vec<u8>),
    /// Registry-Typ, den die alte Version für diese Schlüssel nie schreibt.
    Unsupported,
}

/// Für die Übernahme relevante Bedeutung eines Werts.
#[derive(Debug, Clone, PartialEq)]
pub enum QValue {
    Text(String),
    List(Vec<String>),
    Bool(bool),
    Unknown,
}

const UTF16_UNIT_BYTES: usize = 2;
const ESCAPED_AT: &str = "@@";
const INVALID_MARKER: &str = "@Invalid()";
const STRING_PREFIX: &str = "@String(";
const VARIANT_PREFIX: &str = "@Variant(";
/// Weitere Qt-Typen, die für die Übernahme nicht in Frage kommen.
const FOREIGN_PREFIXES: [&str; 5] = ["@ByteArray(", "@DateTime(", "@Rect(", "@Size(", "@Point("];

pub fn decode_value(value: RegValue) -> QValue {
    match value {
        RegValue::Sz(text) => decode_scalar(&text),
        RegValue::Binary(bytes) => decode_scalar(&utf16le_to_string_lossless(&bytes)),
        RegValue::MultiSz(items) => decode_multi_sz(&items),
        RegValue::Unsupported => QValue::Unknown,
    }
}

/// Einzelwert: wie stringToVariant, danach "true"/"false" als Wahrheitswert.
fn decode_scalar(text: &str) -> QValue {
    match string_to_variant(text) {
        QValue::Text(t) if t == "true" => QValue::Bool(true),
        QValue::Text(t) if t == "false" => QValue::Bool(false),
        other => other,
    }
}

/// Wie stringListToVariantList: jedes Element einzeln, alle müssen Text sein.
fn decode_multi_sz(items: &[String]) -> QValue {
    let decoded: Option<Vec<String>> = items
        .iter()
        .map(|item| match string_to_variant(item) {
            QValue::Text(text) => Some(text),
            _ => None,
        })
        .collect();
    decoded.map_or(QValue::Unknown, QValue::List)
}

fn string_to_variant(text: &str) -> QValue {
    if text.starts_with('@') && text.ends_with(')') {
        if text == INVALID_MARKER {
            return QValue::Unknown;
        }
        if let Some(inner) = text.strip_prefix(STRING_PREFIX) {
            return QValue::Text(inner[..inner.len() - 1].to_string());
        }
        if let Some(body) = text.strip_prefix(VARIANT_PREFIX) {
            return decode_variant_body(&body[..body.len() - 1]);
        }
        if FOREIGN_PREFIXES
            .iter()
            .any(|prefix| text.starts_with(prefix))
        {
            return QValue::Unknown;
        }
    }
    match text.strip_prefix(ESCAPED_AT) {
        Some(rest) => QValue::Text(format!("@{rest}")),
        None => QValue::Text(text.to_string()),
    }
}

/// Die QDataStream-Bytes stehen zeichenweise (latin1) im Text.
fn decode_variant_body(body: &str) -> QValue {
    let bytes: Option<Vec<u8>> = body.chars().map(|c| u8::try_from(c).ok()).collect();
    match bytes.as_deref().and_then(parse_variant) {
        Some(StreamValue::Bool(flag)) => QValue::Bool(flag),
        Some(StreamValue::Text(text)) => QValue::Text(text),
        Some(StreamValue::List(items)) => QValue::List(items),
        None => QValue::Unknown,
    }
}

fn utf16le_units(bytes: &[u8]) -> impl Iterator<Item = u16> + '_ {
    bytes
        .as_chunks::<UTF16_UNIT_BYTES>()
        .0
        .iter()
        .map(|&pair| u16::from_le_bytes(pair))
}

/// REG_BINARY: kompletter Inhalt als UTF-16LE, ohne Abbruch an Nullzeichen.
fn utf16le_to_string_lossless(bytes: &[u8]) -> String {
    char::decode_utf16(utf16le_units(bytes))
        .map(|c| c.unwrap_or(char::REPLACEMENT_CHARACTER))
        .collect()
}

/// REG_SZ: UTF-16LE bis zum ersten Nullzeichen.
pub fn utf16le_to_string(bytes: &[u8]) -> String {
    let units: Vec<u16> = utf16le_units(bytes).take_while(|&unit| unit != 0).collect();
    String::from_utf16_lossy(&units)
}

/// REG_MULTI_SZ: nullgetrennte Einträge bis zum ersten leeren Eintrag.
pub fn split_multi_sz(bytes: &[u8]) -> Vec<String> {
    let units: Vec<u16> = utf16le_units(bytes).collect();
    units
        .split(|&unit| unit == 0)
        .take_while(|item| !item.is_empty())
        .map(String::from_utf16_lossy)
        .collect()
}

#[cfg(test)]
#[path = "qt_value_tests.rs"]
mod tests;
