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

// Fişlerdeki ürünleri toplar: [{ad, birim, adet, bedelsizAdet, tutar}]. Bedelsiz adetler tutara girmez.
export function urunToplamlari(fisler) {
  const m = new Map();
  for (const f of fisler) for (const s of f.satirlar || []) {
    const k = s.urunId || s.ad;
    const r = m.get(k) || { ad: s.ad, birim: s.birim, adet: 0, bedelsizAdet: 0, tutar: 0 };
    const adet = sayiAl(s.adet);
    r.adet += adet;
    if (s.bedelsiz) r.bedelsizAdet += adet; else r.tutar += adet * sayiAl(s.fiyat);
    m.set(k, r);
  }
  return [...m.values()].sort((a, b) => b.tutar - a.tutar || b.adet - a.adet);
}
