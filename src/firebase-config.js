// Firebase Console > Proje ayarları > Genel > Uygulamalarınız > Web uygulaması
// oradaki firebaseConfig değerlerini buraya yapıştır.
export const firebaseConfig = {
  apiKey: 'AIzaSyDAwpt1bnRD96QsQX2asVp4H1M8aggzXVk',
  authDomain: 'fiore-depo.firebaseapp.com',
  projectId: 'fiore-depo',
  storageBucket: 'fiore-depo.firebasestorage.app',
  messagingSenderId: '450235240800',
  appId: '1:450235240800:web:143799ee0982653dfc4e05'
};

// Girişte yazılan kullanıcı adının sonuna eklenir: "mikail" -> "mikail@fioredepo.app"
// Firebase'de kullanıcıyı bu e-posta ile oluştur. firestore.rules içindeki e-posta ile aynı olmalı.
export const KULLANICI_DOMAIN = 'fioredepo.app';
