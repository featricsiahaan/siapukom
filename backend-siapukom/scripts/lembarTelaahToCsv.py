"""Ubah lembar telaah dokter (xlsx, sheet "Telaah") yang sudah diisi menjadi CSV keputusan.

Usage: python scripts/lembarTelaahToCsv.py <lembar.xlsx> <keputusan.csv>
Hanya baris dengan kolom KEPUTUSAN DOKTER terisi yang ditulis.
"""
import csv
import sys

import openpyxl

src, dst = sys.argv[1], sys.argv[2]
ws = openpyxl.load_workbook(src, read_only=True, data_only=True)['Telaah']
rows = ws.iter_rows(values_only=True)
header = [str(h or '').strip() for h in next(rows)]
col = {h: i for i, h in enumerate(header)}
need = ['ID Soal', 'Kategori', 'Soal', 'Kunci', 'KEPUTUSAN DOKTER', 'Kunci menurut dokter', 'Catatan dokter', 'Penelaah', 'Tanggal telaah']
missing = [h for h in need if h not in col]
if missing:
    sys.exit(f'Kolom tidak ditemukan: {missing}')

def cell(r, h):
    v = r[col[h]]
    return '' if v is None else str(v).strip()

n = 0
with open(dst, 'w', encoding='utf-8-sig', newline='') as f:
    w = csv.writer(f)
    w.writerow(['question_id', 'kategori', 'soal', 'kunci_saat_ini', 'keputusan', 'kunci_dokter', 'catatan', 'penelaah', 'tanggal'])
    for r in rows:
        if not r or not cell(r, 'ID Soal') or not cell(r, 'KEPUTUSAN DOKTER'):
            continue
        w.writerow([cell(r, 'ID Soal'), cell(r, 'Kategori'), cell(r, 'Soal'), cell(r, 'Kunci'),
                    cell(r, 'KEPUTUSAN DOKTER').upper(), cell(r, 'Kunci menurut dokter').upper(),
                    cell(r, 'Catatan dokter'), cell(r, 'Penelaah'), cell(r, 'Tanggal telaah')])
        n += 1
print(f'{n} keputusan ditulis ke {dst}')
