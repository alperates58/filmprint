# SineAI / Filmprint — Personal Library, Watchlist & Viewing States (Movie + TV)

## 1. Genel Bakış

Phase 11 ile birlikte SineAI, geçici geri bildirim (feedback) odaklı izleme listesi yapısını terk ederek **Movie ve TV** içerikleri için birinci sınıf, kalıcı, kanonik bir **Kişisel Kütüphane (Personal Library)** etki alanı modeline geçmiştir (`UserContentLibrary`).

Kullanıcılar kütüphanelerinde Film ve Dizi içeriklerini bağımsız durumlar ve favori bayrağı ile yönetebilir.

---

## 2. Kanonik Veri Modeli (`UserContentLibrary`)

### Prisma Şeması

```prisma
enum LibraryState {
  WATCHLIST
  WATCHED
  DROPPED
}

model UserContentLibrary {
  id         String       @id @default(uuid())
  userId     String
  mediaType  MediaType    @default(FILM)
  movieId    String?
  tvShowId   String?
  state      LibraryState @default(WATCHLIST)
  isFavorite Boolean      @default(false)
  addedAt    DateTime     @default(now())
  updatedAt  DateTime     @updatedAt
  watchedAt  DateTime?
  droppedAt  DateTime?
  metadata   Json         @default("{}")

  user   User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  movie  Movie?  @relation(fields: [movieId], references: [id], onDelete: Cascade)
  tvShow TvShow? @relation(fields: [tvShowId], references: [id], onDelete: Cascade)

  @@unique([userId, movieId])
  @@unique([userId, tvShowId])
  @@index([userId])
  @@index([mediaType])
  @@index([state])
  @@index([isFavorite])
  @@index([userId, mediaType, state])
  @@index([userId, isFavorite])
}
```

### Durum Semantiği

| Durum / Bayrak | Anlamı | Öneri Motoru Etkisi |
| :--- | :--- | :--- |
| **`WATCHLIST`** | "İzleme Listem" — İzlenmesi planlanan yüksek niyetli yapım. | Pozitif niyet sinyali (+10.0), zevk profiline benzerlik beslemesi. |
| **`WATCHED`** | "İzlediklerim" — Kullanıcı tarafından tamamlanmış yapım. | Öneri aday havuzundan sert dışlama (`excludedMovieIds` / `excludedShowIds`). |
| **`DROPPED`** | "Bıraktıklarım" — Başlanmış ancak devam edilmek istenmeyen yapım. | Öneri aday havuzundan sert dışlama + negatif özellik cezası (-15.0). |
| **`isFavorite: true`** | "Favorilerim" — Kullanıcının en sevdikleri (ortogonal bayrak). | Güçlü pozitif benzerlik öğrenmesi (+10.0 / +12.0) ve üst sıralama önceliği. |

---

## 3. Kanonik Senkronizasyon (Tek Gerçek Kaynak)

Kullanıcı derecelendirmeleri (`LOVE`, `LIKE`, `NEUTRAL`, `DISLIKE`) ve kalibrasyon geçmişi için `MovieInteraction` ve `TvInteraction` modelleri birincil derecelendirme otoritesidir.

Kullanıcı bir yapımı **`WATCHED`** olarak işaretlediğinde:
1. `MovieInteraction` (veya `TvInteraction`) tek bir atomik transaction içinde güncellenir/oluşturulur.
2. `UserContentLibrary` kaydı `state: WATCHED` ve `watchedAt: now()` olarak güncellenir.
3. `RecommendationFeedback` / `TvRecommendationFeedback` analitik anlık görüntüsü (`action: WATCHED_FROM_RECOMMENDATION`) kaydedilir.

---

## 4. API Uç Noktaları

### `GET /api/library`
Kullanıcının kütüphane içeriklerini filtreleme, arama, sıralama ve sayfalama ile listeler.

