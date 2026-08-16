# SINEAI — Mobile-First & Google Play Store UX Roadmap

**Ürün:** SineAI (Filmprint)  
**Tarih:** 16 Ağustos 2026  
**Doküman:** `docs/mobile-playstore-ux-roadmap.md`  
**Hedef:** PWA, TWA (Trusted Web Activity), Android WebView / Native Shell & Google Play Store Dağıtımı

---

## 1. Mobil Navigasyon Mimarisi Analizi

Google Play Store'da yer alacak modern bir tüketici eğlence uygulamasında navigasyon yapısı doğrudan kullanıcı tutundurmasını (retention) ve oturum süresini belirler. 3 farklı yaklaşım analiz edilmiştir:

| Navigasyon Modeli | Başparmak Ergonomisi (Thumb Zone) | Hiyerarşi Netliği | Android/Play Store Uyumu | Karar |
| :--- | :--- | :--- | :--- | :--- |
| **Model A: Kalıcı Alt Menü (Bottom Navigation Bar)** | ⭐⭐⭐⭐⭐ (Mükemmel - Tek elle her ana sekmeye 1 tıkta erişim) | ⭐⭐⭐⭐⭐ (5 ana çekirdek alan) | ⭐⭐⭐⭐⭐ (Play Store standardı: Spotify, Netflix, Letterboxd) | 🏆 **SEÇİLEN (Önerilen)** |
| **Model B: Yalnızca Üst Menü + Hamburger** | ⭐ (Kötü - Ekranın en tepesine uzanma zorunluluğu) | ⭐⭐ (Menü arkasına gizlenen özellikler) | ⭐ (Web sitesi hissi verir, native app gibi durmaz) | ❌ Reddedildi |
| **Model C: Hibrit (Üst Sekmeler + Alt Eylemler)** | ⭐⭐⭐ (Orta) | ⭐⭐⭐ (Karışık, iki tarafa da bölünmüş dikkat) | ⭐⭐⭐ | ❌ Reddedildi |

### Önerilen Navigasyon Yapısı:

#### A. Mobilde Kalıcı Alt Bar (Bottom Navigation - 5 Çekirdek Sekme)
1. 🏠 **Ana Sayfa (`/` veya `/tv`):** Kişiselleştirilmiş karşılama, öne çıkan yapımlar, zevk satırları.
2. 💡 **Öneriler (`/recommendations` veya `/tv/recommendations`):** Eşleşme skoru yüksek yapımlar, Hybrid AI açıklamaları.
3. 🎯 **Kalibrasyon (`/calibrate` veya `/tv/calibration`):** Hızlı film/dizi oylama akışı (Merkezi eylem).
4. 📁 **Kütüphanem (`/library`):** İzleme Listesi, İzlediklerim, Favoriler, "Bu Akşam Ne İzlesem?".
5. 🧬 **Zevk DNA (`/profile` veya `/tv/profile`):** Kişisel sinema profili, tür/dönem spektrumu, rütbe seviyesi.

#### B. Mobilde Minimal Üst Bar (Top Bar)
- Sol: **SINEAI** Minimalist Logo
- Orta: **Film / Dizi** Hap Buton (Segmented Pill Switcher)
- Sağ: Kullanıcı Avatarı / Bildirim / Arama

---

## 2. Google Play Store UI / UX Standartları ve İhtiyaçlar

Play Store'da öne çıkarılmak (Google Play Featuring) ve yüksek kullanıcı puanı almak için arayüzün sağlaması gereken teknik ve görsel gereksinimler:

### 2.1 Dokunma Alanları (48dp Touch Targets)
- Tüm butonlar, filtre çipleri, favori yıldızları ve rating emojileri en az **48x48dp (48x48px)** dokunma alanına (hit target) sahip olmalıdır.
- İçi küçük olan ikonlarda (örneğin 18px yıldız) dış padding en az `p-3` (12px) yapılarak 48px dokunma sınırı güvenceye alınacaktır.

### 2.2 Güvenli Alanlar (Safe Area Insets)
- Android sistem çubuğu (Status Bar) ve jest navigasyon çubuğu (Home Indicator) için CSS env değişkenleri eksiksiz desteklenecektir:
  ```css
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
  ```
