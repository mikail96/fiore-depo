import { TL0, yuzde } from './utils';

const EKSIK_LINK = '#/urunler?maliyet=eksik';

// Uygulama içindeki kâr özeti: maliyet, kâr, marj ve eksik maliyet uyarısı.
export function KarOzetKutusu({ o }) {
  if (!o.hesaplandi) {
    return <div className="uyari-kutu">Kârı görmek için ürünlere maliyet gir. <a href={EKSIK_LINK}>Maliyetleri gir</a></div>;
  }
  return (
    <>
      <div className="kar-ozet">
        <div><small>Maliyet</small><b>{TL0(o.maliyet)}</b></div>
        <div><small>Kâr</small><b className={o.kar < 0 ? 'kar-eksi' : 'kar-arti'}>{TL0(o.kar)}</b></div>
        <div><small>Kâr marjı</small><b>{yuzde(o.marj)}</b></div>
      </div>
      {o.eksikUrun > 0 && (
        <div className="uyari-kutu">
          {o.eksikUrun} ürünün maliyeti girilmemiş, {TL0(o.eksikSatis)} tutarındaki satış kâra dahil değil. <a href={EKSIK_LINK}>Maliyetleri gir</a>
        </div>
      )}
    </>
  );
}

// Liste satırının sağındaki küçük kâr yazısı
export function KarYazisi({ kar }) {
  if (kar === null || kar === undefined) return <small>maliyet yok</small>;
  return <small className={kar < 0 ? 'kar-eksi' : 'kar-arti'}>kâr {TL0(kar)}</small>;
}
