import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { baslangicYukle, useFisler } from '../data';
import { AltMenu, AyGezgini, Baslik, Ikon, Yukleniyor } from '../ui';
import { AYLAR, TL, TL0, ayAraligi } from '../utils';
import { BASLANGIC_SUBELER } from '../seed';
import { excelOku } from '../excelKurulum';

function Kurulum() {
  const [veri, setVeri] = useState(null);
  const [acilis, setAcilis] = useState(true);
  const [bekle, setBekle] = useState(false);
  const [hata, setHata] = useState('');
  async function dosyaSec(e) {
    const dosya = e.target.files?.[0];
    e.target.value = '';
    if (!dosya) return;
    setHata(''); setVeri(null);
    try { setVeri(await excelOku(dosya)); }
    catch (err) { setHata(err?.message || 'Excel okunamadı.'); }
  }
  async function yukle() {
    setBekle(true); setHata('');
    try { await baslangicYukle(veri, { acilisFisi: acilis }); }
    catch { setHata('Yüklenemedi. İnternet bağlantısını kontrol edip tekrar dene.'); setBekle(false); }
  }
  const gruplar = veri ? [...new Set(veri.urunler.map((u) => u.grup))] : [];
  return (
    <section className="kart kurulum">
      <h2>Başlangıç verileri</h2>
      <p>Depo Excel’ini seç (Depo_Takip_Son.xlsx). Ürünler ve fiyatlar Gökkuşağı sayfasından, KDV oranları Stok Takip sayfasındaki gruplardan okunur. Ayrıca {BASLANGIC_SUBELER.length} şube ({BASLANGIC_SUBELER.map((s) => s.ad).join(', ')}) eklenir. Hepsini sonradan düzenleyebilirsin.</p>
      <label className="dugme cizgili buyuk dosya-sec">
        <Ikon ad="doc" boyut={20} />{veri ? 'Başka dosya seç' : 'Excel dosyasını seç'}
        <input type="file" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={dosyaSec} />
      </label>
      {veri && (
        <>
          <div className="bilgi basari"><Ikon ad="check" /><span>{veri.urunler.length} ürün, {gruplar.length} grup okundu. KDV: sarf malzeme %{veri.sarfKdv}, diğerleri %{veri.gidaKdv}.</span></div>
          {veri.acilis.length > 0 && (
            <label className="kutucuk">
              <input type="checkbox" checked={acilis} onChange={(e) => setAcilis(e.target.checked)} />
              <span>Gökkuşağı’nın bu ayki çekişlerini açılış fişi olarak ekle ({veri.acilis.length} kalem, {TL0(veri.acilisTutar)})</span>
            </label>
          )}
          <button type="button" className="dugme siyah buyuk" onClick={yukle} disabled={bekle}>{bekle ? 'Yükleniyor…' : 'Yükle'}</button>
        </>
      )}
      {hata && <p className="hata" role="alert">{hata}</p>}
    </section>
  );
}

export default function PanelEkrani({ ay, setAy, subeler, urunler }) {
  const [bas, son] = ayAraligi(ay.y, ay.m);
  const { list: fisler, yuklendi } = useFisler(bas, son);
  const bosKurulum = subeler.yuklendi && urunler.yuklendi && subeler.list.length === 0 && urunler.list.length === 0;

  const toplam = fisler.reduce((a, f) => a + (f.araToplam || 0), 0);
  const subeToplam = new Map();
  for (const f of fisler) subeToplam.set(f.subeId, (subeToplam.get(f.subeId) || 0) + (f.araToplam || 0));
  const satirlar = subeler.list
    .map((s) => ({ ...s, tutar: subeToplam.get(s.id) || 0 }))
    .filter((s) => s.aktif !== false || s.tutar > 0);
  // silinmiş şubelere giden fişler de toplamda görünsün
  for (const f of fisler) if (!subeler.list.some((s) => s.id === f.subeId) && !satirlar.some((s) => s.id === f.subeId)) {
    satirlar.push({ id: f.subeId, ad: f.subeAd, tutar: subeToplam.get(f.subeId), silinmis: true });
  }
  const enBuyuk = Math.max(1, ...satirlar.map((s) => s.tutar));
  const fisliSube = new Set(fisler.map((f) => f.subeId)).size;

  async function cikis() {
    if (window.confirm('Çıkış yapılsın mı?')) await signOut(auth);
  }

  return (
    <div className="ekran menulu">
      <Baslik ust="Ana depo" baslik="Panel"
        sag={<button type="button" className="ikon-dugme koyu" aria-label="Çıkış yap" onClick={cikis}><Ikon ad="cikis" /></button>} />
      <main className="icerik">
        <AyGezgini ay={ay} setAy={setAy} />
        {bosKurulum && <Kurulum />}
        <section className="kart">
          <span className="soluk">{AYLAR[ay.m]} ayında şubelere giden</span>
          <div className="buyuk-tutar"><span>{TL0(toplam)}</span><b className="kdv-etiket">+ KDV</b></div>
          <span className="soluk">{fisler.length} sevk fişi, {fisliSube} şube</span>
        </section>
        <section className="kart">
          <div className="kart-baslik"><h2>Şubelere göre</h2><a href="#/subeler">Tüm şubeler</a></div>
          {satirlar.length === 0 && <p className="soluk">Henüz şube yok.</p>}
          {satirlar.map((s) => (
            <a key={s.id} className="cubuk-satir" href={s.silinmis ? '#/fisler' : `#/sube/${s.id}`}>
              <span className="cubuk-ust"><b>{s.ad}</b><b>{TL0(s.tutar)}</b></span>
              <span className="cubuk"><span style={{ width: `${Math.round((s.tutar / enBuyuk) * 100)}%` }} /></span>
            </a>
          ))}
        </section>
        <section className="kart sikisik">
          <div className="kart-baslik"><h2>Son sevk fişleri</h2><a href="#/fisler">Tümünü gör</a></div>
          {!yuklendi && <Yukleniyor />}
          {yuklendi && fisler.length === 0 && <p className="soluk">Bu ay henüz fiş yok.</p>}
          {fisler.slice(0, 5).map((f) => (
            <a key={f.id} className="liste-satir" href={`#/fis/${f.id}`}>
              <span className="yigin"><b>{f.no}</b><small>{f.subeAd}, {f.tarih.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}</small></span>
              <span className="yigin sag"><b>{TL(f.kdvDahil ? f.kdvDahilToplam : f.araToplam)}</b><small className={f.kdvDahil ? 'metin-yesil' : 'metin-turuncu'}>{f.kdvDahil ? 'KDV dahil' : '+ KDV'}</small></span>
            </a>
          ))}
        </section>
      </main>
      <a className="yuzen" href="#/fis/yeni"><Ikon ad="plus" boyut={20} kalinlik={2.2} />Yeni sevk fişi</a>
      <AltMenu aktif="#/" />
    </div>
  );
}
