import { useEffect, useMemo, useRef, useState } from 'react';
import { fisKaydet, useFis } from '../data';
import { Adet, AltBaslik, Bos, Cipler, Ikon, Yukleniyor } from '../ui';
import { TL, fiyatBul, girisMiktar, hesapla, inputTarih, inputtanTarih, norm, sayiAl, tarihUzun } from '../utils';

const TASLAK = 'fiore-taslak';
let anahtar = 0;
const yeniAnahtar = () => `s${++anahtar}`;

function bosDurum(subeId) {
  return { subeId: subeId || '', tarih: inputTarih(new Date()), satirlar: [], kdvDahil: false, not: '' };
}

export default function FisEditor({ id, subeler, urunler, parametre }) {
  const duzenleme = !!id;
  const { fis, yuklendi } = useFis(id);
  const [d, setD] = useState(null);
  const [taslakGeldi, setTaslakGeldi] = useState(false);
  const [q, setQ] = useState('');
  const [hata, setHata] = useState('');
  const [bekle, setBekle] = useState(false);
  const aramaRef = useRef(null);

  // başlangıç durumu
  useEffect(() => {
    if (d) return;
    if (duzenleme) {
      if (!yuklendi || !fis) return;
      setD({
        subeId: fis.subeId, tarih: inputTarih(fis.tarih), kdvDahil: !!fis.kdvDahil, not: fis.not || '',
        satirlar: fis.satirlar.map((s) => ({ ...s, key: yeniAnahtar(), adim: urunler.list.find((u) => u.id === s.urunId)?.adim || 1, adet: girisMiktar(s.adet) }))
      });
      return;
    }
    try {
      const t = JSON.parse(localStorage.getItem(TASLAK) || 'null');
      if (t && t.satirlar?.length) {
        setD({ ...t, satirlar: t.satirlar.map((s) => ({ ...s, key: yeniAnahtar() })), subeId: parametre.sube || t.subeId });
        setTaslakGeldi(true);
        return;
      }
    } catch { /* bozuk taslak */ }
    setD(bosDurum(parametre.sube));
  }, [d, duzenleme, yuklendi, fis, urunler.list, parametre.sube]);

  // yeni fişte taslağı telefonda sakla
  useEffect(() => {
    if (!d || duzenleme) return;
    if (d.satirlar.length) localStorage.setItem(TASLAK, JSON.stringify(d));
  }, [d, duzenleme]);

  const sonuclar = useMemo(() => {
    const n = norm(q.trim());
    if (!n) return [];
    return urunler.list
      .filter((u) => norm(u.ad).includes(n))
      .sort((a, b) => (norm(b.ad).startsWith(n) ? 1 : 0) - (norm(a.ad).startsWith(n) ? 1 : 0))
      .slice(0, 8);
  }, [q, urunler.list]);

  if (duzenleme && yuklendi && !fis) return <div className="ekran"><AltBaslik geri="#/fisler" geriEtiket="Fişler" baslik="Fiş bulunamadı" /><Bos>Bu fiş silinmiş olabilir.</Bos></div>;
  if (!d) return <div className="ekran"><Yukleniyor /></div>;

  const guncelle = (p) => setD((x) => ({ ...x, ...p }));
  // Şube değişince satırların fiyatı o şubenin fiyatına göre yeniden gelir.
  const subeSec = (subeId) => setD((x) => ({
    ...x, subeId,
    satirlar: x.satirlar.map((s) => {
      const u = urunler.list.find((k) => k.id === s.urunId);
      if (!u) return s;
      const f = fiyatBul(u, subeId);
      return { ...s, fiyat: f.fiyat, subeFiyati: f.subeFiyati, bedelsiz: f.bedelsiz || !!s.bedelsizElle };
    })
  }));
  const bedelsizDegis = (key) => setD((x) => ({
    ...x, satirlar: x.satirlar.map((s) => (s.key === key ? { ...s, bedelsiz: !s.bedelsiz, bedelsizElle: !s.bedelsiz } : s))
  }));
  const satirGuncelle = (key, adet, sil) => setD((x) => ({
    ...x, satirlar: sil ? x.satirlar.filter((s) => s.key !== key) : x.satirlar.map((s) => (s.key === key ? { ...s, adet } : s))
  }));
  function ekle(u) {
    setD((x) => {
      const var_ = x.satirlar.find((s) => s.urunId === u.id);
      if (var_) return { ...x, satirlar: x.satirlar.map((s) => (s === var_ ? { ...s, adet: girisMiktar(sayiAl(s.adet) + (u.adim || 1)) } : s)) };
      return { ...x, satirlar: [{ key: yeniAnahtar(), urunId: u.id, ad: u.ad, birim: u.birim, kdv: u.kdv, adim: u.adim || 1, adet: girisMiktar(u.adim || 1), ...fiyatBul(u, x.subeId) }, ...x.satirlar] };
    });
    setQ('');
    aramaRef.current?.focus();
  }

  const subeSecenek = subeler.list.filter((s) => s.aktif !== false || s.id === d.subeId);
  if (duzenleme && fis && !subeSecenek.some((s) => s.id === fis.subeId)) subeSecenek.push({ id: fis.subeId, ad: fis.subeAd });
  const sube = subeSecenek.find((s) => s.id === d.subeId);
  const t = hesapla(d.satirlar);
  const fisToplam = d.kdvDahil ? t.dahil : t.ara;
  const etiket = d.kdvDahil ? 'KDV dahil' : '+ KDV';

  async function kaydet() {
    setHata('');
    if (!sube) { setHata('Önce şubeyi seç.'); return; }
    if (!d.satirlar.some((s) => sayiAl(s.adet) > 0)) { setHata('Fişe en az bir ürün ekle.'); return; }
    setBekle(true);
    try {
      const yeniId = await fisKaydet(id, { tarih: inputtanTarih(d.tarih), sube: { id: sube.id, ad: sube.ad }, satirlar: d.satirlar.map((s) => ({
        ...s, maliyet: s.maliyet ?? urunler.list.find((u) => u.id === s.urunId)?.maliyet ?? null
      })), kdvDahil: d.kdvDahil, not: d.not });
      if (!duzenleme) localStorage.removeItem(TASLAK);
      window.location.hash = `#/fis/${yeniId}?${duzenleme ? 'guncellendi' : 'yeni'}=1`;
    } catch {
      setHata('Kaydedilemedi. Tekrar dene.'); setBekle(false);
    }
  }
  function taslakSil() {
    localStorage.removeItem(TASLAK); setD(bosDurum(parametre.sube)); setTaslakGeldi(false);
  }
  const geri = duzenleme ? `#/fis/${id}` : '#/';
  const geriTikla = (e) => {
    if (duzenleme && !window.confirm('Değişiklikler kaydedilmeden çıkılsın mı?')) e.preventDefault();
  };

  return (
    <div className="ekran cubuklu">
      <AltBaslik geri={geri} geriEtiket={duzenleme ? 'Fiş' : 'Panel'} onGeri={geriTikla}
        baslik={duzenleme ? 'Fişi düzenle' : 'Yeni sevk fişi'} alt={duzenleme ? fis.no : 'Ana depodan şubeye'} />
      <main className="icerik">
        {taslakGeldi && (
          <div className="bilgi">
            <span>Kaydedilmemiş fişin geri yüklendi.</span>
            <button type="button" className="metin-dugme" onClick={taslakSil}>Temizle</button>
          </div>
        )}
        <div className="alan">
          <span className="etiket">Hangi şubeye?</span>
          {subeSecenek.length ? <Cipler secenekler={subeSecenek.map((s) => [s.id, s.ad])} secili={d.subeId} onSec={subeSec} />
            : <p className="soluk">Önce <a href="#/subeler">Şubeler</a> ekranından şube ekle.</p>}
        </div>
        <label className="alan">
          <span className="etiket">Tarih</span>
          <input className="giris-kutu" type="date" value={d.tarih} onChange={(e) => e.target.value && guncelle({ tarih: e.target.value })} />
        </label>

        <div className="fis-kagit">
          <section>
            <div className="fis-ust">
              <span className="yigin"><b className="fis-baslik">Sevk fişi</b><small>{duzenleme ? fis.no : 'Kaydedince numara alır'}</small></span>
              <span className="yigin sag"><b>{sube ? sube.ad : 'Şube seçilmedi'}</b><small>{tarihUzun(inputtanTarih(d.tarih))}</small></span>
            </div>
            <div className="ekle-alani">
              <label className="etiket" htmlFor="urun-ekle">Ürün ekle</label>
              <div className="arama">
                <Ikon ad="search" boyut={20} />
                <input id="urun-ekle" ref={aramaRef} type="search" autoComplete="off" placeholder="Ürün adını yaz"
                  value={q} onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && sonuclar[0]) { e.preventDefault(); ekle(sonuclar[0]); } }} />
              </div>
              {sonuclar.length > 0 && (
                <div className="sonuclar">
                  {sonuclar.map((u) => {
                    const var_ = d.satirlar.find((s) => s.urunId === u.id);
                    const f = fiyatBul(u, d.subeId);
                    return (
                      <button key={u.id} type="button" onClick={() => ekle(u)}>
                        <span className="yigin"><b>{u.ad}</b><small>{f.bedelsiz ? 'Bu şubeye bedelsiz' : `${TL(f.fiyat)} / ${u.birim}${f.subeFiyati ? ', şube fiyatı' : ''}`}</small></span>
                        <span className={var_ ? 'metin-yesil' : 'metin-turuncu'}>{var_ ? `Fişte: ${var_.adet}  +${girisMiktar(u.adim || 1)}` : '+ Ekle'}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {q.trim() && sonuclar.length === 0 && (
                <div className="bilgi dikey">
                  <span>“{q.trim()}” ürün listesinde yok.</span>
                  <a href="#/urunler">Ürünler’e git ve ekle</a>
                </div>
              )}
            </div>
            {d.satirlar.length === 0 && <p className="soluk bosluklu">Ürün adını yazıp listeden seç. Eklediğin ürünler burada görünür.</p>}
            {d.satirlar.map((s) => (
              <div key={s.key} className="fis-satir">
                <div className="fis-satir-ust"><b>{s.ad}</b>{s.bedelsiz ? <b className="nowrap metin-yesil">Bedelsiz</b> : <b className="nowrap">{TL(sayiAl(s.fiyat) * sayiAl(s.adet))}</b>}</div>
                <div className="fis-satir-alt">
                  <span className="yigin satir-bilgi">
                    <small className={s.bedelsiz ? 'ustu-cizili' : ''}>{TL(s.fiyat)} / {s.birim}, KDV %{s.kdv}</small>
                    <span className="satir-etiketler">
                      <button type="button" className={`bedelsiz-dugme${s.bedelsiz ? ' acik' : ''}`} aria-pressed={!!s.bedelsiz} onClick={() => bedelsizDegis(s.key)}>
                        {s.bedelsiz && <Ikon ad="check" boyut={14} kalinlik={2.4} />}Bedelsiz
                      </button>
                      {s.subeFiyati && !s.bedelsiz && <small className="sube-fiyat-etiket">Şube fiyatı</small>}
                    </span>
                  </span>
                  <Adet deger={s.adet} adim={s.adim} etiket={`${s.ad} adedi`} onChange={(v, sil) => satirGuncelle(s.key, v, sil)} />
                </div>
              </div>
            ))}
            <div className="toplamlar">
              <div className="toplam-satir"><span>Ara toplam (KDV hariç)</span><b>{TL(t.ara)} + KDV</b></div>
              {t.kdvler.map((k) => <div key={k.oran} className="toplam-satir soluk"><span>KDV %{k.oran}</span><span>{TL(k.tutar)}</span></div>)}
              <div className="toplam-satir"><span>KDV dahil</span><b>{TL(t.dahil)}</b></div>
              {t.bedelsizDeger > 0 && <div className="toplam-satir soluk"><span>Bedelsiz ({d.satirlar.filter((s) => s.bedelsiz).length} kalem)</span><span>{TL(t.bedelsizDeger)} değerinde</span></div>}
              <label className="kutucuk kutu">
                <input type="checkbox" checked={d.kdvDahil} onChange={(e) => guncelle({ kdvDahil: e.target.checked })} />
                <span>KDV’yi fiş toplamına dahil et</span>
              </label>
              <div className="genel-toplam"><span>Fiş toplamı</span><span><b>{TL(fisToplam)}</b><small>{etiket}</small></span></div>
            </div>
          </section>
          <div className="yirtik" />
        </div>

        <label className="alan">
          <span className="etiket">Fişe not</span>
          <textarea rows={2} placeholder="İsteğe bağlı, gönderilen fişte görünür" value={d.not} onChange={(e) => guncelle({ not: e.target.value })} />
        </label>
        {hata && <p className="hata" role="alert">{hata}</p>}
      </main>
      <div className="alt-cubuk">
        <span className="yigin"><small>Fiş toplamı, {etiket}</small><b className="nowrap">{TL(fisToplam)}</b></span>
        <button type="button" className="dugme siyah genis" onClick={kaydet} disabled={bekle}>{bekle ? 'Kaydediliyor…' : duzenleme ? 'Değişiklikleri kaydet' : 'Fişi kaydet'}</button>
      </div>
    </div>
  );
}
