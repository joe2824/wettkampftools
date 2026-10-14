use super::*;

const TYPE_BOOL: u32 = 1;
const TYPE_VARIANT_LIST: u32 = 9;
const TYPE_STRING: u32 = 10;
const TYPE_STRING_LIST: u32 = 11;

fn text(s: &str) -> QValue {
    QValue::Text(s.to_string())
}

fn list(items: &[&str]) -> QValue {
    QValue::List(items.iter().map(|s| s.to_string()).collect())
}

fn strings(items: &[&str]) -> Vec<String> {
    items.iter().map(|s| s.to_string()).collect()
}

/// QString im QDataStream-Format: Bytelänge + UTF-16BE.
fn qstring(s: &str) -> Vec<u8> {
    let units: Vec<u16> = s.encode_utf16().collect();
    let mut out = ((units.len() * 2) as u32).to_be_bytes().to_vec();
    for unit in units {
        out.extend_from_slice(&unit.to_be_bytes());
    }
    out
}

/// QVariant-Kopf; `null_flag` nur ab Stream-Version Qt 4.2.
fn header(type_id: u32, null_flag: bool) -> Vec<u8> {
    let mut out = type_id.to_be_bytes().to_vec();
    if null_flag {
        out.push(0);
    }
    out
}

fn string_list_stream(items: &[&str], null_flag: bool) -> Vec<u8> {
    let mut out = header(TYPE_STRING_LIST, null_flag);
    out.extend_from_slice(&(items.len() as u32).to_be_bytes());
    for item in items {
        out.extend(qstring(item));
    }
    out
}

fn variant_list_stream(items: &[&str], null_flag: bool) -> Vec<u8> {
    let mut out = header(TYPE_VARIANT_LIST, null_flag);
    out.extend_from_slice(&(items.len() as u32).to_be_bytes());
    for item in items {
        out.extend(header(TYPE_STRING, null_flag));
        out.extend(qstring(item));
    }
    out
}

/// "@Variant(" + Bytes zeichenweise (latin1) + ")", wie variantToString.
fn variant_text(stream: &[u8]) -> String {
    let body: String = stream.iter().map(|&b| char::from(b)).collect();
    format!("@Variant({body})")
}

fn utf16le(s: &str) -> Vec<u8> {
    s.encode_utf16().flat_map(|u| u.to_le_bytes()).collect()
}

#[test]
fn plain_string_is_text() {
    assert_eq!(
        decode_value(RegValue::Sz("AK 13/14".into())),
        text("AK 13/14")
    );
}

#[test]
fn double_at_is_unescaped() {
    assert_eq!(decode_value(RegValue::Sz("@@AK".into())), text("@AK"));
}

#[test]
fn single_at_without_known_prefix_stays_text() {
    assert_eq!(
        decode_value(RegValue::Sz("@Foo(1)".into())),
        text("@Foo(1)")
    );
    assert_eq!(decode_value(RegValue::Sz("@x".into())), text("@x"));
}

#[test]
fn bool_strings_become_bool() {
    assert_eq!(
        decode_value(RegValue::Sz("true".into())),
        QValue::Bool(true)
    );
    assert_eq!(
        decode_value(RegValue::Sz("false".into())),
        QValue::Bool(false)
    );
}

#[test]
fn invalid_marker_is_unknown() {
    assert_eq!(
        decode_value(RegValue::Sz("@Invalid()".into())),
        QValue::Unknown
    );
}

#[test]
fn string_marker_is_text() {
    assert_eq!(
        decode_value(RegValue::Sz("@String(a\0b)".into())),
        text("a\0b")
    );
}

#[test]
fn other_qt_types_are_unknown() {
    for s in [
        "@ByteArray(abc)",
        "@Rect(1 2 3 4)",
        "@Size(1 2)",
        "@Point(1 2)",
        "@DateTime(x)",
    ] {
        assert_eq!(decode_value(RegValue::Sz(s.into())), QValue::Unknown, "{s}");
    }
}

#[test]
fn multi_sz_is_list() {
    let value = RegValue::MultiSz(strings(&["AK 10", "AK 12", "AK Offen"]));
    assert_eq!(decode_value(value), list(&["AK 10", "AK 12", "AK Offen"]));
}

#[test]
fn empty_multi_sz_is_empty_list() {
    assert_eq!(decode_value(RegValue::MultiSz(vec![])), list(&[]));
}

#[test]
fn multi_sz_items_are_not_bools() {
    let value = RegValue::MultiSz(strings(&["true", "@@AK"]));
    assert_eq!(decode_value(value), list(&["true", "@AK"]));
}

#[test]
fn multi_sz_with_variant_item_is_decoded_per_item() {
    let stream = [header(TYPE_STRING, false), qstring("AK 10")].concat();
    let value = RegValue::MultiSz(vec![variant_text(&stream), "AK 12".into()]);
    assert_eq!(decode_value(value), list(&["AK 10", "AK 12"]));
}

#[test]
fn multi_sz_with_non_text_item_is_unknown() {
    let value = RegValue::MultiSz(strings(&["AK 10", "@Invalid()"]));
    assert_eq!(decode_value(value), QValue::Unknown);
}

#[test]
fn variant_string_list_qt4_layout() {
    let stream = string_list_stream(&["AK 10", "AK 13/14"], false);
    assert_eq!(
        decode_value(RegValue::Sz(variant_text(&stream))),
        list(&["AK 10", "AK 13/14"])
    );
}

