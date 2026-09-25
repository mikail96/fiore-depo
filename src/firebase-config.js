// Firebase Console > Proje ayarları > Genel > Uygulamalarınız > Web uygulaması
// oradaki firebaseConfig değerlerini buraya yapıştır.
export const firebaseConfig = {
  apiKey: 'BURAYA_API_KEY',
  authDomain: 'BURAYA.firebaseapp.com',
  projectId: 'BURAYA_PROJE_ID',
  storageBucket: 'BURAYA.firebasestorage.app',
  messagingSenderId: 'BURAYA',
  appId: 'BURAYA'
};

// Girişte yazılan kullanıcı adının sonuna eklenir: "mikail" -> "mikail@fioredepo.app"
// Firebase'de kullanıcıyı bu e-posta ile oluştur. firestore.rules içindeki e-posta ile aynı olmalı.
export const KULLANICI_DOMAIN = 'fioredepo.app';
