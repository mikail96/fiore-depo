import { useEffect, useState } from 'react';
import {
  collection, doc, onSnapshot, query, orderBy, where, limit, getDocs, Timestamp,
  addDoc, setDoc, updateDoc, deleteDoc, writeBatch, serverTimestamp, arrayUnion
} from 'firebase/firestore';
import { db } from './firebase';
import { fiyatBul, hesapla, sayiAl } from './utils';
import { BASLANGIC_SUBELER } from './seed';

const tarihli = (d) => ({ ...d, tarih: d.tarih?.toDate ? d.tarih.toDate() : d.tarih });

// ---------- okuma ----------
export function useKoleksiyon(ad) {
  const [state, setState] = useState({ list: [], yuklendi: false, hata: null });
  useEffect(() => onSnapshot(
    query(collection(db, ad), orderBy('sira')),
    (snap) => setState({ list: snap.docs.map((d) => ({ id: d.id, ...d.data() })), yuklendi: true, hata: null }),
    (hata) => setState((s) => ({ ...s, yuklendi: true, hata }))
  ), [ad]);
  return state;
}

export function useFisler(bas, son) {
  const [state, setState] = useState({ list: [], yuklendi: false });
  const b = bas.getTime(), s = son.getTime();
  useEffect(() => {
    setState({ list: [], yuklendi: false });
    return onSnapshot(
      query(collection(db, 'fisler'),
        where('tarih', '>=', Timestamp.fromMillis(b)), where('tarih', '<', Timestamp.fromMillis(s)),
        orderBy('tarih', 'desc')),
      (snap) => setState({ list: snap.docs.map((d) => tarihli({ id: d.id, ...d.data() })), yuklendi: true }),
      () => setState({ list: [], yuklendi: true })
    );
  }, [b, s]);
  return state;
}

export function useFis(id) {
  const [state, setState] = useState({ fis: null, yuklendi: false });
  useEffect(() => {
    if (!id) { setState({ fis: null, yuklendi: true }); return undefined; }
    return onSnapshot(doc(db, 'fisler', id),
      (d) => setState({ fis: d.exists() ? tarihli({ id: d.id, ...d.data() }) : null, yuklendi: true }),
      () => setState({ fis: null, yuklendi: true }));
  }, [id]);
  return state;
}

// ---------- ürünler ----------
export async function urunKaydet(eski, veri) {
  const temiz = {
    ad: veri.ad.trim(), grup: veri.grup, birim: veri.birim,
    kdv: Number(veri.kdv), fiyat: sayiAl(veri.fiyat), adim: sayiAl(veri.adim) > 0 ? sayiAl(veri.adim) : 1,
    // şubeye özel fiyatlar: boş bırakılan şube standart fiyatı kullanır, 0 = bedelsiz
    subeFiyat: Object.fromEntries(Object.entries(veri.subeFiyat || {})
      .filter(([, v]) => String(v ?? '').trim() !== '').map(([k, v]) => [k, sayiAl(v)]))
  };
  if (!eski) {
    return addDoc(collection(db, 'urunler'), { ...temiz, sira: Date.now(), fiyatGecmisi: [], olusturma: serverTimestamp() });
  }
  const guncelle = { ...temiz, guncelleme: serverTimestamp() };
  if (sayiAl(eski.fiyat) !== temiz.fiyat) {
    guncelle.fiyatGecmisi = arrayUnion({ tarih: Timestamp.now(), eski: sayiAl(eski.fiyat), yeni: temiz.fiyat });
  }
  return updateDoc(doc(db, 'urunler', eski.id), guncelle);
}
export const urunSil = (id) => deleteDoc(doc(db, 'urunler', id));