#[test]
fn variant_string_list_with_null_flag_layout() {
    let stream = string_list_stream(&["AK 100", "AK 280+"], true);
    assert_eq!(
        decode_value(RegValue::Sz(variant_text(&stream))),
        list(&["AK 100", "AK 280+"])
    );
}

#[test]
fn variant_list_of_strings_qt4_layout() {
    let stream = variant_list_stream(&["AK 25", "", "AK 60+"], false);
    assert_eq!(
        decode_value(RegValue::Sz(variant_text(&stream))),
        list(&["AK 25", "", "AK 60+"])
    );
}

#[test]
fn variant_list_of_strings_with_null_flag_layout() {
    let stream = variant_list_stream(&["Ä Ö ü"], true);
    assert_eq!(
        decode_value(RegValue::Sz(variant_text(&stream))),
        list(&["Ä Ö ü"])
    );
}

#[test]
fn variant_list_with_non_string_item_is_unknown() {
    let mut stream = header(TYPE_VARIANT_LIST, false);
    stream.extend_from_slice(&1u32.to_be_bytes());
    stream.extend(header(TYPE_BOOL, false));
    stream.push(1);
    assert_eq!(
        decode_value(RegValue::Sz(variant_text(&stream))),
        QValue::Unknown
    );
}

#[test]
fn variant_bool_and_string() {
    let bool_stream = [header(TYPE_BOOL, false), vec![1]].concat();
    assert_eq!(
        decode_value(RegValue::Sz(variant_text(&bool_stream))),
        QValue::Bool(true)
    );
    let string_stream = [header(TYPE_STRING, true), qstring("AK Offen")].concat();
    assert_eq!(
        decode_value(RegValue::Sz(variant_text(&string_stream))),
        text("AK Offen")
    );
}

#[test]
fn null_qstring_in_list_becomes_empty() {
    let mut stream = header(TYPE_STRING_LIST, false);
    stream.extend_from_slice(&1u32.to_be_bytes());
    stream.extend_from_slice(&u32::MAX.to_be_bytes());
    assert_eq!(
        decode_value(RegValue::Sz(variant_text(&stream))),
        list(&[""])
    );
}

#[test]
fn variant_with_trailing_bytes_is_unknown() {
    let mut stream = string_list_stream(&["AK 10"], false);
    stream.extend_from_slice(&[7, 7, 7]);
    assert_eq!(
        decode_value(RegValue::Sz(variant_text(&stream))),
        QValue::Unknown
    );
}

#[test]
fn variant_with_non_latin1_char_is_unknown() {
    assert_eq!(
        decode_value(RegValue::Sz("@Variant(\u{0100})".into())),
        QValue::Unknown
    );
}

#[test]
fn binary_is_utf16le_text() {
    let stream = variant_list_stream(&["AK 10", ""], false);
    let bytes = utf16le(&variant_text(&stream));
    assert_eq!(decode_value(RegValue::Binary(bytes)), list(&["AK 10", ""]));
    assert_eq!(
        decode_value(RegValue::Binary(utf16le("true"))),
        QValue::Bool(true)
    );
}

#[test]
fn unsupported_is_unknown() {
    assert_eq!(decode_value(RegValue::Unsupported), QValue::Unknown);
}

#[test]
fn garbage_never_panics() {
    let mut seed: u32 = 0x1234_5678;
    for len in 0..400 {
        let bytes: Vec<u8> = (0..len % 40)
            .map(|_| {
                seed = seed.wrapping_mul(1_664_525).wrapping_add(1_013_904_223);
                (seed >> 24) as u8
            })
            .collect();
        let _ = decode_value(RegValue::Sz(variant_text(&bytes)));
        let _ = decode_value(RegValue::Binary(bytes.clone()));
        let _ = utf16le_to_string(&bytes);
        let _ = split_multi_sz(&bytes);
    }
}

#[test]
fn huge_count_does_not_allocate_or_panic() {
    let mut stream = header(TYPE_STRING_LIST, false);
    stream.extend_from_slice(&u32::MAX.to_be_bytes());
    assert_eq!(
        decode_value(RegValue::Sz(variant_text(&stream))),
        QValue::Unknown
    );
    let mut short = header(TYPE_STRING_LIST, false);
    short.extend_from_slice(&1u32.to_be_bytes());
    short.extend_from_slice(&100u32.to_be_bytes());
    assert_eq!(
        decode_value(RegValue::Sz(variant_text(&short))),
        QValue::Unknown
    );
}

#[test]
fn short_variants_are_unknown() {
    for s in ["@Variant()", "@Variant(\0)", "@Variant(\0\0\0\u{b}\0\0)"] {
        assert_eq!(
            decode_value(RegValue::Sz(s.into())),
            QValue::Unknown,
            "{s:?}"
        );
    }
}

#[test]
fn utf16le_stops_at_nul_and_ignores_odd_byte() {
    let mut bytes = utf16le("AK 10");
    bytes.extend_from_slice(&[0, 0, b'x', 0]);
    assert_eq!(utf16le_to_string(&bytes), "AK 10");
    assert_eq!(utf16le_to_string(&[b'A', 0, b'B']), "A");
}

#[test]
fn multi_sz_split_like_qt() {
    let bytes = [utf16le("AK 10\0AK 12\0\0"), utf16le("ignoriert")].concat();
    assert_eq!(split_multi_sz(&bytes), strings(&["AK 10", "AK 12"]));
    assert_eq!(split_multi_sz(&utf16le("\0\0")), Vec::<String>::new());
    assert_eq!(split_multi_sz(&utf16le("AK 10")), strings(&["AK 10"]));
}
