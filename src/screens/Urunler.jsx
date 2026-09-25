import { useMemo, useState } from 'react';
import { KarYazisi } from '../KarOzeti';
import { maliyetKaydet, urunKaydet, urunSil } from '../data';
import { GRUPLAR } from '../seed';
import { AltMenu, Baslik, Bos, Cipler, Ikon, Panel, Yukleniyor } from '../ui';
import { BIRIMLER, KDV_ORANLARI, TL, girisMiktar, maliyetVar, norm, para, sayiAl, tarihYaz, yuzde } from '../utils';

const EKSIK = '__maliyet_eksik__';

export default function Urunler({ urunler, subeler, parametre }) {
  const [q, setQ] = useState('');
  const [grup, setGrup] = useState(parametre?.maliyet === 'eksik' ? EKSIK : 'Tümü');
  const [hizli, setHizli] = useState(parametre?.maliyet === 'eksik');
  const [duzen, setDuzen] = useState(null);
  const [hata, setHata] = useState('');

  const gruplar = useMemo(() => {
    const ekstra = [...new Set(urunler.list.map((u) => u.grup))].filter((g) => g && !GRUPLAR.includes(g));
    return [...GRUPLAR, ...ekstra].filter((g) => urunler.list.some((u) => u.grup === g));
  }, [urunler.list]);
  const n = norm(q.trim());
  const eksikSayisi = urunler.list.filter((u) => !maliyetVar(u)).length;
  const grupUygun = (u) => grup === 'Tümü' || (grup === EKSIK ? !maliyetVar(u) : u.grup === grup);
  const liste = urunler.list.filter((u) => grupUygun(u) && (!n || norm(u.ad).includes(n)));
  const birimKar = (u) => (maliyetVar(u) ? sayiAl(u.fiyat) - sayiAl(u.maliyet) : null);

  const ac = (u) => {
    setHata('');
    // şube fiyatları: kayıtlı olanlar dolu, diğerleri boş (= standart fiyat)
    const subeFiyat = Object.fromEntries(subeler.list.map((s) => [s.id, '']));
    for (const [k, v] of Object.entries(u?.subeFiyat || {})) subeFiyat[k] = para(v);
    setDuzen(u
      ? { eski: u, veri: { ad: u.ad, grup: u.grup, birim: u.birim, kdv: u.kdv, fiyat: para(u.fiyat), maliyet: maliyetVar(u) ? para(u.maliyet) : '', adim: girisMiktar(u.adim || 1), subeFiyat } }
      : { eski: null, veri: { ad: q.trim(), grup: grup === 'Tümü' || grup === EKSIK ? GRUPLAR[0] : grup, birim: 'adet', kdv: 1, fiyat: '', maliyet: '', adim: '1', subeFiyat } });
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
  // düzenleme panelinde canlı kâr hesabı
  const dMaliyet = duzen && String(duzen.veri.maliyet ?? '').trim() !== '' ? sayiAl(duzen.veri.maliyet) : null;
  const karMetni = (fiyat) => {
    if (dMaliyet === null || String(fiyat ?? '').trim() === '') return '';
    const f = sayiAl(fiyat), k = f - dMaliyet;
    return `Kâr ${para(k)} ₺${f > 0 ? ` (${yuzde(k / f)})` : ''}`;
  };

  return (
    <div className="ekran menulu">
      <Baslik ust="Fiyatları sen belirlersin" baslik="Ürünler"
        sag={<button type="button" className="dugme turuncu kucuk" onClick={() => ac(null)}><Ikon ad="plus" boyut={20} kalinlik={2.2} />Yeni ürün</button>} />
      <main className="icerik">
        <div className="arama">
          <Ikon ad="search" boyut={20} />
          <input type="search" aria-label="Ürün ara" placeholder="Ürün ara" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {gruplar.length > 0 && (
          <Cipler kucuk secili={grup} onSec={setGrup}
            secenekler={['Tümü', ...(eksikSayisi ? [[EKSIK, `Maliyeti eksik (${eksikSayisi})`]] : []), ...gruplar]} />
        )}
        {!urunler.yuklendi && <Yukleniyor />}
        {urunler.yuklendi && urunler.list.length > 0 && (
          <div className="satir-arasi">
            <p className="soluk">{liste.length} ürün, tutarlar KDV hariç</p>
            <button type="button" className={`dugme kucuk ${hizli ? 'siyah' : 'cizgili'}`} onClick={() => setHizli(!hizli)}>
              {hizli ? <><Ikon ad="check" boyut={18} kalinlik={2.2} />Bitti</> : 'Maliyet gir'}
            </button>
          </div>
        )}
        {hizli && <p className="soluk kucuk-yazi">Her ürünün birim maliyetini (KDV hariç) yaz; kutudan çıkınca kaydedilir. Enter ile sonraki ürüne geçersin.</p>}
        {urunler.yuklendi && liste.length === 0 && (
          <Bos>{urunler.list.length ? 'Bu aramaya uyan ürün yok.' : 'Henüz ürün yok.'} <button type="button" className="metin-dugme" onClick={() => ac(null)}>Yeni ürün ekle</button></Bos>
        )}
        {liste.length > 0 && (
          <section className="kart liste-kart">
            {liste.map((u) => (hizli ? (
              <div key={u.id} className="urun-satir hizli">
                <span className="yigin"><b>{u.ad}</b><small>{TL(u.fiyat)} / {u.birim}{birimKar(u) !== null ? `, kâr ${TL(birimKar(u))}` : ''}</small></span>
                <MaliyetKutusu urun={u} />
              </div>
            ) : (
              <button key={u.id} type="button" className="urun-satir" onClick={() => ac(u)}>
                <span className="yigin"><b>{u.ad}</b><small>{u.grup}, {u.birim}, KDV %{u.kdv}{ozelSayisi(u) ? `, ${ozelSayisi(u)} şubeye özel fiyat` : ''}</small></span>
                <span className="yigin sag"><b className="nowrap">{TL(u.fiyat)}</b><KarYazisi kar={birimKar(u)} /></span>
                <Ikon ad="pen" boyut={18} />
              </button>
            )))}
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
              <label className="alan"><span className="etiket">Maliyet (₺, KDV hariç)</span>
                <input className="giris-kutu" inputMode="decimal" placeholder="Girilmedi" value={duzen.veri.maliyet} onChange={alan('maliyet')} /></label>
              <label className="alan"><span className="etiket">+ / − adımı</span>
                <input className="giris-kutu" inputMode="decimal" value={duzen.veri.adim} onChange={alan('adim')} /></label>
            </div>
            {karMetni(duzen.veri.fiyat) && <p className={`kucuk-yazi ${sayiAl(duzen.veri.fiyat) - dMaliyet < 0 ? 'kar-eksi' : 'kar-arti'}`}><b>Birim {karMetni(duzen.veri.fiyat).toLocaleLowerCase('tr-TR')}</b></p>}
            {subeler.list.length > 0 && (
              <div className="sube-fiyatlari">
                <span className="etiket">Şubeye özel fiyat</span>
                <small>Boş bırakırsan o şubeye standart fiyat gider. 0 yazarsan her zaman bedelsiz gider.</small>
                {subeler.list.map((s) => (
                  <label key={s.id} className="alan">
                    <span className="yigin etiket-yigin"><span className="etiket">{s.ad}</span>
                      {karMetni(duzen.veri.subeFiyat?.[s.id]) && sayiAl(duzen.veri.subeFiyat?.[s.id]) > 0 && <small>{karMetni(duzen.veri.subeFiyat?.[s.id])}</small>}</span>
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

// Hızlı maliyet girişi kutusu: yazıp çıkınca (veya Enter) kaydeder, Enter bir sonraki ürüne geçer.
function MaliyetKutusu({ urun }) {
  const kayitli = maliyetVar(urun) ? para(urun.maliyet) : '';
  const [deger, setDeger] = useState(kayitli);
  const [odak, setOdak] = useState(false);
  const gorunen = odak ? deger : kayitli;
  function kaydet() {
    setOdak(false);
    const bos = String(deger).trim() === '';
    const yeni = bos ? null : sayiAl(deger);
    const eski = maliyetVar(urun) ? sayiAl(urun.maliyet) : null;
    if (yeni !== eski) maliyetKaydet(urun.id, yeni).catch(() => {});
  }
  function tus(e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const hepsi = [...document.querySelectorAll('.hizli-maliyet')];
    const sonraki = hepsi[hepsi.indexOf(e.currentTarget) + 1];
    if (sonraki) sonraki.focus(); else e.currentTarget.blur();
  }
  return (
    <input className="giris-kutu hizli-maliyet" inputMode="decimal" placeholder="Maliyet" aria-label={`${urun.ad} maliyeti`}
      value={gorunen} onFocus={() => { setDeger(kayitli); setOdak(true); }} onChange={(e) => setDeger(e.target.value)} onBlur={kaydet} onKeyDown={tus} />
  );
}
