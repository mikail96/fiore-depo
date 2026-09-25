import { useState } from 'react';
import { subeKaydet, subeSil, useFisler } from '../data';
import { AltMenu, Baslik, Bos, Ikon, Panel, Yukleniyor } from '../ui';
import { AYLAR, TL0, ayAraligi } from '../utils';

const BOS = { ad: '', yetkili: '', telefon: '', adres: '', aktif: true };

export default function Subeler({ ay, subeler }) {
  const [bas, son] = ayAraligi(ay.y, ay.m);
  const { list: fisler } = useFisler(bas, son);
  const [duzen, setDuzen] = useState(null); // {eski, veri}
  const [hata, setHata] = useState('');

  const ozet = new Map();
  for (const f of fisler) {
    const o = ozet.get(f.subeId) || { tutar: 0, adet: 0 };
    o.tutar += f.araToplam || 0; o.adet += 1; ozet.set(f.subeId, o);
  }
  const toplam = fisler.reduce((a, f) => a + (f.araToplam || 0), 0);
  const aktifSayi = subeler.list.filter((s) => s.aktif !== false).length;

  const ac = (s) => { setHata(''); setDuzen(s ? { eski: s, veri: { ...BOS, ...s } } : { eski: null, veri: { ...BOS } }); };
  const alan = (k) => (e) => setDuzen((d) => ({ ...d, veri: { ...d.veri, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value } }));

  function kaydet() {
    if (!duzen.veri.ad.trim()) { setHata('Şube adını yaz.'); return; }
    if (subeler.list.some((s) => s.id !== duzen.eski?.id && s.ad.trim().toLocaleLowerCase('tr-TR') === duzen.veri.ad.trim().toLocaleLowerCase('tr-TR'))) {
      setHata('Bu isimde bir şube zaten var.'); return;
    }
    subeKaydet(duzen.eski, duzen.veri).catch(() => {});
    setDuzen(null);
  }
  function sil() {
    if (!window.confirm(`${duzen.eski.ad} şubesi kaldırılsın mı? Geçmiş fişleri raporlarda kalır.`)) return;
    subeSil(duzen.eski.id).catch(() => {});
    setDuzen(null);
  }

  return (
    <div className="ekran menulu">
      <Baslik ust="Ana depo" baslik="Şubeler"
        sag={<button type="button" className="dugme turuncu kucuk" onClick={() => ac(null)}><Ikon ad="plus" boyut={20} kalinlik={2.2} />Yeni şube</button>} />
      <main className="icerik">
        {!subeler.yuklendi && <Yukleniyor />}
        {subeler.yuklendi && subeler.list.length === 0 && <Bos>Henüz şube yok. Sağ üstten ekleyebilirsin.</Bos>}
        {subeler.list.length > 0 && <p className="soluk">{subeler.list.length} şube, {aktifSayi} aktif. {AYLAR[ay.m]} toplamı {TL0(toplam)} + KDV</p>}
        {subeler.list.map((s) => {
          const o = ozet.get(s.id);
          return (
            <div key={s.id} className="kart sube-kart">
              <a href={`#/sube/${s.id}`}>
                <span className="yatay"><b className="buyukce">{s.ad}</b>{s.aktif === false && <span className="rozet">Pasif</span>}</span>
                <small>{o ? `${AYLAR[ay.m]}: ${o.adet} sevk fişi` : `${AYLAR[ay.m]}: henüz fiş yok`}</small>
                <span className="yatay taban"><b className="orta-buyuk">{TL0(o?.tutar || 0)}</b><b className="kdv-etiket kucuk">+ KDV</b></span>
              </a>
              <button type="button" aria-label={`${s.ad} şubesini düzenle`} onClick={() => ac(s)}><Ikon ad="pen" boyut={20} /></button>
            </div>
          );
        })}
      </main>
      <AltMenu aktif="#/subeler" />
      <Panel acik={!!duzen} baslik={duzen?.eski ? 'Şubeyi düzenle' : 'Yeni şube'} onKapat={() => setDuzen(null)}>
        {duzen && (
          <>
            <label className="alan"><span className="etiket">Şube adı</span><input className="giris-kutu" value={duzen.veri.ad} onChange={alan('ad')} /></label>
            <label className="alan"><span className="etiket">Yetkili kişi</span><input className="giris-kutu" placeholder="Ad soyad" value={duzen.veri.yetkili} onChange={alan('yetkili')} /></label>
            <label className="alan"><span className="etiket">Telefon</span><input className="giris-kutu" type="tel" placeholder="05XX XXX XX XX" value={duzen.veri.telefon} onChange={alan('telefon')} /></label>
            <label className="alan"><span className="etiket">Adres</span><textarea rows={2} placeholder="Açık adres" value={duzen.veri.adres} onChange={alan('adres')} /></label>
            <label className="kutucuk kutu"><input type="checkbox" checked={duzen.veri.aktif} onChange={alan('aktif')} /><span>Aktif: bu şubeye fiş kesilebilir</span></label>
            {duzen.eski && <p className="soluk kucuk-yazi">Kaldırılan şubenin geçmiş fişleri raporlarda kalır.</p>}
            {hata && <p className="hata" role="alert">{hata}</p>}
            <div className="dugme-satiri">
              {duzen.eski && <button type="button" className="dugme cizgili kirmizi" onClick={sil}>Kaldır</button>}
              <button type="button" className="dugme cizgili" onClick={() => setDuzen(null)}>Vazgeç</button>
              <button type="button" className="dugme siyah genis" onClick={kaydet}>Kaydet</button>
            </div>
          </>
        )}
      </Panel>
    </div>
  );
}