**Query Parametreleri:**
- `mediaType`: `FILM | TV | ALL` (Varsayılan: `ALL`)
- `state`: `WATCHLIST | WATCHED | DROPPED | ALL` (Varsayılan: `ALL`)
- `isFavorite`: `true | false` (Opsiyonel)
- `search`: Başlık / orijinal başlık metin araması
- `rating`: `LOVE | LIKE | NEUTRAL | DISLIKE | ALL`
- `sort`: `newest | oldest | title` (Varsayılan: `newest`)
- `page`: Sayfa numarası (Varsayılan: `1`)
- `limit`: Sayfa başı kayıt (Varsayılan: `24`, Maksimum: `50`)

**Dönüş:**
```json
{
  "items": [...],
  "totalCount": 42,
  "totalPages": 2,
  "currentPage": 1,
  "counts": {
    "total": 42,
    "watchlist": 18,
    "watched": 20,
    "dropped": 4,
    "favorites": 12,
    "films": { "total": 24, "watchlist": 10, "watched": 12, "dropped": 2, "favorites": 7 },
    "tv": { "total": 18, "watchlist": 8, "watched": 8, "dropped": 2, "favorites": 5 }
  }
}
```

### `POST /api/library`
Kütüphane durumunu günceller.

**Body Parametreleri:**
```json
{
  "mediaType": "FILM", // "FILM" | "TV"
  "contentId": "movie-uuid-or-tv-uuid",
  "action": "ADD_WATCHLIST", // "ADD_WATCHLIST" | "REMOVE_WATCHLIST" | "MARK_WATCHED" | "MARK_DROPPED" | "ADD_FAVORITE" | "REMOVE_FAVORITE" | "CLEAR_STATE"
  "rating": "LOVE" // Opsiyonel (MARK_WATCHED durumunda: "LOVE" | "LIKE" | "NEUTRAL" | "DISLIKE")
}
```

### `GET /api/library/tonight`
"Bu Akşam Ne İzlesem?" akıllı seçim motoru. Kullanıcının izleme listesindeki yapımları DNA profili ile eşleştirerek en uygun 1–3 adayı deterministik olarak seçer.

---

## 5. UI ve Kullanıcı Deneyimi

1. **/library Sayfası:**
   - **Sekmeler:** *İzleme Listem* (🔖), *İzlediklerim* (👁️), *Favorilerim* (⭐), *Bıraktıklarım* (🚫), *Tümü* (📁).
   - **Medya Değiştirici:** *Tümü*, *Filmler*, *Diziler*.
   - **"Bu Akşam Ne İzlesem?" Butonu:** İzleme listesinden anında akşam önerisi pop-up'ı.
   - **Kart Üzeri Hızlı Eylemler:** Favori yıldızı, izlendi/puanla butonu, listeden kaldır/sil.
2. **Navigasyon (`Header.tsx`):**
   - Masaüstü ve mobilde doğrudan **"Kütüphanem"** bağlantısı (`/library`).
3. **Film Detay Modalı (`MovieDetailsModal.tsx`):**
   - Favori yıldızı, İzleme Listesi butonu, İzlendi puanlama çubuğu, Bıraktım aksiyonu.
4. **Ana Sayfa Entegrasyonu (`DiscoveryHome` & `TvDiscoveryHome`):**
   - İzleme listesinde yapım bulunan kullanıcılara ana sayfada otomatik **"İzleme Listenden"** satırı gösterilir.

---

## 6. Doğrulama ve Güvenlik

- **Çift Sayım Koruması:** `buildUserFeedbackProfile` ve `buildTvFeedbackProfile`, `UserContentLibrary` kayıtlarını birincil kaynak olarak işler ve aynı yapım için eski feedback kayıtlarını atlayarak çift puan eklenmesini önler.
- **İdempotent Backfill:** `backfillLegacyWatchlistToLibrary` fonksiyonu ile mevcut `RecommendationFeedback` verileri veri kaybı olmadan `UserContentLibrary`'e taşınabilir.
