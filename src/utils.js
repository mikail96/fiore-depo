export const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
export const AY_KISA = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
export const BIRIMLER = ['adet', 'kg', 'gr', 'lt', 'şişe', 'paket', 'kutu', 'koli'];
export const KDV_ORANLARI = [1, 10, 20];

export const sayiAl = (v) => {
  if (typeof v === 'number') return isFinite(v) ? v : 0;
  let s = String(v ?? '').replace(/[^\d.,-]/g, '');
  if (s.includes(',')) s = s.replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isFinite(n) ? n : 0;
};
export const TL = (n) => sayiAl(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ₺';
export const TL0 = (n) => Math.round(sayiAl(n)).toLocaleString('tr-TR') + ' ₺';
export const para = (n) => sayiAl(n).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const miktar = (n) => sayiAl(n).toLocaleString('tr-TR', { maximumFractionDigits: 3 });
export const girisMiktar = (n) => String(Math.round(sayiAl(n) * 1000) / 1000).replace('.', ',');

export const norm = (t) => String(t || '').toLocaleLowerCase('tr-TR')
  .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/i̇/g, 'i')
  .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u');

export const ayAraligi = (y, m) => [new Date(y, m, 1), new Date(y, m + 1, 1)];
export const yilAraligi = (y) => [new Date(y, 0, 1), new Date(y + 1, 0, 1)];
export const ayEkle = ({ y, m }, d) => { const t = new Date(y, m + d, 1); return { y: t.getFullYear(), m: t.getMonth() }; };
export const ayAdi = ({ y, m }) => `${AYLAR[m]} ${y}`;

