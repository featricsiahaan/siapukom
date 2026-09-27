/**
 * Fase 2 (prd.md §9) langkah pertama: bulk-assign `moduleId` (bagian klinis SKD 2026)
 * berdasarkan nama kategori lama, HANYA untuk kategori yang pemetaannya jelas 1:1.
 *
 * Kategori yang cakupannya lintas-bagian (Bedah, Kegawatdaruratan, Onkologi, dll — lihat
 * CATEGORY_MODULE_MAP di bawah) SENGAJA tidak dipetakan di sini, sesuai Panduan Induk §2
 * aturan #7: "Jangan menebak, memperbaiki diam-diam, atau memindahkan penyakit berdasarkan
 * ingatan." Soal di kategori tersebut perlu ditelaah satu per satu lewat exportTelaah.ts.
 *
 * Ini hanya mengisi `moduleId` — TIDAK mengubah `status`, `primaryArea`, atau field telaah
 * lain, karena area kompetensi dan kategori sumber (Tuntas/Awal-Rujuk) bergantung pada aspek
 * keputusan tiap soal, bukan topiknya, dan tidak bisa dipetakan massal per kategori.
 *
 * Usage:
 *   npx ts-node scripts/mapModulesByCategory.ts            # dry-run, tampilkan rencana saja
 *   npx ts-node scripts/mapModulesByCategory.ts --apply     # benar-benar menulis ke DB
 */
import { PrismaClient, ClinicalModule } from '@prisma/client';

const prisma = new PrismaClient();

// Pemetaan kategori lama -> bagian klinis SKD 2026, mengikuti daftar cakupan inti
// per bagian di Panduan Induk §4. Hanya kategori yang cocok jelas dengan satu bagian
// dimasukkan di sini — lihat komentar di bawah untuk kategori yang sengaja dilewati.
const CATEGORY_MODULE_MAP: Record<string, ClinicalModule> = {
  Neurologi: 'M01_SISTEM_SARAF',
  Psikiatri: 'M02_PSIKIATRI',
  Mata: 'M03_SISTEM_INDERA',
  THT: 'M03_SISTEM_INDERA',
  Respirasi: 'M04_RESPIRASI',
  Kardiovaskular: 'M05_KARDIOVASKULER',
  Gastrointestinal: 'M06_GASTROINTESTINAL_HEPATOBILIER_PANKREAS',
  Nefrologi: 'M07_GINJAL_SALURAN_KEMIH',
  Urologi: 'M07_GINJAL_SALURAN_KEMIH',
  'Obstetri & Ginekologi': 'M08_REPRODUKSI',
  'Endokrin & Metabolik': 'M09_ENDOKRIN_METABOLIK_NUTRISI',
  Gizi: 'M09_ENDOKRIN_METABOLIK_NUTRISI',
  Hematologi: 'M10_HEMATO_IMUNOLOGI',
  Muskuloskeletal: 'M11_MUSKULOSKELETAL',
  Reumatologi: 'M11_MUSKULOSKELETAL',
  'Kulit dan Kelamin': 'M12_KULIT_INTEGUMEN',
  'Forensik dan Medikolegal': 'M13_FORENSIK_MEDIKOLEGAL',
  Pediatri: 'M14_ANAK',
};

// Kategori lama yang SENGAJA tidak dipetakan massal karena lintas-bagian atau ambigu:
// - Toksikologi: bisa masuk M06 (keracunan) atau M13 (toksikologi forensik), tergantung soal.
// - Ilmu Kesehatan Masyarakat: ini domainnya Area Kompetensi 4 (Promotif-Preventif), bukan
//   satu bagian klinis tunggal.
// - Bedah, Kegawatdaruratan, Onkologi: menurut Panduan §4, ini tampil sebagai "koleksi
//   lintas bagian" — bisa mengenai organ/sistem apa pun, tergantung isi soal.
// - Infeksi Tropis: sebagian (dengue/malaria/leptospirosis) disebut Panduan masuk M10, tapi
//   kategori ini kemungkinan juga berisi infeksi sistem lain — perlu dicek per soal.
const SKIPPED_AMBIGUOUS_CATEGORIES = [
  'Toksikologi',
  'Ilmu Kesehatan Masyarakat',
  'Bedah',
  'Kegawatdaruratan',
  'Onkologi',
  'Infeksi Tropis',
];

async function main() {
  const apply = process.argv.includes('--apply');

  const categories = await prisma.category.findMany({
    include: { _count: { select: { questions: true } } },
  });

  const plan: { kategori: string; moduleId: ClinicalModule; jumlah: number }[] = [];
  const skipped: { kategori: string; jumlah: number; alasan: string }[] = [];
  const unknown: { kategori: string; jumlah: number }[] = [];

  for (const cat of categories) {
    if (cat._count.questions === 0) continue;
    const moduleId = CATEGORY_MODULE_MAP[cat.name];
    if (moduleId) {
      plan.push({ kategori: cat.name, moduleId, jumlah: cat._count.questions });
    } else if (SKIPPED_AMBIGUOUS_CATEGORIES.includes(cat.name)) {
      skipped.push({ kategori: cat.name, jumlah: cat._count.questions, alasan: 'lintas-bagian/ambigu, perlu telaah per soal' });
    } else {
      unknown.push({ kategori: cat.name, jumlah: cat._count.questions });
    }
  }

  console.log(`Mode: ${apply ? 'APPLY (menulis ke DB)' : 'DRY-RUN (tidak menulis apa pun)'}`);
  console.log('\n=== Akan dipetakan ===');
  console.table(plan);
  console.log('\n=== Dilewati (butuh telaah per soal via exportTelaah.ts) ===');
  console.table(skipped);
  if (unknown.length > 0) {
    console.log('\n=== PERINGATAN: kategori tidak dikenal skrip ini, tidak dipetakan maupun dilewati sengaja ===');
    console.table(unknown);
  }

  if (!apply) {
    console.log('\nJalankan ulang dengan --apply untuk benar-benar menulis moduleId ke database.');
    await prisma.$disconnect();
    return;
  }

  let totalUpdated = 0;
  for (const item of plan) {
    const category = categories.find((c) => c.name === item.kategori)!;
    const result = await prisma.question.updateMany({
      where: { categoryId: category.id, moduleId: null },
      data: { moduleId: item.moduleId },
    });
    totalUpdated += result.count;
    console.log(`${item.kategori} -> ${item.moduleId}: ${result.count} soal diperbarui`);
  }
  console.log(`\nTotal soal diperbarui: ${totalUpdated}`);
  console.log('Catatan: hanya moduleId yang diisi. primaryArea/sourceCategory/decisionType/reviewer masih kosong — lanjutkan lewat exportTelaah.ts + importTelaah.ts.');

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
