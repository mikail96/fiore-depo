import { useState } from 'react';
import { useFisler } from '../data';
import { excelIndir } from '../share';
import { AltMenu, AyGezgini, Baslik, Bos, Ikon, Sekmeler, Yukleniyor } from '../ui';
import { AYLAR, AY_KISA, TL, TL0, ayAraligi, miktar, tarihYaz, urunToplamlari, yilAraligi } from '../utils';

export default function Raporlar({ ay, setAy }) {
  const [mod, setMod] = useState('aylik');
  const yillik = mod === 'yillik';
  const [bas, son] = yillik ? yilAraligi(ay.y) : ayAraligi(ay.y, ay.m);
  const { list: fisler, yuklendi } = useFisler(bas, son);

  const toplam = fisler.reduce((a, f) => a + (f.araToplam || 0), 0);
  const bedelsiz = fisler.reduce((a, f) => a + (f.bedelsizDeger || 0), 0);
  const subeMap = new Map();
  for (const f of fisler) {
    const s = subeMap.get(f.subeId) || { id: f.subeId, ad: f.subeAd, tutar: 0, adet: 0 };
    s.tutar += f.araToplam || 0; s.adet += 1; subeMap.set(f.subeId, s);
  }
  const subeler = [...subeMap.values()].sort((a, b) => b.tutar - a.tutar);
  const enBuyuk = Math.max(1, ...subeler.map((s) => s.tutar));
  const urunler = urunToplamlari(fisler);
  const aylik = AY_KISA.map((k, m) => ({ k, tutar: fisler.filter((f) => f.tarih.getMonth() === m).reduce((a, f) => a + (f.araToplam || 0), 0) }));
  const ayMax = Math.max(1, ...aylik.map((a) => a.tutar));
  const donem = yillik ? `${ay.y}` : `${AYLAR[ay.m]} ${ay.y}`;

  function excel() {
    excelIndir([
      ['Şubeler', [['Şube', 'Fiş sayısı', 'Tutar (KDV hariç)'], ...subeler.map((s) => [s.ad, s.adet, s.tutar]), [], ['Toplam', fisler.length, toplam]]],
      ['Ürünler', [['Ürün', 'Birim', 'Adet', 'Bedelsiz adet', 'Tutar (KDV hariç)'], ...urunler.map((u) => [u.ad, u.birim, u.adet, u.bedelsizAdet, u.tutar])]],
      ['Fişler', [['Fiş no', 'Tarih', 'Şube', 'Kalem', 'Ara toplam', 'KDV', 'KDV dahil', 'Toplama KDV dahil mi', 'Bedelsiz değer'],
        ...fisler.map((f) => [f.no, tarihYaz(f.tarih), f.subeAd, f.satirlar.length, f.araToplam, f.kdvToplam, f.kdvDahilToplam, f.kdvDahil ? 'Evet' : 'Hayır', f.bedelsizDeger || 0])]],
      ['Satırlar', [['Fiş no', 'Tarih', 'Şube', 'Ürün', 'Birim', 'Adet', 'Birim fiyat', 'KDV %', 'Bedelsiz', 'Tutar'],
        ...fisler.flatMap((f) => f.satirlar.map((s) => [f.no, tarihYaz(f.tarih), f.subeAd, s.ad, s.birim, s.adet, s.fiyat, s.kdv, s.bedelsiz ? 'Evet' : '', s.bedelsiz ? 0 : s.adet * s.fiyat]))]]
    ], `Fiore-depo-rapor-${donem}`.replace(/\s+/g, '-'));
  }

  return (
    <div className="ekran menulu">
      <Baslik ust="Aylık ve yıllık toplamlar" baslik="Raporlar" />
      <main className="icerik">
        <Sekmeler secenekler={[['aylik', 'Aylık'], ['yillik', 'Yıllık']]} secili={mod} onSec={setMod} />
        <AyGezgini ay={ay} setAy={setAy} yillik={yillik} />
        <section className="kart">
          <span className="soluk">{donem} sevk toplamı</span>
          <div className="buyuk-tutar"><span>{TL0(toplam)}</span><b className="kdv-etiket">+ KDV</b></div>
          <span className="soluk">{fisler.length} sevk fişi</span>
          {bedelsiz > 0 && <span className="soluk">Bedelsiz gönderilen: {TL(bedelsiz)} değerinde</span>}
        </section>
        {!yuklendi && <Yukleniyor />}
        {yuklendi && fisler.length === 0 && <Bos>{donem} için kayıt yok.</Bos>}
        {yillik && fisler.length > 0 && (
          <section className="kart">
            <h2>Aylara göre</h2>
            <div className="sutunlar">
              {aylik.map((a, i) => (
                <div key={a.k} className="sutun">
                  <small>{a.tutar ? `${Math.round(a.tutar / 1000)}B` : ''}</small>
                  <span style={{ height: `${Math.round((a.tutar / ayMax) * 110)}px` }} className={i === ay.m ? 'vurgu' : ''} />
                  <b>{a.k}</b>
                </div>
              ))}
            </div>
          </section>
        )}
        {subeler.length > 0 && (
          <section className="kart">
            <h2>Şubelere göre</h2>
            {subeler.map((s) => (
              <a key={s.id} className="cubuk-satir" href={`#/sube/${s.id}`}>
                <span className="cubuk-ust"><b>{s.ad}</b><span><b>{TL0(s.tutar)}</b> <span className="soluk">(%{((s.tutar / (toplam || 1)) * 100).toLocaleString('tr-TR', { maximumFractionDigits: 1 })})</span></span></span>
                <span className="cubuk siyah"><span style={{ width: `${Math.round((s.tutar / enBuyuk) * 100)}%` }} /></span>
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
                {u.bedelsizAdet === u.adet ? <b className="nowrap metin-yesil">Bedelsiz</b> : <b className="nowrap">{TL(u.tutar)}</b>}
              </div>
            ))}
          </section>
        )}
        <button type="button" className="dugme cizgili" onClick={excel} disabled={!fisler.length}><Ikon ad="dl" boyut={20} />Excel’e aktar</button>
      </main>
      <AltMenu aktif="#/raporlar" />
    </div>
  );
}
