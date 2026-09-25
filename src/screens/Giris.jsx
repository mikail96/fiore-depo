import { useState } from 'react';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from 'firebase/auth';
import { auth } from '../firebase';
import { KULLANICI_DOMAIN } from '../firebase-config';
import { Ikon, Logo } from '../ui';

const HATALAR = {
  'auth/invalid-credential': 'Kullanıcı adı veya şifre hatalı.',
  'auth/wrong-password': 'Kullanıcı adı veya şifre hatalı.',
  'auth/user-not-found': 'Kullanıcı adı veya şifre hatalı.',
  'auth/invalid-email': 'Kullanıcı adı geçersiz.',
  'auth/too-many-requests': 'Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar dene.',
  'auth/network-request-failed': 'İnternet bağlantısı yok. Bağlanıp tekrar dene.'
};

export default function Giris() {
  const [kullanici, setKullanici] = useState('');
  const [sifre, setSifre] = useState('');
  const [goster, setGoster] = useState(false);
  const [hatirla, setHatirla] = useState(true);
  const [hata, setHata] = useState('');
  const [bekle, setBekle] = useState(false);

  async function gir(e) {
    e.preventDefault();
    if (!kullanici.trim() || !sifre) { setHata('Kullanıcı adı ve şifreyi yaz.'); return; }
    setBekle(true); setHata('');
    const k = kullanici.trim().toLocaleLowerCase('tr-TR');
    const eposta = k.includes('@') ? k : `${k}@${KULLANICI_DOMAIN}`;
    try {
      await setPersistence(auth, hatirla ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, eposta, sifre);
    } catch (err) {
      setHata(HATALAR[err.code] || 'Giriş yapılamadı. Tekrar dene.');
      setBekle(false);
    }
  }

  return (
    <div className="giris">
      <div className="giris-ust">
        <Logo boyut={132} />
        <h1>Ana depo</h1>
        <p>Şubelere giden ürün ve sevk takibi</p>
      </div>
      <form className="giris-form" onSubmit={gir} noValidate>
        <label className="koyu-alan">
          <span>Kullanıcı adı</span>
          <input type="text" autoComplete="username" autoCapitalize="none" value={kullanici} onChange={(e) => setKullanici(e.target.value)} />
        </label>
        <label className="koyu-alan">
          <span>Şifre</span>
          <span className="sifre-kutu">
            <input type={goster ? 'text' : 'password'} autoComplete="current-password" value={sifre} onChange={(e) => setSifre(e.target.value)} />
            <button type="button" aria-label={goster ? 'Şifreyi gizle' : 'Şifreyi göster'} onClick={() => setGoster(!goster)}><Ikon ad="eye" /></button>
          </span>
        </label>
        <label className="kutucuk koyu">
          <input type="checkbox" checked={hatirla} onChange={(e) => setHatirla(e.target.checked)} />
          <span>Beni hatırla</span>
        </label>
        {hata && <p className="giris-hata" role="alert">{hata}</p>}
        <button className="dugme turuncu buyuk" type="submit" disabled={bekle}>{bekle ? 'Giriş yapılıyor…' : 'Giriş yap'}</button>
      </form>
      <p className="giris-alt">Yalnızca yönetici hesabıyla giriş yapılır.</p>
    </div>
  );
}