// ---------- şubeler ----------
export async function subeKaydet(eski, veri) {
  const temiz = {
    ad: veri.ad.trim(), yetkili: veri.yetkili.trim(), telefon: veri.telefon.trim(),
    adres: veri.adres.trim(), aktif: !!veri.aktif
  };
  if (!eski) return addDoc(collection(db, 'subeler'), { ...temiz, sira: Date.now(), olusturma: serverTimestamp() });
  return updateDoc(doc(db, 'subeler', eski.id), { ...temiz, guncelleme: serverTimestamp() });
}
export const subeSil = (id) => deleteDoc(doc(db, 'subeler', id));

// ---------- fişler ----------
// Fiş no yıl içinde sıralı: SV-2026-0001. Tek kullanıcı olduğu için son fişe bakarak verilir,
// internet yokken de telefondaki kayıtlardan çalışır.
async function sonrakiNo(yil) {
  const snap = await getDocs(query(collection(db, 'fisler'), orderBy('sayi', 'desc'), limit(1)));
  const son = snap.empty ? 0 : snap.docs[0].data().sayi || 0;
  const n = son >= yil * 10000 && son < (yil + 1) * 10000 ? son - yil * 10000 + 1 : 1;
  return { no: `SV-${yil}-${String(n).padStart(4, '0')}`, sayi: yil * 10000 + n };
}

function fisVerisi(v) {
  const satirlar = v.satirlar
    .filter((s) => sayiAl(s.adet) > 0)
    .map((s) => ({
      urunId: s.urunId || null, ad: s.ad, birim: s.birim, fiyat: sayiAl(s.fiyat), kdv: Number(s.kdv), adet: sayiAl(s.adet),
      bedelsiz: !!s.bedelsiz, subeFiyati: !!s.subeFiyati
    }));
  const t = hesapla(satirlar);
  return {
    tarih: Timestamp.fromDate(v.tarih), subeId: v.sube.id, subeAd: v.sube.ad, satirlar,
    araToplam: t.ara, kdvToplam: t.kdvToplam, kdvDahilToplam: t.dahil, kdvDahil: !!v.kdvDahil, bedelsizDeger: t.bedelsizDeger,
    not: (v.not || '').trim()
  };
}

export async function fisKaydet(id, v) {
  const veri = fisVerisi(v);
  if (id) {
    updateDoc(doc(db, 'fisler', id), { ...veri, guncelleme: serverTimestamp() }).catch(() => {});
    return id;
  }
  const numara = await sonrakiNo(v.tarih.getFullYear());
  const ref = doc(collection(db, 'fisler'));
  // await etmeden devam: internet yoksa kayıt telefonda bekler, bağlanınca gider
  setDoc(ref, { ...veri, ...numara, olusturma: serverTimestamp() }).catch(() => {});
  return ref.id;
}
export const fisSil = (id) => deleteDoc(doc(db, 'fisler', id));

// ---------- ilk kurulum ----------
// veri: excelKurulum.excelOku() çıktısı
export async function baslangicYukle({ urunler, acilis }, { acilisFisi }) {
  const batch = writeBatch(db);
  for (const u of urunler) {
    const { id, ...r } = u;
    batch.set(doc(db, 'urunler', id), { subeFiyat: {}, ...r, fiyatGecmisi: [], olusturma: serverTimestamp() });
  }
  for (const s of BASLANGIC_SUBELER) {
    const { id, ...r } = s;
    batch.set(doc(db, 'subeler', id), { ...r, yetkili: '', telefon: '', adres: '', aktif: true, olusturma: serverTimestamp() });
  }
  await batch.commit();
  if (acilisFisi && acilis.length) {
    const urun = Object.fromEntries(urunler.map((u) => [u.id, u]));
    await fisKaydet(null, {
      tarih: new Date(), sube: { id: 'gokkusagi', ad: 'Gökkuşağı' }, kdvDahil: false,
      not: 'Excel’deki Gökkuşağı sayfasından aktarılan bu ayki çekişler.',
      satirlar: acilis.map(([uid, adet]) => ({ urunId: uid, ad: urun[uid].ad, birim: urun[uid].birim, kdv: urun[uid].kdv, adet, ...fiyatBul(urun[uid], 'gokkusagi') }))
    });
  }
}
