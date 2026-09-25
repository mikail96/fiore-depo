import { useState } from 'react';
import { useFisler } from '../data';
import { excelIndir } from '../share';
import { AltBaslik, Bos, Ikon, Sekmeler, Yukleniyor } from '../ui';
import { AYLAR, TL, TL0, ayEkle, miktar, tarihYaz, urunToplamlari } from '../utils';

const kisa = (t) => (t === 0 ? '—' : t < 10000 ? TL0(t) : `${Math.round(t / 1000)} B ₺`);

export default function SubeDetay({ id, ay, subeler }) {
  const aylar = [-5, -4, -3, -2, -1, 0].map((d) => ayEkle(ay, d));
  const bas = new Date(aylar[0].y, aylar[0].m, 1);
  const son = new Date(ay.y, ay.m + 1, 1);
  const { list, yuklendi } = useFisler(bas, son);
  const [secim, setSecim] = useState(5);
  const [sekme, setSekme] = useState('urun');

  const fisler = list.filter((f) => f.subeId === id);
  const sube = subeler.list.find((s) => s.id === id) || (fisler[0] && { ad: fisler[0].subeAd, silinmis: true });
  const ayinFisleri = (a) => fisler.filter((f) => f.tarih.getFullYear() === a.y && f.tarih.getMonth() === a.m);
  const secilenAy = aylar[secim];
  const secili = ayinFisleri(secilenAy);
  const toplam = secili.reduce((a, f) => a + (f.araToplam || 0), 0);
  const dahil = secili.reduce((a, f) => a + (f.kdvDahilToplam || 0), 0);
  const bedelsiz = secili.reduce((a, f) => a + (f.bedelsizDeger || 0), 0);
  const urunler = urunToplamlari(secili);

  if (subeler.yuklendi && yuklendi && !sube) {
    return <div className="ekran"><AltBaslik geri="#/subeler" geriEtiket="Şubeler" baslik="Şube bulunamadı" /><Bos>Bu şube kaldırılmış olabilir.</Bos></div>;
  }
  const ad = sube?.ad || '';
  const alt = [sube?.yetkili, sube?.telefon].filter(Boolean).join(', ') || 'Aylık gönderilenler ve ürün listesi';

  function excel() {
    const ayAd = `${AYLAR[secilenAy.m]} ${secilenAy.y}`;
    excelIndir([
      ['Ürünler', [['Ürün', 'Birim', 'Adet', 'Bedelsiz adet', 'Tutar (KDV hariç)'], ...urunler.map((u) => [u.ad, u.birim, u.adet, u.bedelsizAdet, u.tutar]), [], ['Toplam', '', '', '', toplam]]],
      ['Fişler', [['Fiş no', 'Tarih', 'Kalem', 'Ara toplam', 'KDV', 'KDV dahil'], ...secili.map((f) => [f.no, tarihYaz(f.tarih), f.satirlar.length, f.araToplam, f.kdvToplam, f.kdvDahilToplam])]]
    ], `${ad}-${ayAd}`.replace(/\s+/g, '-'));
  }

  return (
    <div className="ekran cubuklu">
      <AltBaslik geri="#/subeler" geriEtiket="Şubeler" baslik={ad || '…'} alt={alt} />
      <main className="icerik">
        <div className="ay-cipleri">
          {aylar.map((a, i) => (
            <button key={`${a.y}-${a.m}`} type="button" className={i === secim ? 'secili' : ''} aria-pressed={i === secim} onClick={() => setSecim(i)}>
              <span>{AYLAR[a.m]}</span>
              <b>{yuklendi ? kisa(ayinFisleri(a).reduce((t, f) => t + (f.araToplam || 0), 0)) : '…'}</b>
            </button>
          ))}
        </div>
        <section className="kart">
          <span className="soluk">{AYLAR[secilenAy.m]} {secilenAy.y} gönderilen</span>
          <div className="buyuk-tutar orta"><span>{TL(toplam)}</span><b className="kdv-etiket">+ KDV</b></div>
          <span className="soluk">KDV dahil {TL(dahil)}, {secili.length} sevk fişi</span>
          {bedelsiz > 0 && <span className="soluk">Bedelsiz gönderilen: {TL(bedelsiz)} değerinde</span>}
        </section>
        <Sekmeler secenekler={[['urun', `Ürünler (${urunler.length})`], ['fis', `Fişler (${secili.length})`]]} secili={sekme} onSec={setSekme} />
        {!yuklendi && <Yukleniyor />}
        {yuklendi && secili.length === 0 && <Bos>Bu ay bu şubeye fiş kesilmemiş.</Bos>}
        {sekme === 'urun' && urunler.length > 0 && (
          <section className="kart sikisik">
            {urunler.map((u) => (
              <div key={u.ad} className="liste-satir">
                <span className="yigin"><b>{u.ad}</b><small>{miktar(u.adet)} {u.birim}{u.bedelsizAdet ? `, ${miktar(u.bedelsizAdet)} bedelsiz` : ''}</small></span>
                {u.bedelsizAdet === u.adet ? <b className="nowrap metin-yesil">Bedelsiz</b> : <b className="nowrap">{TL(u.tutar)}</b>}
              </div>
            ))}
          </section>
        )}
        {sekme === 'fis' && secili.length > 0 && (
          <section className="kart sikisik">
            {secili.map((f) => (
              <a key={f.id} className="liste-satir" href={`#/fis/${f.id}`}>
                <span className="yigin"><b>{f.no}</b><small>{f.tarih.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}, {f.satirlar.length} kalem</small></span>
                <span className="yigin sag"><b className="nowrap">{TL(f.kdvDahil ? f.kdvDahilToplam : f.araToplam)}</b><small className={f.kdvDahil ? 'metin-yesil' : 'metin-turuncu'}>{f.kdvDahil ? 'KDV dahil' : '+ KDV'}</small></span>
              </a>
            ))}
          </section>
        )}
      </main>
      <div className="alt-cubuk">
        <button type="button" className="dugme cizgili" onClick={excel} disabled={!secili.length}><Ikon ad="dl" boyut={20} />Excel</button>
        {sube && !sube.silinmis && sube.aktif !== false
          ? <a className="dugme siyah genis" href={`#/fis/yeni?sube=${id}`}><Ikon ad="plus" boyut={20} kalinlik={2.2} />Bu şubeye fiş kes</a>
          : <span className="soluk genis">Bu şube pasif.</span>}
      </div>
    </div>
  );
}
