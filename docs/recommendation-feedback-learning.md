# Recommendation Feedback Learning Loop (Movie + TV) — Phase 10

## 1. Genel Bakış ve Mimari

Filmprint / SineAI Öneri Motoru, kullanıcının öneri kartları ve detay modalları üzerindeki gerçek davranışlarını (`LIKE`, `DISLIKE`, `HIDE`, `WATCHLIST`, `WATCHED`, `CLEAR`) kalıcı geri bildirim sinyallerine dönüştürerek çift yönlü bir öğrenme döngüsü oluşturur.

```
+-----------------------------------------------------------------------------------+
|                           ÖNERİ VE GERİ BİLDİRİM DÖNGÜSÜ                          |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [Kullanıcı Geri Bildirimi]                                                        |
|   ├── 👍 LIKE        ───> Pozitif benzerlik sinyali (+6.0 direct / +8.0 similarity)|
|   ├── 👎 DISLIKE     ───> Negatif benzerlik sinyali (-15.0 direct / -12.0 penalty)|
|   ├── 🚫 HIDE        ───> Sert Dışlama (Hard Exclusion - Bir daha ASLA önerilmez) |
|   ├── 🔖 WATCHLIST   ───> Yüksek niyet sinyali (+10.0 direct / +10.0 similarity)  |
|   └── 👁️ WATCHED     ───> Canonical etkileşim güncellemesi + Hard Exclusion       |
|                                     │                                             |
|                                     ▼                                             |
|                     [POST /api/recommendation-feedback]                           |
|                                     │                                             |
|                                     ▼                                             |
|                    [Single-Batch Profile Aggregation]                             |
|              (buildUserFeedbackProfile / buildTvFeedbackProfile)                  |
|                                     │                                             |
|                                     ▼                                             |
|                       [Recommendation Pipeline]                                   |
|   1. Aday Havuzu (Exclusions: WATCHED, HIDE elenir)                               |
|   2. Deterministik Puanlama (calculateMovieMatch / calculateTvMatch)              |
|   3. Feedback Skor Ayarlaması (Feature-level Similarity Adjustment)               |
|   4. Shortlist Gate (>= 65)                                                       |
|   5. DeepSeek Batch Reranker (Kompakt feedbackSignals prompt özeti)               |
|   6. Kalibre Hibrit Puanlama + Çeşitlilik Sıralaması                              |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```

---

## 2. Eylem Semantikeri ve Ağırlık Kuralları

| Eylem | Kullanıcı Arayüzü | Deterministik Etki | Benzer İçerik Etkisi | Öneri Havuzundan Çıkarılma |
| :--- | :--- | :---: | :---: | :---: |
| **`LIKE`** | 👍 *İlgimi Çekti* | `+6.0` puan | Tür: `+1.5`, Yönetmen: `+3.0`, Anahtar Kelime: `+1.0`, Dönem: `+1.0` | ❌ Kalır / Önceliklenir |
| **`WATCHLIST`** | 🔖 *Listeme Ekle* | `+10.0` puan | Tür: `+2.0`, Yönetmen: `+4.0`, Anahtar Kelime: `+1.5`, Dönem: `+1.5` | ❌ Kalır / Önceliklenir |
| **`DISLIKE`** | 👎 *İlgimi Çekmedi* | `-15.0` puan | Tür: `-2.0`, Yönetmen: `-4.0`, Anahtar Kelime: `-1.5`, Dönem: `-1.0` | ❌ Baskılanır (Floor altı elenir) |
| **`HIDE`** | 🚫 *Bunu Önerme* | N/A | N/A | ✅ **Sert Dışlama (Hard Excluded)** |
| **`WATCHED`** | 👁️ *İzledim* | Rating bağlı | Canonical etkileşime yazılır (`MovieInteraction`/`TvInteraction`) | ✅ **Sert Dışlama (Hard Excluded)** |
| **`CLEAR`** | *Geri Al / Kaldır* | N/A | Feedback kaydı silinir, etki sıfırlanır | ❌ Nötr hale döner |

---

## 3. Güvenlik ve Doygunluk Kalkanları (Guardrails)

1. **Sıkıştırma ve Kırpma (Clamping)**:
   - Tek bir içerik için toplam feedback ayarlaması `[-15, +10]` aralığına sıkıştırılır.
   - Hiçbir feedback, içerik kalitesini veya deterministik temel DNA uyumunu tek başına tamamen ezemez.
2. **Örnekleme Sönümlemesi (Shrinkage Damping)**:
   - Tek bir DISLIKE tüm türü veya yönetmeni öldürmez (`count === 1` durumunda `%40-50` sönümleme uygulanır).
   - Logaritmik/doygunluk mekanizması ile 10 LIKE sonsuz puan üretmez.
3. **Zaman Aşımı ve Eskime (Recency Decay)**:
   - `0 – 30 gün`: `1.0x` tam ağırlık.
   - `31 – 90 gün`: `0.75x` ağırlık.
   - `90+ gün`: `0.50x` ağırlık.
4. **Cold Start Garantisi (0-Feedback Invariance)**:
   - Geri bildirimi olmayan kullanıcılarda feedback ayarlaması kesin olarak `0` döner.
   - Eski ve yeni öneri sonuçları %100 özdeştir.

---

## 4. Hibrit Yapay Zeka (DeepSeek) Entegrasyonu

- Batch Reranker prompt payload'una kompakt `feedbackSignals` (`recentLikes`, `recentDislikes`, `recentWatchlist`) eklenir.
- DeepSeek çevrimdışı olsa veya API hatası verse dahi deterministik feedback öğrenme motoru kesintisiz çalışmaya devam eder.

---

## 5. Phase 11 ve Phase 12 Gelecek Yol Haritası

- **Phase 11 (Personal Library)**: `WATCHLIST` eylemi, ileride oluşturulacak generic `ContentLibrary` modeli ile tam iki yönlü senkronizasyona taşınacaktır.
- **Phase 12 (A/B Analytics & Impression Tracking)**: Kart gösterim sayıları (impressions) ve A/B dönüşüm testleri genişletilecektir.
