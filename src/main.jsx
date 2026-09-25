import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import '@fontsource/dm-sans/600.css';
import '@fontsource/dm-sans/700.css';
import './styles.css';
import App from './App';
import { modulHatasi } from './share';

// Yeni sürüm yayınlanınca açık kalan eski sayfa, sunucudan kaldırılmış parçaları (PDF, Excel kütüphaneleri)
// yükleyemez. Yeni sürüm devreye girince sayfayı yenile; fiş düzenlerken yenileme bir sonraki ekran geçişine kalır.
if ('serviceWorker' in navigator) {
  let oncekiVardi = !!navigator.serviceWorker.controller;
  let bekliyor = false;
  const editorde = () => /^#\/fis\/(yeni|[^/?]+\/duzenle)/.test(window.location.hash);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!oncekiVardi) { oncekiVardi = true; return; }
    if (editorde()) bekliyor = true; else window.location.reload();
  });
  window.addEventListener('hashchange', () => { if (bekliyor && !editorde()) window.location.reload(); });
}
window.addEventListener('vite:preloadError', (e) => { e.preventDefault(); modulHatasi(); });

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
