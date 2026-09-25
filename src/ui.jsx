import { ayAdi, girisMiktar, sayiAl } from './utils';

const YOL = {
  panel: <><rect x="3" y="3" width="7" height="9" rx="1.5" /><rect x="14" y="3" width="7" height="5" rx="1.5" /><rect x="14" y="12" width="7" height="9" rx="1.5" /><rect x="3" y="16" width="7" height="5" rx="1.5" /></>,
  doc: <><path d="M7 3h7l4 4v14H7z" /><path d="M14 3v4h4M10 12h5M10 16h5" /></>,
  store: <><path d="M4 9.5V20h16V9.5" /><path d="M2.5 9.5L5 4h14l2.5 5.5z" /><path d="M10 20v-5h4v5" /></>,
  box: <><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M4 7.5l8 4.5 8-4.5M12 12v9" /></>,
  chart: <><path d="M4 20h16" /><path d="M7 16v-5M12 16V6M17 16v-8" /></>,
  right: <path d="M9 6l6 6-6 6" />, left: <path d="M15 6l-6 6 6 6" />, back: <path d="M15 6l-6 6 6 6" />,
  plus: <path d="M12 5v14M5 12h14" />, minus: <path d="M5 12h14" />,
  search: <><circle cx="11" cy="11" r="6" /><path d="M20 20l-4.5-4.5" /></>,
  check: <path d="M5 12.5l4.5 4.5L19 7" />, pen: <path d="M4 20h4L19 9l-4-4L4 16z" />,
  dl: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  share: <><path d="M7 12l10-6M7 12l10 6" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="6" r="2" /><circle cx="18" cy="18" r="2" /></>,
  trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>,
  eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  cikis: <><path d="M14 4h5v16h-5" /><path d="M10 8l-4 4 4 4M6 12h10" /></>,
  x: <path d="M6 6l12 12M18 6L6 18" />
};

export function Ikon({ ad, boyut = 22, kalinlik = 1.8 }) {
  return (
    <svg width={boyut} height={boyut} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={kalinlik} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{YOL[ad]}</svg>
  );
}

export const Logo = ({ boyut = 52 }) => (
  <img className="logo" src={`${import.meta.env.BASE_URL}logo.png`} alt="Caffe Di Fiore" width={boyut} height={boyut} />
);

export function Baslik({ ust, baslik, sag }) {
  return (
    <header className="baslik">
      <div className="baslik-sol">
        <Logo />
        <div className="baslik-metin">
          <span className="ust">{ust}</span>
          <h1>{baslik}</h1>
        </div>
      </div>
      {sag}
    </header>
  );
}

export function AltBaslik({ geri, geriEtiket, baslik, alt, onGeri }) {
  return (
    <header className="baslik alt-baslik">
      <div className="alt-baslik-ust">
        <a className="geri" href={geri} onClick={onGeri}><Ikon ad="back" /><span>{geriEtiket}</span></a>
        <Logo boyut={40} />
      </div>
      <div className="alt-baslik-metin">
        <h1>{baslik}</h1>
        {alt && <span>{alt}</span>}
      </div>
    </header>
  );
}

const SEKMELER = [
  ['#/', 'Panel', 'panel'], ['#/fisler', 'Fişler', 'doc'], ['#/subeler', 'Şubeler', 'store'],
  ['#/urunler', 'Ürünler', 'box'], ['#/raporlar', 'Rapor', 'chart']
];
export function AltMenu({ aktif }) {
  return (
    <nav className="altmenu">
      {SEKMELER.map(([href, ad, ikon]) => (
        <a key={href} href={href} className={aktif === href ? 'aktif' : ''} aria-current={aktif === href ? 'page' : undefined}>
          <Ikon ad={ikon} boyut={24} /><span>{ad}</span>
        </a>
      ))}
    </nav>
  );
}

export function AyGezgini({ ay, setAy, yillik }) {
  const oncekiYil = () => setAy({ y: ay.y - 1, m: ay.m });
  const sonrakiYil = () => setAy({ y: ay.y + 1, m: ay.m });
  return (
    <div className="aygezgini">
      <button type="button" aria-label={yillik ? 'Önceki yıl' : 'Önceki ay'}
        onClick={() => yillik ? oncekiYil() : setAy(ayKaydir(ay, -1))}><Ikon ad="left" /></button>
      <span>{yillik ? ay.y : ayAdi(ay)}</span>
      <button type="button" aria-label={yillik ? 'Sonraki yıl' : 'Sonraki ay'}
        onClick={() => yillik ? sonrakiYil() : setAy(ayKaydir(ay, 1))}><Ikon ad="right" /></button>
    </div>
  );
}
const ayKaydir = ({ y, m }, d) => { const t = new Date(y, m + d, 1); return { y: t.getFullYear(), m: t.getMonth() }; };

export function Adet({ deger, adim = 1, onChange, etiket = 'Adet' }) {
  const degis = (d) => {
    const yeni = Math.max(0, Math.round((sayiAl(deger) + d * adim) * 1000) / 1000);
    onChange(girisMiktar(yeni), d < 0 && yeni === 0);
  };
  return (
    <div className="adet">
      <button type="button" aria-label="Azalt" onClick={() => degis(-1)}><Ikon ad="minus" boyut={18} /></button>
      <input type="text" inputMode="decimal" aria-label={etiket} value={deger}
        onFocus={(e) => e.target.select()}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''), false)} />
      <button type="button" aria-label="Artır" onClick={() => degis(1)}><Ikon ad="plus" boyut={18} /></button>
    </div>
  );
}

export function Cipler({ secenekler, secili, onSec, kucuk }) {
  return (
    <div className="cipler">
      {secenekler.map((s) => {
        const [deger, etiket] = Array.isArray(s) ? s : [s, s];
        return (
          <button key={deger} type="button" className={`cip${kucuk ? ' kucuk' : ''}${secili === deger ? ' secili' : ''}`}
            aria-pressed={secili === deger} onClick={() => onSec(deger)}>{etiket}</button>
        );
      })}
    </div>
  );
}

export function Sekmeler({ secenekler, secili, onSec }) {
  return (
    <div className="sekmeler">
      {secenekler.map(([deger, etiket]) => (
        <button key={String(deger)} type="button" className={secili === deger ? 'secili' : ''}
          aria-pressed={secili === deger} onClick={() => onSec(deger)}>{etiket}</button>
      ))}
    </div>
  );
}

export function Panel({ acik, baslik, onKapat, children }) {
  if (!acik) return null;
  return (
    <div className="perde" onClick={(e) => { if (e.target === e.currentTarget) onKapat(); }}>
      <div className="alt-panel" role="dialog" aria-modal="true" aria-label={baslik}>
        <div className="tutamac" />
        <h2>{baslik}</h2>
        {children}
      </div>
    </div>
  );
}

export const Bos = ({ children }) => <div className="bos">{children}</div>;
export const Yukleniyor = () => <div className="bos">Yükleniyor…</div>;
