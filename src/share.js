// Fişi görsel (PNG) ya da PDF olarak dışarı verir, raporları Excel'e aktarır.
async function tuval(el) {
  const html2canvas = (await import('html2canvas')).default;
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

// A4 PDF. Uzun fişler birden fazla sayfaya bölünür.
export async function pdfIndir(el, ad) {
  const [{ jsPDF }, canvas] = await Promise.all([import('jspdf'), tuval(el)]);
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const kenar = 10, gen = 210 - kenar * 2, sayfaYuk = 297 - kenar * 2;
  const pxMm = canvas.width / gen;
  const dilimPx = Math.floor(sayfaYuk * pxMm);
  for (let y = 0, sayfa = 0; y < canvas.height; y += dilimPx, sayfa++) {
    const h = Math.min(dilimPx, canvas.height - y);
    const parca = document.createElement('canvas');
    parca.width = canvas.width; parca.height = h;
    parca.getContext('2d').drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);
    if (sayfa > 0) pdf.addPage();
    pdf.addImage(parca.toDataURL('image/jpeg', 0.92), 'JPEG', kenar, kenar, gen, h / pxMm);
  }
  indir(pdf.output('blob'), `${ad}.pdf`);
}

// sayfalar: [[sayfaAdı, [[başlık...], [satır...], ...]], ...]
export async function excelIndir(sayfalar, ad) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  for (const [sayfaAdi, satirlar] of sayfalar) {
    const ws = XLSX.utils.aoa_to_sheet(satirlar);
    ws['!cols'] = (satirlar[0] || []).map((_, i) => ({ wch: i === 0 ? 16 : 14 }));
    XLSX.utils.book_append_sheet(wb, ws, sayfaAdi.slice(0, 31));
  }
  XLSX.writeFile(wb, `${ad}.xlsx`);
}
