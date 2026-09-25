import { forwardRef, useEffect, useRef, useState } from 'react';
import { fisSil, useFis } from '../data';
import { dosyaPaylas, gorselDosya, kutuphaneleriHazirla, pdfIndir } from '../share';
import { AltBaslik, Bos, Ikon, Sekmeler, Yukleniyor } from '../ui';
import { TL, hesapla, miktar, para, tarihYaz } from '../utils';

const FIYAT_TERCIH = 'fiore-fiyatli';
const dosyaAdiYap = (fis) => `${fis.no || 'sevk-fisi'}-${fis.subeAd}`.replace(/\s+/g, '-');

export const FisBelgesi = forwardRef(function FisBelgesi({ fis, fiyatli }, ref) {
  const t = hesapla(fis.satirlar);
  return (
    <article className="belge" ref={ref}>
      <div className="belge-ust">
        <div className="belge-marka">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" width="46" height="46" />
          <span className="yigin"><b>Caffe Di Fiore</b><small>Ana depo sevk fişi</small></span>
        </div>
        <span className="yigin sag"><b>{fis.no || 'Numara bekleniyor'}</b><small>{tarihYaz(fis.tarih)}</small></span>
      </div>
      <div className="belge-taraf">
        <span className="yigin"><small>Gönderen</small><b>Fiore ana depo</b></span>
        <span className="yigin"><small>Alan şube</small><b>{fis.subeAd}</b></span>
      </div>
      <table className={`belge-tablo${fiyatli ? '' : ' fiyatsiz'}`}>
        <thead>
          <tr><th>Ürün</th><th>Adet</th>{fiyatli ? <><th>Fiyat</th><th>Tutar</th></> : <th>Birim</th>}</tr>
        </thead>
        <tbody>
          {fis.satirlar.map((s, i) => (
            <tr key={i}>
              <td>{s.ad}</td><td>{miktar(s.adet)}</td>
              {fiyatli
                ? (s.bedelsiz ? <><td>—</td><td className="bedelsiz">Bedelsiz</td></> : <><td>{para(s.fiyat)}</td><td><b>{para(s.fiyat * s.adet)}</b></td></>)
                : <td>{s.birim}</td>}
            </tr>
          ))}
        </tbody>
      </table>
      {fiyatli ? (
        <div className="belge-toplam">
          <div><span>Ara toplam (KDV hariç)</span><b>{TL(t.ara)}</b></div>
          {t.kdvler.map((k) => <div key={k.oran} className="soluk"><span>KDV %{k.oran}</span><span>{TL(k.tutar)}</span></div>)}
          <div className="soluk"><span>KDV dahil</span><span>{TL(t.dahil)}</span></div>
          {t.bedelsizDeger > 0 && <div className="soluk"><span>Bedelsiz ({fis.satirlar.filter((s) => s.bedelsiz).length} kalem)</span><span>{TL(t.bedelsizDeger)} değerinde</span></div>}
          <div className="belge-genel"><span>Fiş toplamı</span><b>{fis.kdvDahil ? `${TL(t.dahil)} (KDV dahil)` : `${TL(t.ara)} + KDV`}</b></div>
        </div>
      ) : (
        <p className="belge-kalem">Toplam {fis.satirlar.length} kalem</p>
      )}
      {fis.not && <p className="belge-not"><small>Not</small>{fis.not}</p>}
      <div className="belge-imza"><span>Teslim eden</span><span>Teslim alan</span></div>
    </article>
  );
});

