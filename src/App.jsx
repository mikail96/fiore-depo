import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, ayarEksik } from './firebase';
import { useKoleksiyon } from './data';
import Giris from './screens/Giris';
import PanelEkrani from './screens/Panel';
import FisEditor from './screens/FisEditor';
import FisGonder from './screens/FisGonder';
import Fisler from './screens/Fisler';
import Subeler from './screens/Subeler';
import SubeDetay from './screens/SubeDetay';
import Urunler from './screens/Urunler';
import Raporlar from './screens/Raporlar';
import { Logo } from './ui';

function rotaOku() {
  const [yol, sorgu = ''] = window.location.hash.replace(/^#/, '').split('?');
  return { parca: yol.split('/').filter(Boolean), parametre: Object.fromEntries(new URLSearchParams(sorgu)) };
}

function Uygulama() {
  const [rota, setRota] = useState(rotaOku);
  const bugun = new Date();
  const [ay, setAy] = useState({ y: bugun.getFullYear(), m: bugun.getMonth() });
  const subeler = useKoleksiyon('subeler');
  const urunler = useKoleksiyon('urunler');

  useEffect(() => {
    const degisti = () => { setRota(rotaOku()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', degisti);
    return () => window.removeEventListener('hashchange', degisti);
  }, []);

  const { parca, parametre } = rota;
  const ortak = { ay, setAy, subeler, urunler, parametre };
  const anahtar = window.location.hash;
  if (parca[0] === 'fis' && parca[1] === 'yeni') return <FisEditor key={anahtar} {...ortak} />;
  if (parca[0] === 'fis' && parca[1] && parca[2] === 'duzenle') return <FisEditor key={anahtar} id={parca[1]} {...ortak} />;
  if (parca[0] === 'fis' && parca[1]) return <FisGonder key={anahtar} id={parca[1]} {...ortak} />;
  if (parca[0] === 'fisler') return <Fisler {...ortak} />;
  if (parca[0] === 'subeler') return <Subeler {...ortak} />;
  if (parca[0] === 'sube' && parca[1]) return <SubeDetay key={parca[1]} id={parca[1]} {...ortak} />;
  if (parca[0] === 'urunler') return <Urunler {...ortak} />;
  if (parca[0] === 'raporlar') return <Raporlar {...ortak} />;
  return <PanelEkrani {...ortak} />;
}

export default function App() {
  const [kullanici, setKullanici] = useState(undefined);
  useEffect(() => (ayarEksik ? undefined : onAuthStateChanged(auth, setKullanici)), []);

  if (ayarEksik) {
    return (
      <div className="giris">
        <div className="giris-ust"><Logo boyut={110} /><h1>Kurulum eksik</h1>
          <p>src/firebase-config.js dosyasına Firebase proje ayarlarını yapıştırman gerekiyor.</p></div>
      </div>
    );
  }
  if (kullanici === undefined) return <div className="giris"><div className="giris-ust"><Logo boyut={110} /></div></div>;
  if (!kullanici) return <Giris />;
  return <Uygulama />;
}
