// Eski sürüm açıkken yeni sürüm yayınlanırsa kütüphane parçası bulunamaz: sayfayı bir kez yenile.
export function modulHatasi() {
  const k = 'fiore-modul-yenileme';
  if (Date.now() - Number(sessionStorage.getItem(k) || 0) > 30000) {
    sessionStorage.setItem(k, String(Date.now()));
    window.location.reload();
  }
}
async function yukle(fn) {
  try { return await fn(); }
  catch (e) { modulHatasi(); throw e; }
}
export const kutuphaneleriHazirla = () => { yukle(() => import('jspdf')).catch(() => {}); yukle(() => import('html2canvas')).catch(() => {}); };

// Fişi görsel (PNG) ya da PDF olarak dışarı verir, raporları Excel'e aktarır.
async function tuval(el) {
  const html2canvas = (await yukle(() => import('html2canvas'))).default;
  if (document.fonts?.ready) await document.fonts.ready;
  return html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false });
}

function indir(blob, ad) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = ad;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

// Fişin görselini (PNG) hazırlar.
export async function gorselDosya(el, ad) {
  const canvas = await tuval(el);
  const blob = await new Promise((r) => canvas.toBlob(r, 'image/png'));
  return new File([blob], `${ad}.png`, { type: 'image/png' });
}

// Telefonda paylaş menüsünü açar (WhatsApp vb.), destek yoksa dosyayı indirir.
// iPhone'da paylaş menüsü dokunuşun hemen ardından açılmalı; bu yüzden dosya önceden hazırlanıp buraya verilir.
export async function dosyaPaylas(dosya) {
  if (navigator.canShare && navigator.canShare({ files: [dosya] })) {
    try { await navigator.share({ files: [dosya] }); return 'paylasildi'; }
    catch (e) {
      if (e && e.name === 'AbortError') return 'iptal';
      if (e && e.name === 'NotAllowedError') return 'tekrar';
    }
  }
  indir(dosya, dosya.name);
  return 'indirildi';
}

// A4 PDF. Belge A4 genişliğinde ayrı bir kopya olarak çizilir; sayfalar satır aralarından bölünür
// (hiçbir satır iki sayfaya bölünmez), tablo başlığı her sayfada tekrar eder, altta sayfa numarası olur.
const PDF_GENISLIK = 680; // px, A4'ün yazı alanına karşılık gelir

async function a4Kopya(el) {
  const kap = document.createElement('div');
  kap.style.cssText = `position:fixed;left:-${PDF_GENISLIK * 3}px;top:0;width:${PDF_GENISLIK}px;background:#fff;pointer-events:none;`;
  const kopya = el.cloneNode(true);
  kopya.style.width = `${PDF_GENISLIK}px`;
  kopya.style.maxWidth = 'none';
  kopya.style.borderRadius = '0';
  kopya.style.boxShadow = 'none';
  kap.appendChild(kopya);
  document.body.appendChild(kap);
  await Promise.all([...kopya.querySelectorAll('img')].map((i) => (i.complete ? null : i.decode().catch(() => null))));
  return { kap, kopya };
}

export async function pdfIndir(el, ad) {
  const { jsPDF } = await yukle(() => import('jspdf'));
  const { kap, kopya } = await a4Kopya(el);
  try {
    const canvas = await tuval(kopya);
    const kok = kopya.getBoundingClientRect();
    const olcek = canvas.height / kok.height;
    const y = (e, kenar) => (e.getBoundingClientRect()[kenar] - kok.top) * olcek;
    // güvenli kesme noktaları: satır ve blok altları, bölüm başlıklarının üstü (başlık sayfa sonunda yalnız kalmasın).
    // Grup başlığı satırından hemen sonra da bölünmez.
    const kesmeler = [
      ...[...kopya.querySelectorAll('.belge-ust, .belge-taraf, tbody tr:not(.grup-satir), .belge-toplam > div, .belge-kalem, .belge-not, .belge-imza, [data-pdf-blok], .rapor-bolum')].map((e) => y(e, 'bottom')),
      ...[...kopya.querySelectorAll('.rapor-baslik')].map((e) => y(e, 'top') - 2)
    ].sort((a, b) => a - b);
    // her tablo: başlık satırı ve son satırı; sayfa bir tablonun ortasında başlıyorsa başlığı tekrar edilir
    const tablolar = [...kopya.querySelectorAll('table')].map((t) => {
      const th = t.querySelector('thead'), son = t.querySelector('tbody tr:last-child');
      return th && son ? { ust: y(th, 'top'), alt: y(th, 'bottom'), son: y(son, 'bottom') } : null;
    }).filter(Boolean);

    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const kenar = 12, gen = 210 - kenar * 2, sayfaYuk = 297 - kenar * 2 - 6; // altta sayfa no payı
    const pxMm = canvas.width / gen;
    const sayfaPx = Math.floor(sayfaYuk * pxMm);
    let bas_y = 0, sayfa = 0;
    while (bas_y < canvas.height - 2) {
      const bas = sayfa > 0 ? tablolar.find((t) => bas_y >= t.alt - 1 && bas_y < t.son - 2) : null;
      const tekrar = !!bas;
      const baslikPx = tekrar ? Math.ceil(bas.alt - bas.ust) : 0;
      const sinir = bas_y + sayfaPx - baslikPx;
      let son = canvas.height;
      if (sinir < canvas.height) {
        const uygun = kesmeler.filter((k) => k > bas_y + 4 && k <= sinir);
        son = uygun.length ? uygun[uygun.length - 1] : sinir; // tek parça sayfaya sığmıyorsa mecburen böl
      }
      son = Math.round(son);
      const govdePx = son - bas_y;
      const parca = document.createElement('canvas');
      parca.width = canvas.width; parca.height = baslikPx + govdePx;
      const ctx = parca.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, parca.width, parca.height);
      if (tekrar) ctx.drawImage(canvas, 0, Math.round(bas.ust), canvas.width, baslikPx, 0, 0, canvas.width, baslikPx);
      ctx.drawImage(canvas, 0, bas_y, canvas.width, govdePx, 0, baslikPx, canvas.width, govdePx);
      if (sayfa > 0) pdf.addPage();
      pdf.addImage(parca.toDataURL('image/jpeg', 0.92), 'JPEG', kenar, kenar, gen, parca.height / pxMm);
      bas_y = son; sayfa++;
    }
    if (sayfa > 1) {
      pdf.setFontSize(8); pdf.setTextColor(120);
      for (let i = 1; i <= sayfa; i++) { pdf.setPage(i); pdf.text(`${i} / ${sayfa}`, 105, 291, { align: 'center' }); }
    }
    indir(pdf.output('blob'), `${ad}.pdf`);
  } finally {
    kap.remove();
  }
}

// sayfalar: [[sayfaAdı, [[başlık...], [satır...], ...]], ...]
export async function excelIndir(sayfalar, ad) {
  const XLSX = await yukle(() => import('xlsx'));
  const wb = XLSX.utils.book_new();
  for (const [sayfaAdi, satirlar] of sayfalar) {
    const ws = XLSX.utils.aoa_to_sheet(satirlar);
    ws['!cols'] = (satirlar[0] || []).map((_, i) => ({ wch: i === 0 ? 16 : 14 }));
    XLSX.utils.book_append_sheet(wb, ws, sayfaAdi.slice(0, 31));
  }
  XLSX.writeFile(wb, `${ad}.xlsx`);
}