export default function FisGonder({ id, parametre }) {
  const { fis, yuklendi } = useFis(id);
  const [fiyatli, setFiyatli] = useState(() => localStorage.getItem(FIYAT_TERCIH) !== '0');
  const [bekle, setBekle] = useState('');
  const [mesaj, setMesaj] = useState(parametre.yeni ? 'Fiş kaydedildi.' : parametre.guncellendi ? 'Değişiklikler kaydedildi.' : '');
  const [hata, setHata] = useState('');
  useEffect(() => { kutuphaneleriHazirla(); }, []);
  const belgeRef = useRef(null);
  const hazir = useRef(null);
  const imza = fis ? `${fis.id}|${fiyatli}|${fis.guncelleme?.seconds || ''}|${fis.no}|${JSON.stringify(fis.satirlar)}|${fis.not}|${fis.kdvDahil}` : '';

  // Görseli arka planda önceden hazırla, paylaş'a basınca menü hemen açılsın
  useEffect(() => {
    if (!fis) return undefined;
    hazir.current = null;
    let iptal = false;
    const zaman = setTimeout(async () => {
      try {
        const dosya = await gorselDosya(belgeRef.current, dosyaAdiYap(fis));
        if (!iptal) hazir.current = { imza, dosya };
      } catch { /* dokununca yeniden denenir */ }
    }, 400);
    return () => { iptal = true; clearTimeout(zaman); };
  }, [imza]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!yuklendi) return <div className="ekran"><Yukleniyor /></div>;
  if (!fis) return <div className="ekran"><AltBaslik geri="#/fisler" geriEtiket="Fişler" baslik="Fiş bulunamadı" /><Bos>Bu fiş silinmiş olabilir.</Bos></div>;

  const dosyaAdi = dosyaAdiYap(fis);
  const fiyatSec = (v) => { setFiyatli(v); localStorage.setItem(FIYAT_TERCIH, v ? '1' : '0'); };

  async function paylas() {
    setMesaj(''); setHata('');
    try {
      let dosya = hazir.current?.imza === imza ? hazir.current.dosya : null;
      if (!dosya) {
        setBekle('gorsel');
        dosya = await gorselDosya(belgeRef.current, dosyaAdi);
        hazir.current = { imza, dosya };
      }
      const r = await dosyaPaylas(dosya);
      if (r === 'indirildi') setMesaj('Bu cihaz paylaş menüsünü desteklemiyor, görsel indirildi.');
      if (r === 'tekrar') setMesaj('Görsel hazır, paylaşmak için butona tekrar bas.');
    } catch (e) { console.error(e); setHata('Görsel hazırlanamadı. Tekrar dene.'); }
    setBekle('');
  }
  async function pdf() {
    setBekle('pdf'); setMesaj(''); setHata('');
    try { await pdfIndir(belgeRef.current, dosyaAdi); } catch (e) { console.error(e); setHata('PDF hazırlanamadı. Tekrar dene.'); }
    setBekle('');
  }
  function sil() {
    if (!window.confirm(`${fis.no} silinsin mi? Bu işlem geri alınamaz.`)) return;
    fisSil(fis.id).catch(() => {});
    window.location.hash = '#/fisler';
  }

  return (
    <div className="ekran cubuklu">
      <AltBaslik geri="#/fisler" geriEtiket="Fişler" baslik="Fişi gönder" alt={`${fis.no || ''}, ${fis.subeAd}`} />
      <main className="icerik">
        {mesaj && <div className="bilgi basari"><Ikon ad="check" /><span>{mesaj}</span></div>}
        {hata && <div className="bilgi hata-kutu" role="alert"><Ikon ad="x" /><span>{hata}</span></div>}
        <Sekmeler secenekler={[[true, 'Fiyatlı'], [false, 'Fiyatsız']]} secili={fiyatli} onSec={fiyatSec} />
        <p className="soluk">{fiyatli ? 'Şube ürünleri birim fiyat, tutar ve KDV ile görür.' : 'Şube sadece ürünleri ve adetleri görür, fiyat yazmaz.'} Aşağıdaki fiş olduğu gibi resim ya da PDF olarak gider.</p>
        <div className="belge-cerceve"><FisBelgesi ref={belgeRef} fis={fis} fiyatli={fiyatli} /></div>
        <div className="ikincil-dugmeler">
          <a className="dugme cizgili" href={`#/fis/${fis.id}/duzenle`}><Ikon ad="pen" boyut={18} />Düzenle</a>
          <button type="button" className="dugme cizgili kirmizi" onClick={sil}><Ikon ad="trash" boyut={18} />Sil</button>
        </div>
      </main>
      <div className="alt-cubuk">
        <button type="button" className="dugme cizgili" onClick={pdf} disabled={!!bekle}><Ikon ad="dl" boyut={20} />{bekle === 'pdf' ? 'Hazırlanıyor…' : 'PDF indir'}</button>
        <button type="button" className="dugme siyah genis" onClick={paylas} disabled={!!bekle}><Ikon ad="share" boyut={20} />{bekle === 'gorsel' ? 'Hazırlanıyor…' : 'Görsel olarak paylaş'}</button>
      </div>
    </div>
  );
}
