// Depo takip Excel'ini (GÖKKUŞAĞI ÜRÜN sayfası) okuyup başlangıç ürün listesine çevirir.
// KDV, Excel'in STOK TAKİP sayfasındaki gruplardan gelir: sarf malzeme %20, diğer gruplar %1.
import { GRUPLAR } from './seed';
import { norm } from './utils';

const TR_KELIME = new Set(['FINDIK', 'SICAK', 'ISLAK', 'FINDIKLI', 'FISTIKLI', 'BALLI', 'SIKMA', 'ÇAYI', 'FRAMBUAZLI']);
function kelime(w) {
  const buyuk = w === w.toLocaleUpperCase('tr-TR') && /[A-ZÇĞİÖŞÜ]/.test(w);
  if (buyuk && !TR_KELIME.has(w) && !/[İŞĞÜÖÇ]/.test(w)) return w.toLowerCase(); // İngilizce ad: WHITE -> white
  return w.toLocaleLowerCase('tr-TR');
}
function adDuzenle(n) {
  const s = String(n).trim().split(/\s+/).map(kelime).join(' ').replace('14-16 oz', '14-16oz').replace('san sebastian', 'San Sebastian');
  return s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);
}

const kume = (liste) => new Set(liste.map(norm));
const SURUP = kume(['vanilya şurup', 'spiced chai', 'peekan', 'gingerbread', 'irish cream', 'cookies', 'pumpkin spice', 'fındık', 'karamel şurup',
  'lychee', 'menta', 'coconut', 'mexican lime', 'mint', 'creme brulee', 'grapefruit', 'raspberry', 'peach garden', 'çilek şurup']);
const TOZ = kume(['vanilya toz', 'color base', 'sıcak çikolata', 'milkshake tozu']);
const KAHVE_KG = kume(['espresso', 'filtre kahve', 'türk kahvesi']);
const CAY = kume(['çay', 'bitki çayı 20li']);
const KDV20_EK = kume(['pully caff']); // temizlik ürünü, Excel'de grubu yok
const SARF = ['bardak', 'kapak', 'stick şeker', 'ıslak mendil', 'sleeve', 'pipet'].map(norm);
const PASTA = ['pasta', 'cheesecake', 'sebastian', 'marlenka', 'cookie pie', 'tiramisu', 'kek', 'linzer'].map(norm);

function grupBul(a) {
  if (a.endsWith(' sos') || a === norm('callei sıkma çikolata')) return 'Sos';
  if (a.endsWith(' pure')) return 'Püre';
  if (SURUP.has(a)) return 'Şurup';
  if (TOZ.has(a)) return 'Toz';
  if (KAHVE_KG.has(a) || a === 'cold brew') return 'Kahve';
  if (CAY.has(a)) return 'Çay';
  if (SARF.some((k) => a.includes(k))) return 'Sarf malzeme';
  if (PASTA.some((k) => a.includes(k))) return 'Pasta';
  return 'Diğer';
}

export async function excelOku(dosya) {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await dosya.arrayBuffer());
  const gk = wb.Sheets['GÖKKUŞAĞI ÜRÜN'];
  if (!gk) throw new Error('Excel’de “GÖKKUŞAĞI ÜRÜN” sayfası bulunamadı.');

  let sarfKdv = 20, gidaKdv = 1;
  const st = wb.Sheets['STOK TAKİP'];
  if (st) {
    for (const [g, , k] of XLSX.utils.sheet_to_json(st, { header: 1, raw: true })) {
      if (typeof g !== 'string' || typeof k !== 'number') continue;
      if (g.trim().toUpperCase() === 'SARF MALZEME') sarfKdv = Math.round(k * 100);
      if (g.trim().toUpperCase() === 'SOS GRUBU') gidaKdv = Math.round(k * 100);
    }
  }

  const satirlar = XLSX.utils.sheet_to_json(gk, { header: 1, raw: true });
  const bas = satirlar.findIndex((r) => String(r[0] || '').trim() === 'ÜRÜN ADI');
  if (bas < 0) throw new Error('“ÜRÜN ADI” başlığı bulunamadı.');
  const ham = [];
  for (const [n, q, f] of satirlar.slice(bas + 1)) {
    if (!n || !String(n).trim() || typeof f !== 'number') continue;
    const ad = adDuzenle(n), a = norm(ad), grup = grupBul(a);
    ham.push({
      ad, grup, birim: KAHVE_KG.has(a) ? 'kg' : 'adet', fiyat: f,
      kdv: grup === 'Sarf malzeme' || KDV20_EK.has(a) ? sarfKdv : gidaKdv,
      adim: grup === 'Sarf malzeme' && f < 10 ? 50 : 1, adet: typeof q === 'number' ? q : 0
    });
  }
  if (!ham.length) throw new Error('Sayfada ürün bulunamadı.');
  ham.sort((x, y) => GRUPLAR.indexOf(x.grup) - GRUPLAR.indexOf(y.grup)); // grup içinde Excel sırası korunur
  const urunler = ham.map(({ adet, ...u }, i) => ({ id: `u${String(i + 1).padStart(3, '0')}`, ...u, sira: i + 1, subeFiyat: {} }));
  const acilis = ham.map((u, i) => [urunler[i].id, u.adet]).filter(([, q]) => q > 0);
  const acilisTutar = ham.reduce((t, u) => t + u.fiyat * u.adet, 0);
  return { urunler, acilis, acilisTutar, sarfKdv, gidaKdv };
}
