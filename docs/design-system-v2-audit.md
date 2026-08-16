# SINEAI — Design System V2: Visual & UX Audit Report

**Ürün:** SineAI (Filmprint)  
**Tarih:** 16 Ağustos 2026  
**Doküman:** `docs/design-system-v2-audit.md`  
**Hedef:** Premium Consumer AI Entertainment SaaS & Google Play Store / Mobile-First Redesign

---

## 1. Yönetici Özeti (Executive Summary)

SineAI; Movie Match Engine v3.2, TV Deterministic Recommendation Engine, Hybrid AI Reranker, Recommendation Feedback Learning Loop, Film & TV DNA Profilleme ve Kanonik Kişisel Kütüphane (Personal Library) özellikleri ile teknik ve algoritmik olarak sektör standardında olgun bir tüketici platformuna dönüşmüştür.

Buna karşın mevcut kullanıcı arayüzü (UI) ve kullanıcı deneyimi (UX), ürünün sunduğu gelişmiş yapay zekâ ve kişiselleştirme gücünü tam yansıtamamakta; **aşırı karanlık (#09090b) tekdüze yüzeyler**, **Netflix kırmızısı (#e50914) taklidi hissettiren jenerik vurgu renkleri**, **350'den fazla tüketici arayüzü bileşeninde aşırı küçük ve teknik monospace yazı tipi kullanımı**, **sert 1px border çerçeve yorgunluğu** ve **mobil cihazlarda mobil web/masaüstü pencere gibi davranan navigasyon modelleri** sebebiyle "Premium Consumer SaaS" yerine "Geliştirici Paneli / Jenerik Korsan/Streaming Arayüzü" izlenimi vermektedir.

Google Play Store yayınlanma hedefi doğrultusunda, mobil-öncelikli (mobile-first), dokunma ergonomisine uygun (48dp touch targets), derinlikli yüzey katmanlarına sahip ve özgün bir marka kimliği taşıyan **Design System V2** zorunludur.

---

## 2. Mevcut Mimari & Bileşen Taraması (Inventory Audit)

### 2.1 Renk Tokenları (`app/globals.css` & `tailwind.config.ts`)
- `--background: #09090b` (Zinc-950 tabanlı zifiri karanlık, OLED derinliği sunsa da katman derinliğinden yoksun).
- `--surface: #121216` ve `--surface-elevated: #18181f` (Arka planla arasındaki kontrast farkı çok düşük; yüzeyler birbirinden ayırt edilemiyor).
- `--border: #24242d` ve `--border-focused: #3b3b47` (Neredeyse her kart, input ve badge etrafında yüksek kontrastlı gri çerçeve oluşturuyor).
- `--accent: #e50914` (Netflix'in birebir tescilli kırmızısı; özgün marka kimliğini zedeliyor ve yayın servisi taklidi algısı yaratıyor).
- `--shadow-cinematic: 0 20px 50px rgba(0, 0, 0, 0.7)` (Aşırı koyu ve yayvan tek bir gölge stili; modern katmanlı SaaS gölgelerinden yoksun).

### 2.2 Tipografi Mimarisi
- `font-sans: Inter` ve `font-display: Outfit` tanımlanmış olmasına rağmen, kod tabanında 350'den fazla yerde `font-mono` sınıfı kullanılmış.
- Butonlar (`font-mono text-xs`), navigasyon linkleri, durum rozetleri, kategori sekmeleri ve açıklama metinleri monospace (Consolas/Courier) yazıldığı için tüketici gözünde "terminal / hacker / admin" uygulaması hissi uyandırıyor.
- `text-[9px]` ve `text-[10px]` boyutları mobil ekranlarda okunabilirlik sınırının (12sp/12px) altındadır.

### 2.3 Kart ve Poster Dili (`components/movie/MovieCard.tsx`, `components/tv/TvCard.tsx`, `app/library/page.tsx`)
- Kartlar; 1px gri border (`border border-border/80`), koyu gradient overlay ve çok sayıda küçük pill rozet ile aşırı yüklü.
- Kart üzeri butonlar (özellikle rating seçim çubukları `text-[9px]` ve 24px yükseklik) dokunmatik ekranlar için fazlasıyla küçük ve hatalı tıklamalara açık.
- Hover efektleri desktop için `hover:scale-105` olarak çalışırken mobilde dokunma hissi (active/press state) zayıf kalmaktadır.

### 2.4 Navigasyon ve Mobil Deneyim (`components/ui/Header.tsx`)
- Masaüstünde zengin bir başlık varken, mobilde navigasyon sadece sağ üstteki hamburger (☰) butonuna basıldığında açılan dikey bir açılır menüye indirgenmiş.
- Mobil cihazlarda ve Play Store uygulamasında standart olan **Kalıcı Alt Menü Barı (Bottom Navigation Bar)** bulunmuyor. Tek elle kullanım ergonomisi (Thumb Zone) sağlanamıyor.
- Film ve Dizi mod geçişi küçük bir metin switch'ine sıkıştırılmış.

### 2.5 Detay Modalları (`components/movie/MovieDetailsModal.tsx`, `components/tv/TvDetailsModal.tsx`)
- Mobilde ekranın tamamını kaplayan bir masaüstü modalı penceresi gibi açılıyor.
- iOS/Android standartlarındaki aşağı çekerek kapatma (swipe-to-dismiss gesture), sürükleme çubuğu (drag handle) ve başparmakla erişilebilir eylem çubuğuna sahip **Bottom Sheet** mekanizması eksik.

---

## 3. Mevcut Tasarım Problemleri & Şiddet Değerlendirmesi (Severity Matrix)

| # | Problem Tanımı | Kategori | Şiddet (Severity) | Etki Analizi |
| :--- | :--- | :--- | :--- | :--- |
| **1** | **Netflix Kırmızısı (#e50914) & Jenerik Streaming Algısı** | Brand / Color | 🔴 **HIGH** | SineAI bir streaming sağlayıcısı değil, kişiselleştirilmiş bir yapay zekâ karar motorudur. Kırmızı renk Netflix taklidi algısı yaratıyor. |
| **2** | **Aşırı Karanlık, Düz ve Hiyerarşisiz Yüzey Sistemi** | Visual Depth | 🔴 **HIGH** | `#09090b` ve `#121216` arasındaki yetersiz kontrast, sayfaların katmansız ve "çamurlu" hissettirmesine yol açıyor. |
| **3** | **Tüketici Arayüzünde Yaygın Monospace Font Kullanımı** | Typography | 🔴 **HIGH** | 350+ yerde `font-mono` kullanımı ürünü son kullanıcı eğlence platformu yerine yazılımcı dashboard'u gibi gösteriyor. |
| **4** | **Mobilde Bottom Navigation Bulunmaması & Hamburger Bağımlılığı** | Navigation / UX | 🔴 **HIGH** | Play Store ve Android WebView'da kullanıcı tek elle menülere ulaşamıyor; navigasyon akışı kopuk. |
| **5** | **Dokunma Hedeflerinin (Touch Targets) 48dp Altında Kalması** | Mobile / A11y | 🔴 **HIGH** | Kart üzeri puanlama butonları ve filtre çipleri (`text-[9px]`, 24px) Google Play & Material Design 48dp kuralını ihlal ediyor. |
| **6** | **Aşırı 1px Border Kullanımı ve Çerçeve Yorgunluğu (Border Fatigue)** | UI Hierarchy | 🟡 **MEDIUM** | Sayfadaki her kutunun belirgin gri çizgiyle sınırlandırılması, modern SaaS tasarımlarındaki soft yüzey tonlamasını engelliyor. |
| **7** | **Mobilde Modal Yerine Bottom Sheet Bulunmaması** | Interaction / UX | 🟡 **MEDIUM** | Film ve dizi detaylarına tıklandığında açılan modal mobilde masaüstü penceresi gibi hissettiriyor. |
| **8** | **AI Karar Motoru Hissiyatının (Attio/Linear Polish) Eksikliği** | Visual Polish | 🟡 **MEDIUM** | Öneri motoru, eşleşme puanları ve AI gerekçelendirmeleri yeterince prestijli ve "büyülü" hissettirilmiyor. |
| **9** | **Kalibrasyon Sayfasında Kart Yorgunluğu & Kaydırma (Swipe) Eksikliği** | Onboarding / UX | 🟡 **MEDIUM** | Filmleri değerlendirirken kullanıcıya Tinder/Bumble tarzı akıcı dokunmatik swipe/gestures sunulmuyor; sadece buton tıklaması var. |
| **10** | **Tutarsız Radius ve Hardcoded Stil Çeşitliliği** | Design Tokens | 🟢 **LOW** | `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-full` ad-hoc kullanılmış; tutarlı bir token hiyerarşisi eksik. |

---

## 4. Ekran Bazlı Detaylı Bulgular

### A. Ana Sayfalar (`/` & `/tv`)
- **Hero Bölümü:** Statik poster ve metin düzeni; modern Linear/Spotify tarzı dinamik karşılama veya zengin arka plan atmosferi eksik.
- **Yatay Sıralar:** Netflix satırlarını andıran standart kaydırma listeleri; "Neden bu öneri seçildi?" SaaS kart katmanı yeterince öne çıkmıyor.
- **Rütbe & İlerleme:** Başlıkta küçük bir hap metin olarak sıkışmış durumda.

### B. Kalibrasyon Ekranı (`/calibrate` & `/tv/calibration`)
- Masaüstünde iyi çalışan klavye kısayolları (1-2-3), mobilde devasa buton yığınına dönüşüyor.
- Arka plan çok karanlık ve boş; kullanıcının değerlendirme serisini (streak) ve DNA gelişimini hissettiren dinamik bir mikro-arayüz eksik.

### C. Zevk DNA Profili (`/profile` & `/tv/profile`)
- DNA grafikleri, tür spektrumu ve dönem dağılımı fazla analitik ve dashboard gibi duruyor.
- Kullanıcının "Kişisel Sinema Kimliği" olarak gururla paylaşabileceği (Spotify Wrapped veya Letterboxd tarzı) görsel bir kimlik kartı hissiyatı zayıf.

### D. Kişisel Kütüphane (`/library`)
- Sekmeler ve filtreler mobilde yatay taşma (scroll) yapıyor ancak dokunma ergonomisi zayıf.
- "Bu Akşam Ne İzlesem?" butonu modal olarak açılıyor; mobil bottom sheet'e dönüştürülmeli.

### E. Giriş & Hesap Ekranları (`/auth`, `/account`)
- Standart form kutusu; arkada sinematik bir derinlik veya yapay zekâ karşılama animasyonu yok.
- Google ile Giriş butonu ve form elemanları generic web formu görünümünde.

---

## 5. Sonuç ve Geçiş İhtiyacı

SineAI'ın mevcut kod tabanı işlevsel olarak son derece kararlıdır (tüm testler 100% yeşil, zero TypeScript hatası). İhtiyaç duyulan dönüşüm, backend veya domain mantığını bozmadan; **Design System V2 Mimarisi** ile arayüzün tüketici standartlarına ve Google Play Store kalitesine yükseltilmesidir.
