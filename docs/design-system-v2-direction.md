# SINEAI — Design System V2: Design Direction & Semantic Tokens

**Ürün:** SineAI (Filmprint)  
**Tarih:** 16 Ağustos 2026  
**Doküman:** `docs/design-system-v2-direction.md`  
**Görsel Konsept:** "Premium AI Entertainment SaaS"  
**İlham Kaynakları:** Linear netliği, Attio rafine yüzeyleri, Apple TV görsel özgüveni, Letterboxd kültürel kimliği, Spotify kişiselleştirmesi ve Raycast dokunsal ürün kalitesi.

---

## 1. Tasarım Felsefesi: "Premium AI Entertainment SaaS"

SineAI bir video oynatma / streaming platformu değil; kullanıcının zevkini öğrenen, şeffaf eşleşme skorları üreten ve doğru zamanda doğru içeriği öneren **akıllı bir sinema ve dizi karar motorudur**.

### Temel Prensipler:
1. **İçerik Odaklı Derinlik (Cinematic Canvas):** Zifiri siyah (#000000 / #09090b) yerine, ışığı ve poster renklerini emen zengin grafit (#0D0E12) tonları ve kadife yüzey katmanları.
2. **Yapay Zekâ Rafineliği (Subtle AI Magic):** Göz yoran neon ışıltılar veya jenerik mor/mavi gradyanlar yerine; hassas eşleşme skorları, şık sinematik kor vurguları ve minimal mikrografikler.
3. **Dokunsal Netlik (Tactile Tactility):** 1px sert çizgiler yerine, yüzey ton farkları (`surface-1`, `surface-2`), yumuşak iç ışıklar (subtle inset highlights) ve difüz gölgeler.
4. **Tüketici Odaklı Tipografi (Human-Centric Type):** Monospace fontların teknik alanlara (skor, eşik, süre) hapsedildiği; başlık ve gövde metinlerinde ferah, modern ve okunaklı geometri.
5. **Mobil-Öncelikli Başparmak Ergonomisi (Thumb-Zone First):** 48dp minimum dokunma alanları, alt navigasyon çubuğu ve akıcı bottom sheet etkileşimleri.

---

## 2. Tema & Renk Yönü Değerlendirmesi

Tasarım sistemi için 4 farklı yön analiz edilmiş ve karşılaştırılmıştır:

| Kriter | Yön A: Deep Graphite + Cosmic Coral (Önerilen) | Yön B: Midnight Navy + Indigo/Violet | Yön C: Warm Charcoal + Amber Gold | Yön D: Graphite + Cyan/Blue AI |
| :--- | :--- | :--- | :--- | :--- |
| **Görsel Mood** | Sinematik, sıcak, enerjik, modern | Analitik, soğuk, kurumsal | Klasik, retro, arşivsel | Fütüristik, B2B SaaS, teknik |
| **Premium Algı** | ⭐⭐⭐⭐⭐ (Çok Yüksek) | ⭐⭐⭐⭐ (Yüksek) | ⭐⭐⭐ (Orta - IMDb benzeri) | ⭐⭐⭐ (Geliştirici aracı gibi) |
| **Eğlence Uyumu** | ⭐⭐⭐⭐⭐ (Sinema ve dizi afişleriyle kusursuz uyum) | ⭐⭐⭐ (Fazla teknolojik) | ⭐⭐⭐⭐ (Film için iyi, dizi için zayıf) | ⭐⭐ (Streaming/film için soğuk) |
| **AI Temsili** | ⭐⭐⭐⭐⭐ (Kişiselleştirilmiş canlı sinyal) | ⭐⭐⭐⭐ (Klişe AI moru) | ⭐⭐ (AI hissi vermiyor) | ⭐⭐⭐⭐ (Geleneksel AI mavisi) |
| **Play Store Farklılaşması** | ⭐⭐⭐⭐⭐ (Kırmızı Netflix ve sarı IMDb'den net ayrışır) | ⭐⭐⭐ (Generic SaaS/Crypto) | ⭐⭐ (Letterboxd/IMDb karışımı) | ⭐⭐⭐ (Generic Tech) |
| **WCAG AA Kontrast** | ✅ Tam Uyumlu (%4.5+ oran) | ✅ Tam Uyumlu | ✅ Tam Uyumlu | ✅ Tam Uyumlu |

### Seçilen ve Önerilen Yön: **YÖN A (Deep Graphite & Cosmic Coral / Ember)**
- **Neden?** Netflix kırmızısının çiğliğinden uzak, Letterboxd turuncusundan daha sofistike ve fütüristik bir sinema enerjisi sunar. Afişlerin renk paletleriyle çatışmaz, karanlık modda gözü yormaz ve Google Play Store ikonunda son derece çarpıcı bir kontrast üretir.

---

## 3. Açık Mod (Light Mode) Stratejisi

### Analiz & Karar:
- **Ürün Doğası:** Sinema ve dizi afişleri, fragmanlar ve karanlık oda izleme alışkanlıkları nedeniyle SineAI **"Dark-First"** bir üründür.
- **Mimari Hazırlık:** Design System V2 semantic token mimarisi (`bg-base`, `surface-1`, `surface-2`, `text-primary`, vb.) CSS custom properties üzerinden kurulacaktır. Böylece veritabanı veya bileşen kodlarını değiştirmeden, ileride istendiğinde `data-theme="light"` veya `System Theme` tek bir CSS sınıfı ile devreye alınabilecektir.
- **Fazlama:** Faz 1'de Dark tema mükemmelleştirilecek, CSS tokenları Light temayı destekleyecek şekilde soyutlanacaktır.

---

## 4. Semantic Renk Token Mimarisi (Color Tokens V2)

### 4.1 Yüzey ve Arka Plan Katmanları (Dark Mode Canvas)
```css
/* Base Canvas */
--bg-base: #0D0E12;          /* Zengin grafit ana arka plan */
--bg-subtle: #12141A;        /* İkincil hafif koyu zemin */

/* Surface Elevation Hierarchy */
--surface-1: #161820;        /* 1. Seviye kartlar, paneller */
--surface-2: #1D202B;        /* 2. Seviye yükseltilmiş yüzeyler, hover durumları */
--surface-3: #252936;        /* 3. Seviye açılır menüler, modal zeminleri */
--surface-glass: rgba(22, 24, 32, 0.75); /* Blur efektli cam yüzeyler */

/* Borders & Dividers */
--border-subtle: rgba(255, 255, 255, 0.07); /* Yumuşak ayıraçlar */
--border-strong: rgba(255, 255, 255, 0.14); /* Aktif kart sınırları */
--border-accent: rgba(255, 85, 62, 0.35);    /* Vurgulu kenar çizgisi */
```

### 4.2 Marka & Vurgu Renkleri (Cosmic Coral & Amber Ember)
```css
--accent-primary: #FF553E;      /* Ana marka kor mercanı (Cosmic Coral) */
--accent-hover: #FF6E5B;        /* Hover durumu */
--accent-subtle: rgba(255, 85, 62, 0.12); /* Rozet ve buton arka planları */
--accent-secondary: #FFA337;    /* Sinematik altın kehribar (AI Glow / Stars) */
--accent-glow: 0 0 24px rgba(255, 85, 62, 0.25); /* Prestijli AI parıltısı */
```

### 4.3 Tipografi & Metin Renkleri
```css
--text-primary: #FFFFFF;        /* Başlıklar, öne çıkan metinler */
--text-secondary: #9DA4B5;      /* Gövde açıklamaları, filtre etiketleri */
--text-tertiary: #656C7D;       /* Dipnotlar, tarih ve metadata */
--text-on-accent: #FFFFFF;      /* Vurgu butonu üzerindeki metin */
```

### 4.4 Durum & Geri Bildirim Renkleri (Functional Feedback)
```css
--status-love: #FF3B69;         /* Çok Sevdim (Love) */
--status-like: #00D09C;         /* Beğendim / Eşleşme Skoru (Emerald) */
--status-neutral: #FFA337;      /* Ortalama (Amber) */
--status-dislike: #6B7280;      /* Sevmedim (Slate) */
--status-watchlist: #3B82F6;    /* İzleme Listesi (Blue) */
--status-dropped: #EF4444;      /* Bıraktım (Red) */
```

---

## 5. Tipografi Mimarisi (Typography Scale V2)

### 5.1 Yazı Tipi Ailesi Rolleri
- **Display & Başlıklar (`font-display`):** `Outfit, sans-serif` (Modern, geometrik, sinematik enerji).
- **Gövde Metinleri & Arayüz (`font-sans`):** `Inter, -apple-system, sans-serif` (Yüksek bacak açıklığı, optik netlik).
- **Teknik Veri & Skorlar (`font-mono`):** `JetBrains Mono, SF Mono, Consolas, monospace` (Sadece sayısal skorda, DNA formülünde ve rütbe eşiklerinde).

### 5.2 Tipografi Ölçeği

| Token | Boyut / Line-Height | Weight | Font Ailesi | Kullanım Alanı |
| :--- | :--- | :--- | :--- | :--- |
| **`text-display-2xl`** | 36px / 44px (md: 48px/56px) | Bold (700) | `font-display` | Hero karşılama, Ana kampanya |
| **`text-display-xl`** | 28px / 36px (md: 36px/44px) | Bold (700) | `font-display` | Sayfa ana başlıkları (H1) |
| **`text-title-lg`** | 20px / 28px (md: 24px/32px) | SemiBold (600) | `font-display` | Modül başlıkları, modal başlığı |
| **`text-title-md`** | 16px / 24px | SemiBold (600) | `font-sans` | Kart başlıkları, sekme başlıkları |
| **`text-body-base`** | 14px / 20px (md: 15px/22px) | Regular / Med | `font-sans` | Özet metinleri, açıklamalar |
| **`text-body-sm`** | 13px / 18px | Regular (400) | `font-sans` | İkincil bilgiler, meta satırları |
| **`text-caption`** | 11px / 16px | Medium (500) | `font-sans` | Rozetler, kategori etiketleri |
| **`text-mono-stat`** | 12px / 16px | Bold (700) | `font-mono` | %94 Uyum, 353/400 Film Sayacı |

---

## 6. Yeni Kart Tasarım Dili (Media Cards V2)

### 6.1 Boyut ve Oran Standartları
- **Poster Oranı:** 2:3 standart sinematik dikey oran.
- **Köşe Yuvarlaklığı:** `16px` (`rounded-2xl`).
- **Yüzey Ayrımı:** Sert 1px border yerine; `bg-surface-1`, iç hat vurgusu (`inset 0 1px 0 rgba(255,255,255,0.08)`) ve yumuşak alt gölge.

### 6.2 Kart Katmanları
1. **Görsel Katmanı:** Tam kaplama poster, üst/alt dinamik karartma (gradient scrim).
2. **Sağ Üst Rozet (Match Score):** Yarı saydam cam zemin (`backdrop-blur-md`), zümrüt/kor yeşili `%88 UYUM` göstergesi.
3. **Sağ Üst Favori Yıldızı:** Dokunmatik tek tık favori tetikleyicisi (44x44px minimum dokunma alanı).
4. **Alt Bilgi Katmanı:** 2 satırlı net başlık, çıkış yılı + ana tür.
5. **Mobil Eylem Çubuğu:** Kartın üzerine tıklandığında doğrudan açılan akıcı Bottom Sheet.

---

## 7. Sayfa Bazlı Yeni Tasarım Şablonları

### 7.1 Keşif & Ana Sayfa (`/` & `/tv`)
- **Kişisel Karşılama Hero'su:** "İyi akşamlar Alper, bu akşam zevkine en uygun 1 yapım seçildi."
- **Profil Olgunluk & Kalibrasyon Çubuğu:** Minimalist, oyunlaştırılmış ama sadeleştirilmiş rütbe ilerleme bandı.
- **Akıllı Satırlar:** 
  - 🔖 *İzleme Listenden Öne Çıkanlar*
  - ✨ *%90+ Zevk Eşleşmeleri*
  - 🎬 *Interstellar Sevdiğin İçin Önerilenler*
  - 💎 *Gözden Kaçan Cevherler (Hidden Gems)*

### 7.2 Kalibrasyon Deneyimi (`/calibrate` & `/tv/calibration`)
- **Tinder-Tarzı Akıcı Kart (Mobile Swipe Gesture):** Sağa kaydır: İzledim (Puanla), Sola kaydır: İzlemedim, Yukarı kaydır: Emin Değilim.
- **Masaüstü Klavye Erişilebilirliği:** 1-2-3 ve Yön Tuşları ile klavyeden ayrılmadan saniyede 1 film değerlendirme hızı.
- **Dinamik Arka Plan:** Değerlendirilen filmin arka plan görseli ile tüm sayfa zemininde hafif sinematik ambiyans aydınlatması.

### 7.3 Zevk DNA Profili (`/profile` & `/tv/profile`)
- **"Sinema Kimlik Kartı" (Shareable Taste Identity):** Spotify Wrapped benzeri, paylaşılabilir görsel kimlik kartı.
- **Tür ve Dönem Spektrumu:** Karmaşık çubuk grafikler yerine, modern renkli spektrum bantları ve radar/akış grafikleri.
- **Yapay Zekâ İçgörüleri:** DeepSeek tarafından üretilen doğal dilli zevk analitiği ("Karanlık atmosferli bilimkurgu ve psikolojik gerilim tutkunu").

### 7.4 Kişisel Kütüphane (`/library`)
- **Editöryel Koleksiyon Görünümü:** Poster ızgarası + Kompakt liste görünümü geçişi.
- **"Bu Akşam Ne İzlesem?" Sihirbazı:** Kullanıcının mevcut moduna (Hızlı, Derin, Eğlenceli) göre izleme listesinden anında 1 yapım seçen akıllı çark.

---

## 8. Bileşen Envanteri & Varyant Matrisi (Primitive Inventory)

| Bileşen | Varyantlar | Durumlar (States) |
| :--- | :--- | :--- |
| **`Button`** | `primary`, `secondary`, `outline`, `ghost`, `danger` | Default, Hover, Active/Press, Disabled, Loading |
| **`IconButton`** | `surface`, `ghost`, `accent` (44x44px min) | Default, Hover, Active, Selected |
| **`MediaCard`** | `poster-vertical`, `backdrop-horizontal`, `compact-row` | Default, Hover-Elevated, Selected, Loading Skeleton |
| **`ScoreBadge`** | `high` (90+), `medium` (75-89), `low` (<75) | Compact, Expanded with Reason |
| **`BottomSheet`** | `peek` (40%), `full` (90%) | Closed, Opening, Dragging, Open |
| **`SegmentedControl`** | `film-tv-toggle`, `library-tabs` | Active pill transition, Hover |
| **`RatingBar`** | `4-point` (Love, Like, Neutral, Dislike) | Default, Selected, Animated Feedback |
| **`BottomNav`** | 5-Tab Fixed Glass Bar | Active icon + label, Inactive |

---

## 9. Hareket & Geçiş Prensipleri (Motion V2)

- **Süre Standartları:** 140ms – 220ms (Asla 300ms üzeri hantal animasyon yok).
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` (Apple/Linear tarzı yumuşak yaylanma).
- **Performans:** Yalnızca GPU hızlandırmalı `transform` ve `opacity` özellikleri; ağır `filter: blur()` animasyonlarından kaçınılmalıdır.
- **Erişilebilirlik:** `prefers-reduced-motion: reduce` medya sorgusunda animasyonlar sıfırlanmalıdır.
