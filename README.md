# Fiore Ana Depo

Caffe Di Fiore ana deposundan şubelere giden ürünlerin takibi. Telefonda ana ekrana eklenen bir web uygulaması (PWA).

- Ön yüz: React + Vite, GitHub Pages'te yayınlanır (`main`e her push'ta GitHub Actions otomatik yayınlar).
- Veri: Firebase Firestore (europe-west1), giriş: Firebase Authentication (e-posta/şifre).
- Görsel/PDF telefonda üretilir; paylaş menüsüyle WhatsApp'a gider.

## Özellikler
- Sevk fişi: şube seç, ürün adını yazıp listeden ekle, adeti yaz ya da −/+ ile değiştir.
- Şubeye özel fiyat (Ürünler > ürün > Şubeye özel fiyat). Boş = standart fiyat, 0 = o şubeye hep bedelsiz.
- Satır bazında "Bedelsiz": tutara ve KDV'ye girmez, raporda adedi ve değeri ayrı görünür.
- KDV hariç/dahil seçimi fiş bazında; raporlar KDV hariç.
- Fişi fiyatlı ya da fiyatsız görsel olarak paylaşma, PDF indirme.
- Şube detayı (aylık toplam, giden ürün listesi, fişler), aylık/yıllık rapor, Excel'e aktarma.
- İnternet yokken fiş kesilebilir; bağlantı gelince kendisi gönderir.

## Ayarlar
- `src/firebase-config.js`: Firebase web uygulaması ayarları ve kullanıcı adı uzantısı (`mikail` → `mikail@fioredepo.app`).
- `firestore.rules`: yalnızca yönetici e-postası okuyup yazabilir. Kullanıcı adını değiştirirsen buradaki e-postayı da değiştir, Firebase konsolunda Rules'a yapıştır.

## Başlangıç ürün listesi
Ürünler ve fiyatlar koda ve GitHub'a konmaz. İlk girişte Panel'deki "Başlangıç verileri" kartında depo Excel'i
(Depo_Takip_Son.xlsx) seçilir, tarayıcıda okunur ve Firestore'a yazılır (`src/excelKurulum.js`):
ürün adı ve fiyat GÖKKUŞAĞI ÜRÜN sayfasından, KDV STOK TAKİP sayfasındaki gruplardan (sarf malzeme %20, diğerleri %1).
Sonrasında ürünler uygulamadaki Ürünler ekranından yönetilir.

## Geliştirme
```
npm install
npm run emulator        # ayrı terminalde: Firebase emülatörleri
npm run dev:emulator    # emülatöre bağlı geliştirme sunucusu
npm run build
```
