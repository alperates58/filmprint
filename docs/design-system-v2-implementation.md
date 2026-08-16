# SineAI Design System V2: Tam Frontend Modernizasyon Dokümanı

## 1. Giriş ve Amaç
SineAI platformunun (Filmprint) genel görsel dili, generic/koyu developer dashboard görünümünden, Google Play Store ve modern mobil web standartlarına uygun **"Premium AI Entertainment SaaS"** kimliğine yükseltilmiştir.

---

## 2. Tasarım Temelleri ve Token Mimarisi

### Renk Paleti
- **Base Canvas:** Deep Midnight Navy (`#0B0D14` / `--bg-base`)
- **Yüzey Katmanları:**
  - `surface-1` (`#121622`): Kart zeminleri, modüller
  - `surface-2` (`#191E2D`): İç kaplamalar, haplar, ikincil butonlar
  - `surface-3` (`#22283A`): Hover/aktif durumlar, vurgulu paneller
- **Primary AI Identity:** Indigo / Violet (`#7C5CFC` / `--accent`)
- **Secondary Warm Accent:** Coral / Ember (`#FF654F` / `--accent-secondary`) (Film geceleri, editöryel dokunuşlar)
- **Success / High Match:** Emerald (`#28D7A1` / `--success`) (%90+ eşleşmeler)

### Tipografi Hiyerarşisi
- **Display / Başlıklar:** `Outfit` (Modern, net, geometrik)
- **Arayüz & Metinler:** `Inter` (Okunaklı, geniş harf aralıklı)
- **Monospace:** Sadece sayısal skorlar, kodlar ve kesin metrikler için sınırlandırıldı.

---

## 3. Tamamlanan Fazlar

### Phase A + B: Tokens & Navigation Shell
- 5 sekmeli cam efektli mobil alt bar ([`BottomNav.tsx`](file:///c:/Users/alper/Desktop/filmprint/components/ui/BottomNav.tsx))
- Masaüstü Header V2
- Navigation Semantics Regresyon Koruması:
  - Film modu: "Filmlerim" -> `/library?mediaType=FILM`
  - TV modu: "Dizilerim" -> `/library?mediaType=TV`
  - Profil menüsü: "Tüm Kütüphanem" -> `/library`

### Phase C1 + C2: Home & Recommendations Redesign
- [`MediaCard.tsx`](file:///c:/Users/alper/Desktop/filmprint/components/ui/MediaCard.tsx): 2:3 standart oran, 16px radius, dokunmatik basma animasyonu.
- [`ScoreBadge.tsx`](file:///c:/Users/alper/Desktop/filmprint/components/ui/ScoreBadge.tsx): Dinamik eşleşme güven rozeti (%90+ Zümrüt, %75-89 Indigo, %60-74 Amber).
- [`SectionHeader.tsx`](file:///c:/Users/alper/Desktop/filmprint/components/ui/SectionHeader.tsx): Editöryel kategori başlığı ve rozet.
- [`DiscoveryHome.tsx`](file:///c:/Users/alper/Desktop/filmprint/components/home/DiscoveryHome.tsx) & [`TvDiscoveryHome.tsx`](file:///c:/Users/alper/Desktop/filmprint/components/tv/TvDiscoveryHome.tsx): 2 sütunlu karşılama ve akıllı modlar.
- [`RecommendationGrid.tsx`](file:///c:/Users/alper/Desktop/filmprint/components/recommendation/RecommendationGrid.tsx) & [`TvRecommendationGrid.tsx`](file:///c:/Users/alper/Desktop/filmprint/components/tv/TvRecommendationGrid.tsx): Kompakt filtre çubuğu, 2-5 sütunlu responsive ızgara ve 6sn geri alma (Undo) bildirimi.

### Phase D: Calibration Redesign
- [`MovieCard.tsx`](file:///c:/Users/alper/Desktop/filmprint/components/movie/MovieCard.tsx) & [`TvCard.tsx`](file:///c:/Users/alper/Desktop/filmprint/components/tv/TvCard.tsx): Ambiyans arka plan ışığı, 48dp karar butonları, 1-2-3-4 klavye kısayolları ve Step 1 (İzledim/İzlemedim/Emin Değilim) -> Step 2 (Puanlama) akışı.
- [`CalibrationEngine.tsx`](file:///c:/Users/alper/Desktop/filmprint/components/movie/CalibrationEngine.tsx) & [`TvCalibrationEngine.tsx`](file:///c:/Users/alper/Desktop/filmprint/components/tv/TvCalibrationEngine.tsx): Anlık rütbe hedefi göstergesi, kutlama ekranı ve boş sıra fallback'leri.

### Phase E: DNA Profiles Redesign
- [`GenreSignature.tsx`](file:///c:/Users/alper/Desktop/filmprint/components/profile/GenreSignature.tsx): Renkli afinite spektrumu.
- [`EraSignature.tsx`](file:///c:/Users/alper/Desktop/filmprint/components/profile/EraSignature.tsx): Dönem kartları.
- [`TasteTraits.tsx`](file:///c:/Users/alper/Desktop/filmprint/components/profile/TasteTraits.tsx): Sinematik karakter özellikleri.
- [`FilmJourney.tsx`](file:///c:/Users/alper/Desktop/filmprint/components/profile/FilmJourney.tsx) & [`TvJourney.tsx`](file:///c:/Users/alper/Desktop/filmprint/components/profile/TvJourney.tsx): 19 Film ve 16 Dizi rütbesini listeleyen kariyer merdiveni.
- [`app/profile/page.tsx`](file:///c:/Users/alper/Desktop/filmprint/app/profile/page.tsx) & [`app/tv/profile/page.tsx`](file:///c:/Users/alper/Desktop/filmprint/app/tv/profile/page.tsx): Kişisel kimlik ve kütüphane özeti kartları.

### Phase F: Personal Library Redesign
- [`app/library/page.tsx`](file:///c:/Users/alper/Desktop/filmprint/app/library/page.tsx):
  - Medya Seçici: Tümü / Filmler / Diziler
  - Durum Sekmeleri: İzleme Listem (🔖), İzlediklerim (👁️), Favorilerim (⭐), Bıraktıklarım (🚫), Tümü (📁)
  - "Bu Akşam Ne İzlesem?" akıllı çekiliş modülü ve sonuç vitrini
  - Kanonik `UserContentLibrary` aksiyonları ve satır içi puanlama

### Phase G: Detail Modals & Mobile Bottom Sheets
- [`MovieDetailsModal.tsx`](file:///c:/Users/alper/Desktop/filmprint/components/movie/MovieDetailsModal.tsx) & [`TvDetailsModal.tsx`](file:///c:/Users/alper/Desktop/filmprint/components/tv/TvDetailsModal.tsx):
  - Masaüstünde geniş sinematik modal
  - Mobilde yerel dokunmatik Bottom Sheet (sürükleme çubuğu, aşağı çekip kapatma hareketi)
  - Android/Tarayıcı donanımsal geri tuşuna basıldığında sayfadan çıkmak yerine önce sheet'i kapatma (`window.history.pushState` / `popstate` entegrasyonu).

### Phase H: Mobile & Play Store Polish
- 48dp dokunmatik hedef uyumluluğu
- `env(safe-area-inset-top)` ve `env(safe-area-inset-bottom)` tam desteği
- `public/manifest.webmanifest` (#0b0d14 tema ve arka plan rengi)