export const tarihYaz = (d) => d ? d.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';
export const tarihUzun = (d) => d ? `${d.getDate()} ${AYLAR[d.getMonth()]} ${d.getFullYear()}` : '';
export const inputTarih = (d) => {
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`;
};
export const inputtanTarih = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12, 0, 0); };

// Satırlardan toplamlar. Fiyatlar KDV hariç. Bedelsiz satırlar tutara ve KDV'ye girmez,
// değerleri ayrıca "bedelsizDeger" olarak döner.
export function hesapla(satirlar) {
  const kdv = {};
  let ara = 0, bedelsiz = 0;
  for (const s of satirlar) {
    const tutar = sayiAl(s.fiyat) * sayiAl(s.adet);
    if (s.bedelsiz) { bedelsiz += tutar; continue; }
    ara += tutar;
    kdv[s.kdv] = (kdv[s.kdv] || 0) + tutar * sayiAl(s.kdv) / 100;
  }
  const kdvToplam = Object.values(kdv).reduce((a, b) => a + b, 0);
  const yuvarla = (n) => Math.round(n * 100) / 100;
  return {
    ara: yuvarla(ara),
    kdvler: Object.entries(kdv).filter(([, v]) => v > 0).map(([oran, v]) => ({ oran: Number(oran), tutar: yuvarla(v) })).sort((a, b) => a.oran - b.oran),
    kdvToplam: yuvarla(kdvToplam),
    dahil: yuvarla(ara + kdvToplam),
    bedelsizDeger: yuvarla(bedelsiz)
  };
}

// Ürünün seçilen şubeye giden fiyatı. Şubeye özel fiyat girilmişse o kullanılır;
// şube fiyatı 0 ise ürün o şubeye bedelsiz gider (fiyat bilgi için standart kalır).
export function fiyatBul(urun, subeId) {
  const v = urun?.subeFiyat?.[subeId];
  const standart = sayiAl(urun?.fiyat);
  if (v === undefined || v === null || v === '') return { fiyat: standart, subeFiyati: false, bedelsiz: false };
  const n = sayiAl(v);
  return n > 0 ? { fiyat: n, subeFiyati: true, bedelsiz: false } : { fiyat: standart, subeFiyati: false, bedelsiz: true };
}

// ---- Maliyet ve kâr (hepsi KDV hariç) ----
const girilmis = (v) => v !== undefined && v !== null && v !== '';
export const maliyetVar = (u) => girilmis(u?.maliyet);

// Satırın birim maliyeti: fiş kesilirken saklanan maliyet; yoksa (maliyet sonradan girildiyse)
// ürünün güncel maliyeti; o da yoksa null (kâr hesabına girmez).
export function birimMaliyet(s, urunMap) {
  if (girilmis(s.maliyet)) return sayiAl(s.maliyet);
  const u = urunMap?.get(s.urunId);
  return maliyetVar(u) ? sayiAl(u.maliyet) : null;
}

export const yuzde = (n) => (n === null || n === undefined || !isFinite(n) ? '—'
  : '%' + (Math.round(n * 1000) / 10).toLocaleString('tr-TR', { maximumFractionDigits: 1 }));

// Fişlerin satış, maliyet ve kârı. Bedelsiz satırlar satışa girmez ama maliyeti kârdan düşer.
// Maliyeti girilmemiş ürünlerin satışı kâr hesabına katılmaz, "eksik" olarak ayrıca döner.
export function karOzeti(fisler, urunMap) {
  let satis = 0, karSatis = 0, maliyet = 0, eksikSatis = 0, bedelsizMaliyet = 0;
  const eksik = new Set();
  for (const f of fisler) for (const s of f.satirlar || []) {
    const adet = sayiAl(s.adet);
    const tutar = s.bedelsiz ? 0 : adet * sayiAl(s.fiyat);
    satis += tutar;
    const m = birimMaliyet(s, urunMap);
    if (m === null) { eksikSatis += tutar; eksik.add(s.urunId || s.ad); continue; }
    karSatis += tutar; maliyet += m * adet;
    if (s.bedelsiz) bedelsizMaliyet += m * adet;
  }
  const kar = karSatis - maliyet;
  return { satis, karSatis, maliyet, kar, marj: karSatis > 0 ? kar / karSatis : null, eksikSatis, eksikUrun: eksik.size,
    bedelsizMaliyet, hesaplandi: karSatis > 0 || maliyet > 0 };
}

// Fişlerdeki ürünleri toplar: [{ad, birim, grup, adet, bedelsizAdet, tutar, maliyet, kar}].
// Bedelsiz adetler tutara girmez. Maliyeti bilinmeyen üründe kar = null.
export function urunToplamlari(fisler, urunMap) {
  const m = new Map();
  for (const f of fisler) for (const s of f.satirlar || []) {
    const k = s.urunId || s.ad;
    const r = m.get(k) || { ad: s.ad, birim: s.birim, grup: urunMap?.get(s.urunId)?.grup || 'Diğer',
      adet: 0, bedelsizAdet: 0, tutar: 0, maliyet: 0, maliyetEksik: false };
    const adet = sayiAl(s.adet);
    r.adet += adet;
    if (s.bedelsiz) r.bedelsizAdet += adet; else r.tutar += adet * sayiAl(s.fiyat);
    const bm = birimMaliyet(s, urunMap);
    if (bm === null) r.maliyetEksik = true; else r.maliyet += bm * adet;
    m.set(k, r);
  }
  return [...m.values()].map((r) => ({ ...r, kar: r.maliyetEksik ? null : r.tutar - r.maliyet }))
    .sort((a, b) => b.tutar - a.tutar || b.adet - a.adet);
}

// Ürün toplamlarını gruplara ayırır (grup sırası: Kahve, Sos, Püre ...), grup başına satış ve kâr.
export function grupla(urunler, grupSirasi = []) {
  const sira = (g) => { const i = grupSirasi.indexOf(g); return i < 0 ? 99 : i; };
  const m = new Map();
  for (const u of urunler) {
    const g = m.get(u.grup) || { grup: u.grup, tutar: 0, kar: 0, karEksik: false, urunler: [] };
    g.tutar += u.tutar;
    if (u.kar === null) g.karEksik = true; else g.kar += u.kar;
    g.urunler.push(u);
    m.set(u.grup, g);
  }
  return [...m.values()].sort((a, b) => sira(a.grup) - sira(b.grup) || a.grup.localeCompare(b.grup, 'tr'));
}

// Fişleri şubelere ayırır: [{id, ad, fisler}] (satışa göre büyükten küçüğe)
export function subelereAyir(fisler) {
  const m = new Map();
  for (const f of fisler) {
    const s = m.get(f.subeId) || { id: f.subeId, ad: f.subeAd, fisler: [], satis: 0 };
    s.fisler.push(f); s.satis += f.araToplam || 0; m.set(f.subeId, s);
  }
  return [...m.values()].sort((a, b) => b.satis - a.satis);
}
