import { useMemo, useRef, useState } from 'react';
import { useFisler } from '../data';
import { KarOzetKutusu, KarYazisi } from '../KarOzeti';
import { RaporBelgesi, SubeDokumu } from '../RaporBelgesi';
import { GRUPLAR } from '../seed';
import { excelIndir, kutuphaneleriHazirla, pdfIndir } from '../share';
import { AltBaslik, Bos, Ikon, Panel, Sekmeler, Yukleniyor } from '../ui';
import { AYLAR, TL, TL0, ayEkle, grupla, karOzeti, miktar, tarihYaz, urunToplamlari } from '../utils';

const kisa = (t) => (t === 0 ? '—' : t < 10000 ? TL0(t) : `${Math.round(t / 1000)} B ₺`);

export default function SubeDetay({ id, ay, subeler, urunler: urunKatalogu }) {
  const aylar = [-5, -4, -3, -2, -1, 0].map((d) => ayEkle(ay, d));
  const bas = new Date(aylar[0].y, aylar[0].m, 1);
  const son = new Date(ay.y, ay.m + 1, 1);
  const { list, yuklendi } = useFisler(bas, son);
  const [secim, setSecim] = useState(5);
  const [sekme, setSekme] = useState('urun');
  const [bekle, setBekle] = useState(false);
  const belgeRef = useRef(null);
  const dokumRef = useRef(null);
  const [pdfSecim, setPdfSecim] = useState(false);
  const urunMap = useMemo(() => new Map(urunKatalogu.list.map((u) => [u.id, u])), [urunKatalogu.list]);

  const fisler = list.filter((f) => f.subeId === id);
  const sube = subeler.list.find((s) => s.id === id) || (fisler[0] && { ad: fisler[0].subeAd, silinmis: true });
  const ayinFisleri = (a) => fisler.filter((f) => f.tarih.getFullYear() === a.y && f.tarih.getMonth() === a.m);
  const secilenAy = aylar[secim];
  const secili = ayinFisleri(secilenAy);
  const toplam = secili.reduce((a, f) => a + (f.araToplam || 0), 0);
  const dahil = secili.reduce((a, f) => a + (f.kdvDahilToplam || 0), 0);
  const bedelsiz = secili.reduce((a, f) => a + (f.bedelsizDeger || 0), 0);
  const urunler = urunToplamlari(secili, urunMap);
  const gruplar = grupla(urunler, GRUPLAR);
  const o = karOzeti(secili, urunMap);

  if (subeler.yuklendi && yuklendi && !sube) {
    return <div className="ekran"><AltBaslik geri="#/subeler" geriEtiket="Şubeler" baslik="Şube bulunamadı" /><Bos>Bu şube kaldırılmış olabilir.</Bos></div>;
  }
  const ad = sube?.ad || '';
  const alt = [sube?.yetkili, sube?.telefon].filter(Boolean).join(', ') || 'Aylık gönderilenler ve ürün listesi';

  function excel() {
    const ayAd = `${AYLAR[secilenAy.m]} ${secilenAy.y}`;
    excelIndir([
      ['Ürünler', [['Ürün', 'Grup', 'Birim', 'Adet', 'Bedelsiz adet', 'Satış (KDV hariç)', 'Maliyet', 'Kâr'],
        ...urunler.map((u) => [u.ad, u.grup, u.birim, u.adet, u.bedelsizAdet, u.tutar, u.kar === null ? '' : u.maliyet, u.kar === null ? '' : u.kar]),
        [], ['Toplam', '', '', '', '', toplam, o.hesaplandi ? o.maliyet : '', o.hesaplandi ? o.kar : '']]],
      ['Fişler', [['Fiş no', 'Tarih', 'Kalem', 'Ara toplam', 'KDV', 'KDV dahil'], ...secili.map((f) => [f.no, tarihYaz(f.tarih), f.satirlar.length, f.araToplam, f.kdvToplam, f.kdvDahilToplam])]]
    ], `${ad}-${ayAd}`.replace(/\s+/g, '-'));
  }

  // subeIcin: şubeye gönderilecek döküm (maliyet ve kâr yok); değilse kâr ve maliyetli iç rapor
  async function pdf(subeIcin) {
    setPdfSecim(false); setBekle(true);
    const ek = subeIcin ? 'sevk-dokumu' : 'kar-raporu';
    try { await pdfIndir((subeIcin ? dokumRef : belgeRef).current, `${ad}-${AYLAR[secilenAy.m]}-${secilenAy.y}-${ek}`.replace(/\s+/g, '-')); }
    catch (e) { console.error(e); window.alert('PDF hazırlanamadı. Tekrar dene.'); }
    setBekle(false);
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
          {secili.length > 0 && <KarOzetKutusu o={o} />}
        </section>
        <Sekmeler secenekler={[['urun', `Ürünler (${urunler.length})`], ['fis', `Fişler (${secili.length})`]]} secili={sekme} onSec={setSekme} />
        {!yuklendi && <Yukleniyor />}
        {yuklendi && secili.length === 0 && <Bos>Bu ay bu şubeye fiş kesilmemiş.</Bos>}
        {sekme === 'urun' && urunler.length > 0 && (
          <section className="kart sikisik">
            <p className="soluk kucuk-yazi">Ay içindeki bütün fişlerin toplamı: her ürün tek satırda, gruplara ayrılmış.</p>
            {gruplar.map((g) => (
              <div key={g.grup}>
                <div className="grup-baslik">
                  <b>{g.grup}</b>
                  <span className="yigin sag"><b className="nowrap">{TL(g.tutar)}</b>{!g.karEksik && o.hesaplandi && <KarYazisi kar={g.kar} />}</span>
                </div>
                {g.urunler.map((u) => (
                  <div key={u.ad} className="liste-satir">
                    <span className="yigin"><b>{u.ad}</b><small>{miktar(u.adet)} {u.birim}{u.bedelsizAdet ? `, ${miktar(u.bedelsizAdet)} bedelsiz` : ''}</small></span>
                    <span className="yigin sag">
                      {u.bedelsizAdet === u.adet ? <b className="nowrap metin-yesil">Bedelsiz</b> : <b className="nowrap">{TL(u.tutar)}</b>}
                      {o.hesaplandi && <KarYazisi kar={u.kar} />}
                    </span>
                  </div>
                ))}
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
        <button type="button" className="dugme cizgili" onClick={() => { kutuphaneleriHazirla(); setPdfSecim(true); }} disabled={!secili.length || bekle}><Ikon ad="doc" boyut={20} />{bekle ? '…' : 'PDF'}</button>
        {sube && !sube.silinmis && sube.aktif !== false
          ? <a className="dugme siyah genis" href={`#/fis/yeni?sube=${id}`}><Ikon ad="plus" boyut={20} kalinlik={2.2} />Fiş kes</a>
          : <span className="soluk genis">Bu şube pasif.</span>}
      </div>
      <div className="gizli-belge" aria-hidden="true">
        <RaporBelgesi ref={belgeRef} baslik={`${ad}, ${AYLAR[secilenAy.m]} ${secilenAy.y}`} fisler={secili} urunMap={urunMap} tekSube />
        <SubeDokumu ref={dokumRef} subeAd={ad} donem={`${AYLAR[secilenAy.m]} ${secilenAy.y}`} fisler={secili} urunMap={urunMap} />
      </div>
      <Panel acik={pdfSecim} baslik={`${AYLAR[secilenAy.m]} ${secilenAy.y} PDF`} onKapat={() => setPdfSecim(false)}>
        <button type="button" className="secim-karti" onClick={() => pdf(true)}>
          <Ikon ad="share" boyut={24} />
          <span className="yigin"><b>Şubeye gönder</b><small>Giden ürünler, tutarlar ve fiş listesi. Maliyet ve kâr yok.</small></span>
        </button>
        <button type="button" className="secim-karti" onClick={() => pdf(false)}>
          <Ikon ad="chart" boyut={24} />
          <span className="yigin"><b>Benim için</b><small>Aynı liste, maliyet ve kâr sütunlarıyla. Şubeye gönderme.</small></span>
        </button>
      </Panel>
    </div>
  );
}
