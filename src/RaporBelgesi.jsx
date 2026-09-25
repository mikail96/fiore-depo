// Aylık / yıllık rapor belgesi. Ekranda gizli durur, PDF indirilirken A4 genişliğinde çizilir.
// Maliyet ve kâr sadece bu raporda görünür; şubelere giden fiş belgesinde asla yer almaz.
import { forwardRef } from 'react';
import { GRUPLAR } from './seed';
import { AY_KISA, AYLAR, TL, grupla, karOzeti, miktar, para, subelereAyir, tarihYaz, urunToplamlari, yuzde } from './utils';

const karSinif = (n) => (n === null ? '' : n < 0 ? 'kar-eksi' : 'kar-arti');
const karYaz = (n) => (n === null ? '—' : para(n));

function Ozet({ o }) {
  return (
    <div className="rapor-ozet" data-pdf-blok>
      <div><span>Satış (KDV hariç)</span><b>{TL(o.satis)}</b></div>
      <div><span>Maliyet</span><b>{o.hesaplandi ? TL(o.maliyet) : '—'}</b></div>
      <div><span>Kâr</span><b className={o.hesaplandi ? karSinif(o.kar) : ''}>{o.hesaplandi ? TL(o.kar) : '—'}</b></div>
      <div><span>Kâr marjı</span><b>{yuzde(o.marj)}</b></div>
    </div>
  );
}

function UrunTablosu({ fisler, urunMap }) {
  const gruplar = grupla(urunToplamlari(fisler, urunMap), GRUPLAR);
  return (
    <table className="belge-tablo rapor-tablo">
      <thead><tr><th>Ürün</th><th>Miktar</th><th>Satış</th><th>Kâr</th></tr></thead>
      <tbody>
        {gruplar.flatMap((g) => [
          <tr key={`g-${g.grup}`} className="grup-satir"><td>{g.grup}</td><td /><td>{para(g.tutar)}</td><td className={g.karEksik ? '' : karSinif(g.kar)}>{g.karEksik ? '—' : para(g.kar)}</td></tr>,
          ...g.urunler.map((u) => (
            <tr key={`${g.grup}-${u.ad}`}>
              <td>{u.ad}</td>
              <td>{miktar(u.adet)} {u.birim}{u.bedelsizAdet ? ` (${miktar(u.bedelsizAdet)} bedelsiz)` : ''}</td>
              <td>{u.bedelsizAdet === u.adet ? 'Bedelsiz' : para(u.tutar)}</td>
              <td className={karSinif(u.kar)}>{karYaz(u.kar)}</td>
            </tr>
          ))
        ])}
      </tbody>
    </table>
  );
}

