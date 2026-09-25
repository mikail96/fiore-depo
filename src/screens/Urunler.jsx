import { useMemo, useState } from 'react';
import { urunKaydet, urunSil } from '../data';
import { GRUPLAR } from '../seed';
import { AltMenu, Baslik, Bos, Cipler, Ikon, Panel, Yukleniyor } from '../ui';
import { BIRIMLER, KDV_ORANLARI, TL, girisMiktar, norm, para, sayiAl, tarihYaz } from '../utils';

export default function Urunler({ urunler, subeler }) {
  const [q, setQ] = useState('');
  const [grup, setGrup] = useState('Tümü');
  const [duzen, setDuzen] = useState(null);
  const [hata, setHata] = useState('');

  const gruplar = useMemo(() => {
    const ekstra = [...new Set(urunler.list.map((u) => u.grup))].filter((g) => g && !GRUPLAR.includes(g));
    return [...GRUPLAR, ...ekstra].filter((g) => urunler.list.some((u) => u.grup === g));
  }, [urunler.list]);
  const n = norm(q.trim());
  const liste = urunler.list.filter((u) => (grup === 'Tümü' || u.grup === grup) && (!n || norm(u.ad).includes(n)));

  const ac = (u) => {
    setHata('');
    // şube fiyatları: kayıtlı olanlar dolu, diğerleri boş (= standart fiyat)
    const subeFiyat = Object.fromEntries(subeler.list.map((s) => [s.id, '']));
    for (const [k, v] of Object.entries(u?.subeFiyat || {})) subeFiyat[k] = para(v);
    setDuzen(u
      ? { eski: u, veri: { ad: u.ad, grup: u.grup, birim: u.birim, kdv: u.kdv, fiyat: para(u.fiyat), adim: girisMiktar(u.adim || 1), subeFiyat } }
      : { eski: null, veri: { ad: q.trim(), grup: grup === 'Tümü' ? GRUPLAR[0] : grup, birim: 'adet', kdv: 1, fiyat: '', adim: '1', subeFiyat } });
  };
  const subeFiyatDegis = (id) => (e) => setDuzen((d) => ({ ...d, veri: { ...d.veri, subeFiyat: { ...d.veri.subeFiyat, [id]: e.target.value } } }));
  const ozelSayisi = (u) => Object.keys(u.subeFiyat || {}).filter((k) => subeler.list.some((s) => s.id === k)).length;
  const alan = (k) => (e) => setDuzen((d) => ({ ...d, veri: { ...d.veri, [k]: e.target.value } }));

  function kaydet() {
    const v = duzen.veri;
    if (!v.ad.trim()) { setHata('Ürün adını yaz.'); return; }
    if (!(sayiAl(v.fiyat) >= 0) || String(v.fiyat).trim() === '') { setHata('Fiyatı yaz.'); return; }
    if (urunler.list.some((u) => u.id !== duzen.eski?.id && norm(u.ad) === norm(v.ad.trim()))) { setHata('Bu isimde bir ürün zaten var.'); return; }
    urunKaydet(duzen.eski, v).catch(() => {});
    setDuzen(null);
  }
  function sil() {
    if (!window.confirm(`${duzen.eski.ad} silinsin mi? Eski fişlerde görünmeye devam eder.`)) return;
    urunSil(duzen.eski.id).catch(() => {});
    setDuzen(null);
  }
  const gecmis = (duzen?.eski?.fiyatGecmisi || []).slice().reverse();

  return (
    <div className="ekran menulu">
      <Baslik ust="Fiyatları sen belirlersin" baslik="Ürünler"
        sag={<button type="button" className="dugme turuncu kucuk" onClick={() => ac(null)}><Ikon ad="plus" boyut={20} kalinlik={2.2} />Yeni ürün</button>} />
      <main className="icerik">
        <div className="arama">
          <Ikon ad="search" boyut={20} />
          <input type="search" aria-label="Ürün ara" placeholder="Ürün ara" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {gruplar.length > 0 && <Cipler kucuk secenekler={['Tümü', ...gruplar]} secili={grup} onSec={setGrup} />}
        {!urunler.yuklendi && <Yukleniyor />}
        {urunler.yuklendi && urunler.list.length > 0 && <p className="soluk">{liste.length} ürün, fiyatlar KDV hariç</p>}
        {urunler.yuklendi && liste.length === 0 && (
          <Bos>{urunler.list.length ? 'Bu aramaya uyan ürün yok.' : 'Henüz ürün yok.'} <button type="button" className="metin-dugme" onClick={() => ac(null)}>Yeni ürün ekle</button></Bos>
        )}
        {liste.length > 0 && (
          <section className="kart liste-kart">
            {liste.map((u) => (
              <button key={u.id} type="button" className="urun-satir" onClick={() => ac(u)}>
                <span className="yigin"><b>{u.ad}</b><small>{u.grup}, {u.birim}, KDV %{u.kdv}{ozelSayisi(u) ? `, ${ozelSayisi(u)} şubeye özel fiyat` : ''}</small></span>
                <b className="nowrap">{TL(u.fiyat)}</b>
                <Ikon ad="pen" boyut={18} />
              </button>
            ))}
          </section>
        )}
      </main>
      <AltMenu aktif="#/urunler" />
      <Panel acik={!!duzen} baslik={duzen?.eski ? 'Ürünü düzenle' : 'Yeni ürün'} onKapat={() => setDuzen(null)}>
        {duzen && (
          <>
            <label className="alan"><span className="etiket">Ürün adı</span><input className="giris-kutu" value={duzen.veri.ad} onChange={alan('ad')} /></label>
            <div className="ikili">
              <label className="alan"><span className="etiket">Grup</span>
                <select className="giris-kutu" value={duzen.veri.grup} onChange={alan('grup')}>
                  {[...new Set([...GRUPLAR, ...gruplar, duzen.veri.grup])].map((g) => <option key={g}>{g}</option>)}
                </select></label>
              <label className="alan"><span className="etiket">Birim</span>
                <select className="giris-kutu" value={duzen.veri.birim} onChange={alan('birim')}>
                  {[...new Set([...BIRIMLER, duzen.veri.birim])].map((b) => <option key={b}>{b}</option>)}
                </select></label>
              <label className="alan"><span className="etiket">KDV</span>
                <select className="giris-kutu" value={duzen.veri.kdv} onChange={alan('kdv')}>
                  {KDV_ORANLARI.map((k) => <option key={k} value={k}>%{k}</option>)}
                </select></label>
              <label className="alan"><span className="etiket">Birim fiyat (₺, KDV hariç)</span>
                <input className="giris-kutu kalin" inputMode="decimal" value={duzen.veri.fiyat} onChange={alan('fiyat')} /></label>
              <label className="alan"><span className="etiket">+ / − adımı</span>
                <input className="giris-kutu" inputMode="decimal" value={duzen.veri.adim} onChange={alan('adim')} /></label>
            </div>
            {subeler.list.length > 0 && (
              <div className="sube-fiyatlari">
                <span className="etiket">Şubeye özel fiyat</span>
                <small>Boş bırakırsan o şubeye standart fiyat gider. 0 yazarsan her zaman bedelsiz gider.</small>
                {subeler.list.map((s) => (
                  <label key={s.id} className="alan">
                    <span className="etiket">{s.ad}</span>
                    <input className="giris-kutu" inputMode="decimal" placeholder={duzen.veri.fiyat || 'Standart'}
                      value={duzen.veri.subeFiyat?.[s.id] ?? ''} onChange={subeFiyatDegis(s.id)} />
                  </label>
                ))}
              </div>
            )}
            {gecmis.length > 0 && (
              <div className="gecmis">
                <span className="etiket">Fiyat geçmişi</span>
                {gecmis.map((g, i) => <span key={i}>{tarihYaz(g.tarih?.toDate ? g.tarih.toDate() : null)}: {para(g.eski)} → {para(g.yeni)} ₺</span>)}
              </div>
            )}
            <p className="soluk kucuk-yazi">Yeni fiyat bundan sonraki fişlere geçer; kesilmiş fişler eski fiyatıyla kalır.</p>
            {hata && <p className="hata" role="alert">{hata}</p>}
            <div className="dugme-satiri">
              {duzen.eski && <button type="button" className="dugme cizgili kirmizi" onClick={sil}>Sil</button>}
              <button type="button" className="dugme cizgili" onClick={() => setDuzen(null)}>Vazgeç</button>
              <button type="button" className="dugme siyah genis" onClick={kaydet}>Kaydet</button>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
