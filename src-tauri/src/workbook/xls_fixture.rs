//! Erzeugt eine kleine .xls-Datei (BIFF8 in einer OLE-Containerdatei) für Tests.

const SECTOR_SIZE: usize = 512;
const DIR_ENTRY_SIZE: usize = 128;
/// Kleinere Datenströme lägen im Mini-Stream; den sparen wir uns.
const MIN_REGULAR_STREAM: usize = 4096;
const END_OF_CHAIN: u32 = 0xFFFF_FFFE;
const FAT_SECTOR: u32 = 0xFFFF_FFFD;
const FREE_SECTOR: u32 = 0xFFFF_FFFF;
const NO_STREAM: u32 = 0xFFFF_FFFF;
const DIR_SECTOR_ID: u32 = 0;
const FAT_SECTOR_ID: u32 = 1;
const FIRST_DATA_SECTOR: u32 = 2;

const BOF: u16 = 0x0809;
const EOF: u16 = 0x000A;
const BOUND_SHEET: u16 = 0x0085;
const LABEL: u16 = 0x0204;
const NUMBER: u16 = 0x0203;
const BOOL_ERR: u16 = 0x0205;
const BIFF8: u16 = 0x0600;
const GLOBALS: u16 = 0x0005;
const WORKSHEET: u16 = 0x0010;
const UTF16_FLAG: u8 = 0x01;

pub enum XlsValue<'a> {
    Text(&'a str),
    Number(f64),
    Bool(bool),
}

/// Ein Blatt mit Zellen (Zeile, Spalte, Wert).
pub fn build_xls(sheet_name: &str, cells: &[(u16, u16, XlsValue)]) -> Vec<u8> {
    wrap_in_container(&workbook_stream(sheet_name, cells))
}

fn record(out: &mut Vec<u8>, typ: u16, data: &[u8]) {
    out.extend(typ.to_le_bytes());
    out.extend((data.len() as u16).to_le_bytes());
    out.extend(data);
}

fn bof(kind: u16) -> Vec<u8> {
    let mut data = vec![0u8; 16];
    data[..2].copy_from_slice(&BIFF8.to_le_bytes());
    data[2..4].copy_from_slice(&kind.to_le_bytes());
    data
}

fn utf16(text: &str) -> Vec<u8> {
    text.encode_utf16().flat_map(u16::to_le_bytes).collect()
}

fn workbook_stream(sheet_name: &str, cells: &[(u16, u16, XlsValue)]) -> Vec<u8> {
    let mut sheet_record = vec![0u8; 4]; // Position des Blatts, unten eingetragen
    sheet_record.extend([0, 0, sheet_name.encode_utf16().count() as u8, UTF16_FLAG]);
    sheet_record.extend(utf16(sheet_name));

    let mut globals = Vec::new();
    record(&mut globals, BOF, &bof(GLOBALS));
    let position_at = globals.len() + 4;
    record(&mut globals, BOUND_SHEET, &sheet_record);
    record(&mut globals, EOF, &[]);
    let sheet_start = globals.len() as u32;
    globals[position_at..position_at + 4].copy_from_slice(&sheet_start.to_le_bytes());

    let mut stream = globals;
    record(&mut stream, BOF, &bof(WORKSHEET));
    for (row, col, value) in cells {
        let mut data = Vec::new();
        data.extend(row.to_le_bytes());
        data.extend(col.to_le_bytes());
        data.extend(0u16.to_le_bytes()); // Formatindex
        let typ = match value {
            XlsValue::Text(text) => {
                data.extend((text.encode_utf16().count() as u16).to_le_bytes());
                data.push(UTF16_FLAG);
                data.extend(utf16(text));
                LABEL
            }
            XlsValue::Number(number) => {
                data.extend(number.to_le_bytes());
                NUMBER
            }
            XlsValue::Bool(flag) => {
                data.extend([u8::from(*flag), 0]);
                BOOL_ERR
            }
        };
        record(&mut stream, typ, &data);
    }
    record(&mut stream, EOF, &[]);
    stream.resize(stream.len().max(MIN_REGULAR_STREAM), 0);
    stream
}

fn dir_entry(name: &str, kind: u8, start: u32, size: u32) -> Vec<u8> {
    let mut entry = vec![0u8; DIR_ENTRY_SIZE];
    let encoded = utf16(name);
    entry[..encoded.len()].copy_from_slice(&encoded);
    let name_len = (encoded.len() + 2) as u16;
    entry[64..66].copy_from_slice(&name_len.to_le_bytes());
    entry[66] = kind;
    entry[68..80].copy_from_slice(&[0xFF; 12]); // keine Geschwister/Kinder
    entry[116..120].copy_from_slice(&start.to_le_bytes());
    entry[120..124].copy_from_slice(&size.to_le_bytes());
    entry
}

fn wrap_in_container(stream: &[u8]) -> Vec<u8> {
    let data_sectors = stream.len().div_ceil(SECTOR_SIZE);

    let mut header = vec![0u8; SECTOR_SIZE];
    header[..8].copy_from_slice(b"\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1");
    header[24..26].copy_from_slice(&0x003Eu16.to_le_bytes());
    header[26..28].copy_from_slice(&3u16.to_le_bytes());
    header[28..30].copy_from_slice(&0xFFFEu16.to_le_bytes());
    header[30..32].copy_from_slice(&9u16.to_le_bytes());
    header[32..34].copy_from_slice(&6u16.to_le_bytes());
    header[44..48].copy_from_slice(&1u32.to_le_bytes());
    header[48..52].copy_from_slice(&DIR_SECTOR_ID.to_le_bytes());
    header[56..60].copy_from_slice(&(MIN_REGULAR_STREAM as u32).to_le_bytes());
    header[60..64].copy_from_slice(&END_OF_CHAIN.to_le_bytes());
    header[68..72].copy_from_slice(&END_OF_CHAIN.to_le_bytes());
    header[76..].fill(0xFF);
    header[76..80].copy_from_slice(&FAT_SECTOR_ID.to_le_bytes());

    let mut directory = dir_entry("Root Entry", 5, END_OF_CHAIN, 0);
    let mut workbook = dir_entry("Workbook", 2, FIRST_DATA_SECTOR, stream.len() as u32);
    workbook[76..80].copy_from_slice(&NO_STREAM.to_le_bytes());
    directory[76..80].copy_from_slice(&1u32.to_le_bytes()); // Kind: Workbook
    directory.extend(workbook);
    directory.resize(SECTOR_SIZE, 0);

    let mut fat = vec![END_OF_CHAIN, FAT_SECTOR];
    for i in 1..data_sectors {
        fat.push(FIRST_DATA_SECTOR + i as u32);
    }
    fat.push(END_OF_CHAIN);
    fat.resize(SECTOR_SIZE / 4, FREE_SECTOR);

    let mut file = header;
    file.extend(directory);
    file.extend(fat.iter().flat_map(|id| id.to_le_bytes()));
    file.extend(stream);
    file.resize(
        SECTOR_SIZE * (FIRST_DATA_SECTOR as usize + 1 + data_sectors),
        0,
    );
    file
}