export const RaporBelgesi = forwardRef(function RaporBelgesi({ baslik, fisler, urunMap, tekSube, yillik }, ref) {
  const o = karOzeti(fisler, urunMap);
  const subeler = subelereAyir(fisler).map((s) => ({ ...s, o: karOzeti(s.fisler, urunMap) }));
  const aylar = yillik ? AY_KISA.map((_, m) => ({ m, fisler: fisler.filter((f) => f.tarih.getMonth() === m) }))
    .filter((a) => a.fisler.length).map((a) => ({ ...a, o: karOzeti(a.fisler, urunMap) })) : [];
  const bedelsiz = fisler.reduce((t, f) => t + (f.bedelsizDeger || 0), 0);
  return (
    <article ref={ref} className="belge rapor">
      <div className="belge-ust">
        <div className="belge-marka">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" width="46" height="46" />
          <span className="yigin"><b>Caffe Di Fiore</b><small>Ana depo raporu</small></span>
        </div>
        <span className="yigin sag"><b>{baslik}</b><small>Hazırlanma: {tarihYaz(new Date())}</small></span>
      </div>
      <Ozet o={o} />
      <div className="rapor-not" data-pdf-blok>
        <span>{fisler.length} sevk fişi. Tutarlar KDV hariç; kâr = satış − maliyet.</span>
        {bedelsiz > 0 && <span>Bedelsiz gönderilen: {TL(bedelsiz)} değerinde{o.bedelsizMaliyet > 0 ? `, maliyeti ${TL(o.bedelsizMaliyet)} (kârdan düşüldü)` : ''}.</span>}
        {o.eksikUrun > 0 && <span>Maliyeti girilmemiş {o.eksikUrun} ürünün {TL(o.eksikSatis)} tutarındaki satışı kâr hesabına dahil değil.</span>}
      </div>

      {!tekSube && subeler.length > 0 && (
        <>
          <h3 className="rapor-baslik">Şubelere göre</h3>
          <table className="belge-tablo rapor-tablo">
            <thead><tr><th>Şube</th><th>Fiş</th><th>Satış</th><th>Maliyet</th><th>Kâr</th><th>Marj</th></tr></thead>
            <tbody>
              {subeler.map((s) => (
                <tr key={s.id}><td>{s.ad}</td><td>{s.fisler.length}</td><td>{para(s.o.satis)}</td>
                  <td>{s.o.hesaplandi ? para(s.o.maliyet) : '—'}</td><td className={s.o.hesaplandi ? karSinif(s.o.kar) : ''}>{s.o.hesaplandi ? para(s.o.kar) : '—'}</td><td>{yuzde(s.o.marj)}</td></tr>
              ))}
              {subeler.length > 1 && (
                <tr className="rapor-toplam"><td>Toplam</td><td>{fisler.length}</td><td>{para(o.satis)}</td>
                  <td>{o.hesaplandi ? para(o.maliyet) : '—'}</td><td className={o.hesaplandi ? karSinif(o.kar) : ''}>{o.hesaplandi ? para(o.kar) : '—'}</td><td>{yuzde(o.marj)}</td></tr>
              )}
            </tbody>
          </table>
        </>
      )}

      {yillik && aylar.length > 0 && (
        <>
          <h3 className="rapor-baslik">Aylara göre</h3>
          <table className="belge-tablo rapor-tablo">
            <thead><tr><th>Ay</th><th>Fiş</th><th>Satış</th><th>Maliyet</th><th>Kâr</th><th>Marj</th></tr></thead>
            <tbody>
              {aylar.map((a) => (
                <tr key={a.m}><td>{AYLAR[a.m]}</td><td>{a.fisler.length}</td><td>{para(a.o.satis)}</td>
                  <td>{a.o.hesaplandi ? para(a.o.maliyet) : '—'}</td><td className={a.o.hesaplandi ? karSinif(a.o.kar) : ''}>{a.o.hesaplandi ? para(a.o.kar) : '—'}</td><td>{yuzde(a.o.marj)}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {subeler.map((s) => (
        <section key={s.id} className="rapor-bolum">
          <h3 className="rapor-baslik">{tekSube ? 'Giden ürünler' : `${s.ad}: giden ürünler`}</h3>
          <UrunTablosu fisler={s.fisler} urunMap={urunMap} />
        </section>
      ))}
    </article>
  );
});

// Şubeye gönderilecek aylık sevk dökümü. Bilerek maliyet ve kâr hesaplamaz; sadece şubenin
// o ay aldığı ürünler, tutarlar ve fişler yer alır.
export const SubeDokumu = forwardRef(function SubeDokumu({ subeAd, donem, fisler, urunMap }, ref) {
  // urunMap sadece ürün gruplarını bulmak için; maliyet ve kâr burada gösterilmez
  const gruplar = grupla(urunToplamlari(fisler, urunMap), GRUPLAR);
  const ara = fisler.reduce((t, f) => t + (f.araToplam || 0), 0);
  const kdv = fisler.reduce((t, f) => t + (f.kdvToplam || 0), 0);
  const bedelsiz = fisler.reduce((t, f) => t + (f.bedelsizDeger || 0), 0);
  return (
    <article ref={ref} className="belge rapor">
      <div className="belge-ust">
        <div className="belge-marka">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="" width="46" height="46" />
          <span className="yigin"><b>Caffe Di Fiore</b><small>Ana depo sevk dökümü</small></span>
        </div>
        <span className="yigin sag"><b>{subeAd}</b><small>{donem}</small></span>
      </div>
      <div className="rapor-ozet" data-pdf-blok>
        <div><span>Toplam (KDV hariç)</span><b>{TL(ara)}</b></div>
        <div><span>KDV</span><b>{TL(kdv)}</b></div>
        <div><span>KDV dahil</span><b>{TL(ara + kdv)}</b></div>
        <div><span>Sevk fişi</span><b>{fisler.length}</b></div>
      </div>
      <div className="rapor-not" data-pdf-blok>
        <span>{donem} içinde ana depodan {subeAd} şubesine gönderilen ürünlerin toplamı.</span>
        {bedelsiz > 0 && <span>Bedelsiz gönderilen ürünler tutara dahil değildir ({TL(bedelsiz)} değerinde).</span>}
      </div>
      <h3 className="rapor-baslik">Giden ürünler</h3>
      <table className="belge-tablo rapor-tablo">
        <thead><tr><th>Ürün</th><th>Miktar</th><th>Tutar</th></tr></thead>
        <tbody>
          {gruplar.flatMap((g) => [
            <tr key={`g-${g.grup}`} className="grup-satir"><td>{g.grup}</td><td /><td>{para(g.tutar)}</td></tr>,
            ...g.urunler.map((u) => (
              <tr key={`${g.grup}-${u.ad}`}>
                <td>{u.ad}</td>
                <td>{miktar(u.adet)} {u.birim}{u.bedelsizAdet ? ` (${miktar(u.bedelsizAdet)} bedelsiz)` : ''}</td>
                <td>{u.bedelsizAdet === u.adet ? 'Bedelsiz' : para(u.tutar)}</td>
              </tr>
            ))
          ])}
          <tr className="rapor-toplam"><td>Toplam (KDV hariç)</td><td /><td>{para(ara)}</td></tr>
        </tbody>
      </table>
      <h3 className="rapor-baslik">Sevk fişleri</h3>
      <table className="belge-tablo rapor-tablo">
        <thead><tr><th>Fiş no</th><th>Tarih</th><th>Kalem</th><th>Tutar</th></tr></thead>
        <tbody>
          {fisler.slice().sort((a, b) => a.tarih - b.tarih).map((f) => (
            <tr key={f.id}><td>{f.no}</td><td>{tarihYaz(f.tarih)}</td><td>{f.satirlar.length}</td><td>{para(f.araToplam)}</td></tr>
          ))}
        </tbody>
      </table>
    </article>
  );
});
