const DAFTAR: [RegExp, string][] = [
  [/neuro|saraf/i, 'neurologi'],
  [/kardio|jantung/i, 'kardiovaskular'],
  [/hemato|darah/i, 'hematologi'],
  [/kulit|kelamin|derma/i, 'kulit'],
  [/masyarakat|ikm|komunitas/i, 'ikm'],
  [/gastro|pencernaan|hepat|digestif/i, 'gastrointestinal'],
  [/forensik|medikolegal/i, 'forensik'],
  [/respirasi|pulmo|paru|napas/i, 'respirasi'],
  [/mata|oftal/i, 'mata'],
  [/muskulo|ortop/i, 'muskuloskeletal'],
  [/pediatri|anak|neonat/i, 'pediatri'],
  [/endokrin|metabolik/i, 'endokrin'],
  [/urolog/i, 'urologi'],
  [/gizi|nutrisi/i, 'gizi'],
  [/obstetri|ginekolog|obgyn|kandungan/i, 'obgyn'],
  [/psikiatri|jiwa/i, 'psikiatri'],
  [/toksik|keracunan/i, 'toksikologi'],
  [/infeksi|tropis/i, 'infeksi-tropis'],
  [/tht|telinga|hidung|tenggorok/i, 'tht'],
  [/onkolog|kanker/i, 'onkologi'],
  [/gawat|emergensi|darurat/i, 'kegawatdaruratan'],
  [/reumat/i, 'reumatologi'],
  [/bedah/i, 'bedah'],
  [/nefro|ginjal/i, 'nefrologi'],
];

export function ikonKategori(nama: string): string | null {
  const hit = DAFTAR.find(([re]) => re.test(nama));
  return hit ? `/ikon-kategori/${hit[1]}.png` : null;
}