- Alt navigasyon barı Android jest çubuğunun üzerine binmeyecek şekilde `pb-[calc(env(safe-area-inset-bottom)+8px)]` ile konumlandırılacaktır.

### 2.3 Sistem Çubuğu (Status & Nav Bar) Entegrasyonu
- Android Status Bar: Şeffaf / Yarı Saydam (`#0D0E12`).
- Navigation Bar rengi: `#0D0E12` koyu zemin rengiyle bütünleşik.

### 2.4 Android Donanım Geri Tuşu Desteği (Hardware Back Button)
- Açık bir modal, Bottom Sheet veya açılır menü varken kullanıcının telefonundaki geri tuşuna veya kaydırma jestine basması durumunda sayfadan çıkılmayacak; **önce açık olan modal/sheet kapanacaktır** (`popstate` / `history` yönetimi).

### 2.5 Çevrimdışı & Hata Durumları (Offline & Error States)
- İnternet bağlantısı kesildiğinde veya TMDB yanıt vermediğinde kırık sayfa yerine; "Bağlantı Bekleniyor", "Tekrar Dene" butonlu sinematik boş durumlar (Empty States) gösterilecektir.

### 2.6 İskelet Yükleme Ekranları (Skeleton Screens)
- İçerik yüklenirken dönen çirkin spinner'lar yerine, afiş ve satırların boyutlarına tam uyan zarif parlama efektli (shimmer) iskelet kartlar (`SkeletonMediaCard`) gösterilecektir.

---

## 3. Responsive Kırılma Noktaları (Breakpoint Stratejisi)

| Breakpoint | Cihaz Tipi | Layout Davranışı |
| :--- | :--- | :--- |
| **`< 640px` (390 - 430px)** | Standart ve Büyük Akıllı Telefonlar | Tek sütun dikey akış, 2 sütun poster ızgarası, Kalıcı Bottom Navigation, Bottom Sheet modalları. |
| **`640px - 767px`** | Büyük Telefonlar / Küçük Katlanabilirler | 3 sütun poster ızgarası, yatay satırlarda 3.5 kart önizleme. |
| **`768px - 1023px`** | Tabletler / Katlanabilir Cihazlar | 4 sütun ızgara, genişletilmiş başlık (Header) veya yan çekmece (Side Rail). |
| **`1024px - 1365px`** | Laptop / Masaüstü | 5 sütun ızgara, zengin masaüstü başlığı, hover ile önizleme kartları. |
| **`>= 1366px`** | Geniş Ekranlar / 4K Monitörler | 6 sütun ızgara, max-w-7xl sınırlandırılmış ferah merkez düzen. |

---

## 4. Play Store Pazarlama & Görsel Varlık Yol Haritası

1. **Uygulama İkonu (App Icon & Adaptive Icon):**
   - 512x512px High-Res Icon (Zengin grafit zemin üzerinde canlı kor/amber sinematik 'S' dalgası).
   - Android Adaptive Icon (Foreground katmanı + Background katmanı).
2. **Başlangıç Ekranı (Splash Screen):**
   - Android 12+ Splash Screen API uyumlu merkez logo + akıcı açılış.
3. **Play Store Tanıtım Ekran Görüntüleri (Screenshots - 6 Temel Sahne):**
   - *Sahne 1:* "Zevkini Öğrenen Sinema Rehberi" (Kişisel Karşılama & Eşleşme Skoru)
   - *Sahne 2:* "Film & TV DNA Profilin" (Sinema Kimliği & Zevk Spektrumu)
   - *Sahne 3:* "Sana Özel Öneriler & AI Açıklamaları" (Eşleşme Gerekçeleri)
   - *Sahne 4:* "Kaydırarak Kolayca Kalibre Et" (Tinder-tarzı hızlı oylama)
   - *Sahne 5:* "Kişisel Kütüphanen & 'Bu Akşam Ne İzlesem?'"
   - *Sahne 6:* "Movie Night — Arkadaşınla Ortak Film Bul"
