import { useMemo, useRef, useState } from 'react';
import { useFisler } from '../data';
import { KarOzetKutusu, KarYazisi } from '../KarOzeti';
import { RaporBelgesi } from '../RaporBelgesi';
import { excelIndir, kutuphaneleriHazirla, pdfIndir } from '../share';
import { AltMenu, AyGezgini, Baslik, Bos, Ikon, Sekmeler, Yukleniyor } from '../ui';
import { AYLAR, AY_KISA, TL, TL0, ayAraligi, karOzeti, miktar, subelereAyir, tarihYaz, urunToplamlari, yilAraligi, yuzde } from '../utils';

export default function Raporlar({ ay, setAy, urunler: urunKatalogu }) {
  const [mod, setMod] = useState('aylik');
  const [bekle, setBekle] = useState(false);
  const [hata, setHata] = useState('');
  const belgeRef = useRef(null);
  const yillik = mod === 'yillik';
  const [bas, son] = yillik ? yilAraligi(ay.y) : ayAraligi(ay.y, ay.m);
  const { list: fisler, yuklendi } = useFisler(bas, son);
  const urunMap = useMemo(() => new Map(urunKatalogu.list.map((u) => [u.id, u])), [urunKatalogu.list]);

  const o = karOzeti(fisler, urunMap);
  const bedelsiz = fisler.reduce((a, f) => a + (f.bedelsizDeger || 0), 0);
  const subeler = subelereAyir(fisler).map((s) => ({ ...s, o: karOzeti(s.fisler, urunMap) }));
  const enBuyuk = Math.max(1, ...subeler.map((s) => s.o.satis));
  const urunler = urunToplamlari(fisler, urunMap);
  const aylik = AY_KISA.map((k, m) => {
    const fs = fisler.filter((f) => f.tarih.getMonth() === m);
    return { k, m, adet: fs.length, o: karOzeti(fs, urunMap) };
  });
  const ayMax = Math.max(1, ...aylik.map((a) => a.o.satis));
  const donem = yillik ? `${ay.y}` : `${AYLAR[ay.m]} ${ay.y}`;
  const dosya = `Fiore-depo-rapor-${donem}`.replace(/\s+/g, '-');

  async function pdf() {
    setBekle(true); setHata('');
    try { await pdfIndir(belgeRef.current, dosya); }
    catch (e) { console.error(e); setHata('PDF hazırlanamadı. Tekrar dene.'); }
    setBekle(false);
  }
  function excel() {
    const kr = (x) => (x.hesaplandi ? [x.maliyet, x.kar] : ['', '']);
    excelIndir([
      ['Şubeler', [['Şube', 'Fiş sayısı', 'Satış (KDV hariç)', 'Maliyet', 'Kâr'], ...subeler.map((s) => [s.ad, s.fisler.length, s.o.satis, ...kr(s.o)]), [], ['Toplam', fisler.length, o.satis, ...kr(o)]]],
      ['Ürünler', [['Ürün', 'Grup', 'Birim', 'Adet', 'Bedelsiz adet', 'Satış (KDV hariç)', 'Maliyet', 'Kâr'],
        ...urunler.map((u) => [u.ad, u.grup, u.birim, u.adet, u.bedelsizAdet, u.tutar, u.kar === null ? '' : u.maliyet, u.kar === null ? '' : u.kar])]],
      ['Fişler', [['Fiş no', 'Tarih', 'Şube', 'Kalem', 'Ara toplam', 'KDV', 'KDV dahil', 'Toplama KDV dahil mi', 'Bedelsiz değer'],
        ...fisler.map((f) => [f.no, tarihYaz(f.tarih), f.subeAd, f.satirlar.length, f.araToplam, f.kdvToplam, f.kdvDahilToplam, f.kdvDahil ? 'Evet' : 'Hayır', f.bedelsizDeger || 0])]],
      ['Satırlar', [['Fiş no', 'Tarih', 'Şube', 'Ürün', 'Birim', 'Adet', 'Birim fiyat', 'KDV %', 'Bedelsiz', 'Tutar'],
        ...fisler.flatMap((f) => f.satirlar.map((s) => [f.no, tarihYaz(f.tarih), f.subeAd, s.ad, s.birim, s.adet, s.fiyat, s.kdv, s.bedelsiz ? 'Evet' : '', s.bedelsiz ? 0 : s.adet * s.fiyat]))]]
    ], dosya);
  }

  return (
    <div className="ekran menulu">
      <Baslik ust="Satış, maliyet ve kâr" baslik="Raporlar" />
      <main className="icerik">
        <Sekmeler secenekler={[['aylik', 'Aylık'], ['yillik', 'Yıllık']]} secili={mod} onSec={setMod} />
        <AyGezgini ay={ay} setAy={setAy} yillik={yillik} />
        <section className="kart">
          <span className="soluk">{donem} şubelere satış</span>
          <div className="buyuk-tutar"><span>{TL0(o.satis)}</span><b className="kdv-etiket">+ KDV</b></div>
          <span className="soluk">{fisler.length} sevk fişi{bedelsiz > 0 ? `, bedelsiz gönderilen ${TL0(bedelsiz)} değerinde` : ''}</span>
          {fisler.length > 0 && <KarOzetKutusu o={o} />}
        </section>
        {!yuklendi && <Yukleniyor />}
        {yuklendi && fisler.length === 0 && <Bos>{donem} için kayıt yok.</Bos>}
        {yillik && fisler.length > 0 && (
          <section className="kart">
            <h2>Aylara göre</h2>
            <div className="sutunlar">
              {aylik.map((a, i) => (
                <div key={a.k} className="sutun">
                  <small>{a.o.satis ? `${Math.round(a.o.satis / 1000)}B` : ''}</small>
                  <span style={{ height: `${Math.round((a.o.satis / ayMax) * 110)}px` }} className={i === ay.m ? 'vurgu' : ''} />
                  <b>{a.k}</b>
                </div>
              ))}
            </div>
            {aylik.filter((a) => a.adet).map((a) => (
              <div key={a.k} className="liste-satir">
                <span className="yigin"><b>{AYLAR[a.m]}</b><small>{a.adet} fiş{a.o.hesaplandi ? `, kâr oranı ${yuzde(a.o.oran)}` : ''}</small></span>
                <span className="yigin sag"><b className="nowrap">{TL0(a.o.satis)}</b>{a.o.hesaplandi ? <KarYazisi kar={a.o.kar} /> : <small>maliyet yok</small>}</span>
              </div>
            ))}
          </section>
        )}
        {subeler.length > 0 && (
          <section className="kart">
            <h2>Şubelere göre</h2>
            {subeler.map((s) => (
              <a key={s.id} className="cubuk-satir" href={`#/sube/${s.id}`}>
                <span className="cubuk-ust"><b>{s.ad}</b><span><b>{TL0(s.o.satis)}</b> <span className="soluk">(%{((s.o.satis / (o.satis || 1)) * 100).toLocaleString('tr-TR', { maximumFractionDigits: 1 })})</span></span></span>
                <span className="cubuk siyah"><span style={{ width: `${Math.round((s.o.satis / enBuyuk) * 100)}%` }} /></span>
                {s.o.hesaplandi && <span className="satir-arasi"><small>{s.fisler.length} fiş, kâr oranı {yuzde(s.o.oran)}</small><KarYazisi kar={s.o.kar} /></span>}
              </a>
            ))}
          </section>
        )}
        {urunler.length > 0 && (
          <section className="kart sikisik">
            <h2>En çok giden ürünler</h2>
            {urunler.slice(0, 10).map((u) => (
              <div key={u.ad} className="liste-satir">
                <span className="yigin"><b>{u.ad}</b><small>{miktar(u.adet)} {u.birim}{u.bedelsizAdet ? `, ${miktar(u.bedelsizAdet)} bedelsiz` : ''}</small></span>
                <span className="yigin sag">
                  {u.bedelsizAdet === u.adet ? <b className="nowrap metin-yesil">Bedelsiz</b> : <b className="nowrap">{TL(u.tutar)}</b>}
                  <KarYazisi kar={u.kar} />
                </span>
              </div>
            ))}
          </section>
        )}
        {hata && <div className="bilgi hata-kutu" role="alert"><Ikon ad="x" /><span>{hata}</span></div>}
        <div className="dugme-satiri">
          <button type="button" className="dugme cizgili" onClick={excel} disabled={!fisler.length}><Ikon ad="dl" boyut={20} />Excel</button>
          <button type="button" className="dugme siyah genis" onClick={pdf} onPointerEnter={kutuphaneleriHazirla} onFocus={kutuphaneleriHazirla} disabled={!fisler.length || bekle}>
            <Ikon ad="doc" boyut={20} />{bekle ? 'Hazırlanıyor…' : 'Rapor PDF'}
          </button>
        </div>
      </main>
      <AltMenu aktif="#/raporlar" />
      <div className="gizli-belge" aria-hidden="true">
        <RaporBelgesi ref={belgeRef} baslik={yillik ? `${ay.y} yıllık rapor` : `${donem} aylık rapor`} fisler={fisler} urunMap={urunMap} yillik={yillik} />
      </div>
    </div>
  );
}
