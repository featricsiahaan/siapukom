import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const KATEGORI = [
  'Kardiovaskular',
  'Respirasi',
  'Gastrointestinal',
  'Endokrin & Metabolik',
  'Muskuloskeletal',
  'Neurologi',
  'Obstetri & Ginekologi',
  'Pediatri',
];

// Soal contoh diambil dari prototipe frontend (makeBank() di "SiapUKOM Latihan.dc.html")
// sebagai seed awal. Ganti/lengkapi lewat bank soal produksi sesuai blueprint UKMPPD.
const QUESTIONS: Array<{
  kategori: string;
  pertanyaan: string;
  opsi: { letter: string; text: string }[];
  kunci: string;
  pembahasan: string;
}> = [
  {
    kategori: 'Kardiovaskular',
    pertanyaan:
      'Laki-laki 58 tahun datang dengan nyeri dada substernal seperti tertindih selama 1 jam, menjalar ke lengan kiri, disertai keringat dingin. EKG menunjukkan elevasi segmen ST di sadapan V1-V4. Apakah diagnosis paling mungkin?',
    opsi: [
      { letter: 'A', text: 'Angina pektoris stabil' },
      { letter: 'B', text: 'STEMI anterior' },
      { letter: 'C', text: 'Perikarditis akut' },
      { letter: 'D', text: 'Diseksi aorta' },
      { letter: 'E', text: 'Emboli paru' },
    ],
    kunci: 'B',
    pembahasan:
      'Nyeri dada khas iskemik dengan elevasi ST kontigu di V1-V4 menunjukkan STEMI dinding anterior (oklusi LAD).',
  },
  {
    kategori: 'Respirasi',
    pertanyaan:
      'Perempuan 24 tahun mengalami sesak napas mendadak setelah kecelakaan lalu lintas dengan trauma dada. Pemeriksaan: trakea terdorong ke kanan, hipersonor pada perkusi hemitoraks kiri, vena leher distensi. Tindakan awal yang paling tepat?',
    opsi: [
      { letter: 'A', text: 'Foto toraks segera' },
      { letter: 'B', text: 'Needle decompression' },
      { letter: 'C', text: 'Pemberian oksigen dan observasi' },
      { letter: 'D', text: 'Perikardiosentesis' },
      { letter: 'E', text: 'Intubasi endotrakeal' },
    ],
    kunci: 'B',
    pembahasan:
      'Tanda deviasi trakea, hipersonor, dan distensi vena leher pasca trauma dada mengarah ke tension pneumothorax — dekompresi jarum segera.',
  },
  {
    kategori: 'Gastrointestinal',
    pertanyaan:
      'Laki-laki 45 tahun dengan riwayat konsumsi alkohol berat mengeluh nyeri epigastrium hebat yang menjalar ke punggung sejak 6 jam lalu, disertai mual muntah. Amilase serum meningkat 5 kali batas atas normal. Diagnosis paling mungkin?',
    opsi: [
      { letter: 'A', text: 'Kolesistitis akut' },
      { letter: 'B', text: 'Ulkus peptikum perforasi' },
      { letter: 'C', text: 'Pankreatitis akut' },
      { letter: 'D', text: 'Apendisitis akut' },
      { letter: 'E', text: 'Hepatitis alkoholik' },
    ],
    kunci: 'C',
    pembahasan:
      'Nyeri epigastrium menjalar ke punggung dengan amilase meningkat signifikan pada konteks konsumsi alkohol berat khas pankreatitis akut.',
  },
  {
    kategori: 'Endokrin & Metabolik',
    pertanyaan:
      'Perempuan 30 tahun dibawa ke IGD dengan penurunan kesadaran, napas cepat dan dalam, serta napas berbau aseton. GDS 420 mg/dL, riwayat DM tipe 1 tidak rutin insulin. Apakah diagnosis paling mungkin?',
    opsi: [
      { letter: 'A', text: 'Hipoglikemia berat' },
      { letter: 'B', text: 'Ketoasidosis diabetik' },
      { letter: 'C', text: 'Status hiperosmolar hiperglikemik' },
      { letter: 'D', text: 'Asidosis laktat' },
      { letter: 'E', text: 'Krisis tiroid' },
    ],
    kunci: 'B',
    pembahasan:
      'Napas Kussmaul berbau aseton, hiperglikemia, dan riwayat DM tipe 1 tanpa insulin mengarah ke ketoasidosis diabetik.',
  },
  {
    kategori: 'Muskuloskeletal',
    pertanyaan:
      'Laki-laki 20 tahun jatuh dari sepeda motor dengan tangan menumpu tanah dalam posisi ekstensi. Tampak deformitas pergelangan tangan menyerupai "dinner fork". Diagnosis paling mungkin?',
    opsi: [
      { letter: 'A', text: 'Fraktur Colles' },
      { letter: 'B', text: 'Fraktur Smith' },
      { letter: 'C', text: 'Fraktur skafoid' },
      { letter: 'D', text: 'Dislokasi lunatum' },
      { letter: 'E', text: 'Fraktur Galeazzi' },
    ],
    kunci: 'A',
    pembahasan:
      'Jatuh dengan tangan ekstensi (FOOSH) menyebabkan fraktur ujung distal radius dengan deformitas dinner fork khas fraktur Colles.',
  },
  {
    kategori: 'Neurologi',
    pertanyaan:
      'Laki-laki 65 tahun mengalami kelemahan sisi tubuh kanan mendadak, wajah asimetris, dan bicara pelo sejak 2 jam lalu. Tekanan darah 160/95. Pemeriksaan penunjang awal yang paling tepat sebelum tata laksana definitif?',
    opsi: [
      { letter: 'A', text: 'MRI kepala dengan kontras' },
      { letter: 'B', text: 'CT scan kepala non-kontras' },
      { letter: 'C', text: 'Angiografi serebral' },
      { letter: 'D', text: 'Pungsi lumbal' },
      { letter: 'E', text: 'EEG' },
    ],
    kunci: 'B',
    pembahasan:
      'Onset defisit neurologis fokal akut memerlukan CT scan kepala non-kontras segera sebelum pertimbangan trombolisis.',
  },
  {
    kategori: 'Obstetri & Ginekologi',
    pertanyaan:
      'Perempuan G2P1A0 usia kehamilan 32 minggu datang dengan perdarahan pervaginam berwarna merah segar tanpa nyeri perut. Tidak ada riwayat trauma. Diagnosis paling mungkin?',
    opsi: [
      { letter: 'A', text: 'Solusio plasenta' },
      { letter: 'B', text: 'Plasenta previa' },
      { letter: 'C', text: 'Vasa previa' },
      { letter: 'D', text: 'Ruptur uteri' },
      { letter: 'E', text: 'Persalinan prematur' },
    ],
    kunci: 'B',
    pembahasan:
      'Perdarahan pervaginam merah segar tanpa nyeri pada trimester ketiga adalah gambaran klasik plasenta previa.',
  },
  {
    kategori: 'Pediatri',
    pertanyaan:
      'Anak perempuan 2 tahun demam tinggi 5 hari, ruam polimorfik, konjungtivitis bilateral non-purulen, bibir merah dan pecah-pecah, serta edema pada tangan. Diagnosis paling mungkin?',
    opsi: [
      { letter: 'A', text: 'Demam skarlatina' },
      { letter: 'B', text: 'Sindrom Stevens-Johnson' },
      { letter: 'C', text: 'Penyakit Kawasaki' },
      { letter: 'D', text: 'Campak' },
      { letter: 'E', text: 'Demam berdarah dengue' },
    ],
    kunci: 'C',
    pembahasan:
      'Kombinasi demam ≥5 hari, konjungtivitis bilateral, perubahan mukosa bibir, ruam polimorfik, dan edema ekstremitas memenuhi kriteria klinis penyakit Kawasaki.',
  },
];

async function main() {
  const categoryIdByName = new Map<string, string>();

  for (const name of KATEGORI) {
    const category = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categoryIdByName.set(name, category.id);
  }

  for (const q of QUESTIONS) {
    const categoryId = categoryIdByName.get(q.kategori);
    if (!categoryId) continue;

    const existing = await prisma.question.findFirst({
      where: { pertanyaan: q.pertanyaan },
    });
    if (existing) continue;

    await prisma.question.create({
      data: {
        categoryId,
        pertanyaan: q.pertanyaan,
        opsi: q.opsi,
        kunci: q.kunci,
        pembahasan: q.pembahasan,
      },
    });
  }

  console.log(`Seed selesai: ${KATEGORI.length} kategori, ${QUESTIONS.length} soal contoh.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
