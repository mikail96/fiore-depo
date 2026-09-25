import { useState } from 'react';
import { useFisler } from '../data';
import { AltMenu, AyGezgini, Baslik, Bos, Cipler, Ikon, Yukleniyor } from '../ui';
import { TL, TL0, ayAraligi, ayAdi } from '../utils';

export default function Fisler({ ay, setAy }) {
  const [bas, son] = ayAraligi(ay.y, ay.m);
  const { list, yuklendi } = useFisler(bas, son);
  const [sube, setSube] = useState('hepsi');
  const subeler = [...new Map(list.map((f) => [f.subeId, f.subeAd])).entries()];
  const gorunen = list.filter((f) => sube === 'hepsi' || f.subeId === sube);
  const toplam = gorunen.reduce((a, f) => a + (f.araToplam || 0), 0);
  const secili = sube === 'hepsi' || subeler.some(([id]) => id === sube) ? sube : 'hepsi';

  return (
    <div className="ekran menulu">
      <Baslik ust="Ana depo" baslik="Sevk fişleri"
        sag={<a className="dugme turuncu kucuk" href="#/fis/yeni"><Ikon ad="plus" boyut={20} kalinlik={2.2} />Yeni fiş</a>} />
      <main className="icerik">
        <AyGezgini ay={ay} setAy={setAy} />
        {subeler.length > 1 && <Cipler kucuk secenekler={[['hepsi', 'Tümü'], ...subeler]} secili={secili} onSec={setSube} />}
        <p className="soluk">{secili === 'hepsi' ? 'Tüm şubeler' : subeler.find(([id]) => id === secili)?.[1]}: {gorunen.length} fiş, {TL0(toplam)} + KDV</p>
        {!yuklendi && <Yukleniyor />}
        {yuklendi && gorunen.length === 0 && <Bos>{ayAdi(ay)} için fiş yok. Sağ üstten yeni fiş kesebilirsin.</Bos>}
        {gorunen.map((f) => (
          <a key={f.id} className="kart satir-kart" href={`#/fis/${f.id}`}>
            <span className="yigin"><b className="orta">{f.subeAd}</b><small>{f.no || 'Numara bekleniyor'}, {f.tarih.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })}, {f.satirlar.length} kalem</small></span>
            <span className="yatay">
              <span className="yigin sag"><b className="nowrap">{TL(f.kdvDahil ? f.kdvDahilToplam : f.araToplam)}</b><small className={f.kdvDahil ? 'metin-yesil' : 'metin-turuncu'}>{f.kdvDahil ? 'KDV dahil' : '+ KDV'}</small></span>
              <Ikon ad="right" boyut={18} />
            </span>
          </a>
        ))}
      </main>
      <AltMenu aktif="#/fisler" />
    </div>
  );
}
