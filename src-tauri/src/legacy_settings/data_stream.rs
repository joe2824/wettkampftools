// Liest einen QVariant aus QDataStream-Bytes (big-endian).
// QSettings schreibt mit Stream-Version Qt 4.0 (ohne Null-Flag); zur Sicherheit wird
// auch das Format ab Qt 4.2 (mit Null-Flag) akzeptiert. Nur vollständig gelesene Daten zählen.

const TYPE_BOOL: u32 = 1;
const TYPE_VARIANT_LIST: u32 = 9;
const TYPE_STRING: u32 = 10;
const TYPE_STRING_LIST: u32 = 11;
const NULL_STRING_LENGTH: u32 = u32::MAX;
const UTF16_UNIT_BYTES: usize = 2;

#[derive(Debug, Clone, PartialEq)]
pub enum StreamValue {
    Bool(bool),
    Text(String),
    List(Vec<String>),
}

pub fn parse_variant(bytes: &[u8]) -> Option<StreamValue> {
    [false, true].into_iter().find_map(|null_flag| {
        let mut reader = Reader {
            bytes,
            pos: 0,
            null_flag,
        };
        let value = reader.variant()?;
        reader.at_end().then_some(value)
    })
}

struct Reader<'a> {
    bytes: &'a [u8],
    pos: usize,
    null_flag: bool,
}

impl Reader<'_> {
    fn take(&mut self, len: usize) -> Option<&[u8]> {
        let end = self.pos.checked_add(len)?;
        let slice = self.bytes.get(self.pos..end)?;
        self.pos = end;
        Some(slice)
    }

    fn u8(&mut self) -> Option<u8> {
        self.take(1).map(|b| b[0])
    }

    fn u32(&mut self) -> Option<u32> {
        let b = self.take(4)?;
        Some(u32::from_be_bytes([b[0], b[1], b[2], b[3]]))
    }

    fn at_end(&self) -> bool {
        self.pos == self.bytes.len()
    }

    fn type_id(&mut self) -> Option<u32> {
        let id = self.u32()?;
        if self.null_flag {
            self.u8()?;
        }
        Some(id)
    }

    fn variant(&mut self) -> Option<StreamValue> {
        match self.type_id()? {
            TYPE_BOOL => self.u8().map(|b| StreamValue::Bool(b != 0)),
            TYPE_STRING => self.string().map(StreamValue::Text),
            TYPE_STRING_LIST => self.list(Self::string).map(StreamValue::List),
            TYPE_VARIANT_LIST => self.list(Self::string_variant).map(StreamValue::List),
            _ => None,
        }
    }

    /// Ein QString; ein Null-String gilt als leer.
    fn string(&mut self) -> Option<String> {
        let len = self.u32()?;
        if len == NULL_STRING_LENGTH {
            return Some(String::new());
        }
        let raw = self.take(usize::try_from(len).ok()?)?;
        let (pairs, rest) = raw.as_chunks::<UTF16_UNIT_BYTES>();
        if !rest.is_empty() {
            return None;
        }
        let units: Vec<u16> = pairs.iter().map(|&pair| u16::from_be_bytes(pair)).collect();
        String::from_utf16(&units).ok()
    }

    /// Listenelement einer QVariantList; nur Texte sind brauchbar.
    fn string_variant(&mut self) -> Option<String> {
        match self.type_id()? {
            TYPE_STRING => self.string(),
            _ => None,
        }
    }

    /// Anzahl + Elemente; ohne Vorab-Reservierung, damit falsche Anzahlen nichts kosten.
    fn list(&mut self, item: fn(&mut Self) -> Option<String>) -> Option<Vec<String>> {
        let count = self.u32()?;
        let mut items = Vec::new();
        for _ in 0..count {
            items.push(item(self)?);
        }
        Some(items)
    }
}
