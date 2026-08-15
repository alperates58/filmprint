# PHASE 9 — RECOMMENDATION BASELINE QUALITY REPORT
**Tarih / Saat**: 2026-08-15T11:56:46.718Z  
**Engine Versiyon**: `Engine_v3.1_Baseline_v31`  
**Mod**: PHASE9_BASELINE  
**Toplam Test Edilen Profil**: 16 (Maturity: 30 — 1500+ etkileşim)  
**Yerel Katalog**: 3335 film (3330 eligible)  

---

## 1. Executive Summary & Composite Scores

| Metrik Grubu | Alt Skor (/100) | Ağırlık | Katkı |
|---|---|---|---|
| **Relevance & Ranking** | 71.9 | 30% | 21.6 |
| **Score Calibration & Monotonicity** | 92.3 | 20% | 18.5 |
| **Home Editorial Category Fit** | 89.5 | 20% | 17.9 |
| **Diversity & Exploration (ILD)** | 80.6 | 15% | 12.1 |
| **Reference Evidence & Grounding** | 96.3 | 10% | 9.6 |
| **Supply & Attrition Health** | 94.4 | 5% | 4.7 |
| **OVERALL QUALITY SCORE** | **84.4 / 100** | 100% | **84.4** |

---

## 2. Global Aggregate Performance Metrics

### A. Relevance & Holdout Retrieval
- **Average Precision@5**: `62.5%`
- **Average Precision@10**: `56.6%`
- **Average Precision@20**: `54.4%`
- **Average Recall@10**: `4.2%`
- **Average Recall@20**: `4.2%`
- **Average Hit Rate@10**: `12.5%`
- **Average MRR**: `0.094`
- **Average NDCG@10**: `0.948`
- **Average NDCG@20**: `0.933`
- **Average Holdout Retrieval Rate**: `4.1%`

### B. Score Calibration & Monotonicity
- **Precision(Match >= 90%)**: `97.1%`
- **Precision(Match >= 85%)**: `77.0%`
- **Precision(Match >= 80%)**: `68.9%`
- **Total False High Scores (Expected 0/1, Match >= 90)**: `11`
- **Total False Low Scores (Expected 3, Match < 70)**: `3`
- **Score Monotonicity Passed Across All Profiles**: `HAYIR (FAIL)`

### C. Diversity, Discovery & Source Distribution
- **Intra-List Diversity (ILD)**: `0.636`
- **Top Genre Concentration Rate**: `33.1%`
- **Candidate Source Distribution**:
  - `KNOWN_UNWATCHED`: `24.0%`
  - `FRESH_DISCOVERY`: `54.0%`
  - `ADJACENT_DISCOVERY`: `22.0%`

### D. Home Categories & Cross-Row Duplication
- **Average Meaningful Home Rows**: `11`
- **Average Category Fit (Context Score)**: `0.94`
- **Cross-Row Duplicate Rate**: `10.6%`
- **Power User (P15) Home Supply Pass (>=5 rows)**: `EVET (PASS)`

### E. Reference Quality & Explanations
- **Total Invalid References (Disliked or Unrated)**: `0` (Hedef: 0)
- **Average Max Reference Overuse Rate**: `10.9%` (Uyarı Eşiği: >30%)

---

## 3. Local Catalog Sizing & Supply Audit

- **Toplam Katalog Film Sayısı**: 3335
- **Eligible Film Sayısı (Recommendation)**: 3330
- **Eligible Film Sayısı (Home Feed)**: 3330
- **Poster & Overview Kapsamı**: Poster %99.9, Overview %99.9
- **Power User (1043 Etkileşim) Kalan Unseen Aday Havuzu**: 2287 film
- **Super Power User (1500 Etkileşim) Kalan Unseen Aday Havuzu**: 1830 film
- **Katalog Supply Durumu**: `[WARNING]`

---

## 4. Per-Profile Detailed Performance Breakdown

| ID | Profil Adı | Etkileşim (W/NW) | Kalan Aday | P@10 | NDCG@10 | Holdout Hit | ILD | 90+ Prec | Home Rows | Skor /100 |
|---|---|---|---|---|---|---|---|---|---|---|
| `P01_BLOCKBUSTER` | Mainstream Blockbuster Lover | 100 (80/20) | 3235 | 100.0% | 0.986 | 0% | 0.637 | 100% | 11 | **94.1** |
| `P02_CRIME_THRILLER` | Crime / Thriller Lover | 150 (120/30) | 3185 | 75.0% | 0.99 | 33% | 0.786 | 100% | 11 | **89.4** |
| `P03_COMEDY` | Comedy Lover | 100 (75/25) | 3235 | 60.0% | 0.882 | 0% | 0.697 | 100% | 11 | **86.6** |
| `P04_PRESTIGE_DRAMA` | Prestige Drama Lover | 200 (160/40) | 3135 | 0.0% | 0.997 | 0% | 0.694 | 100% | 11 | **76.8** |
| `P05_SCIFI_FANTASY` | Sci-Fi / Fantasy Explorer | 250 (200/50) | 3085 | 50.0% | 0.851 | 0% | 0.675 | 100% | 11 | **83.8** |
| `P06_HORROR` | Horror Lover | 120 (90/30) | 3215 | 40.0% | 0.992 | 33% | 0.775 | 100% | 11 | **76.8** |
| `P07_ANIMATION_FAMILY` | Animation & Family Lover | 150 (110/40) | 3185 | 0.0% | 1 | 0% | 0.311 | 100% | 11 | **72.5** |
| `P08_INTERNATIONAL` | International Cinema Explorer | 300 (240/60) | 3035 | 60.0% | 0.665 | 0% | 0.578 | 100% | 11 | **80.1** |
| `P09_CLASSIC_CINEMA` | Classic Cinema Lover | 250 (200/50) | 3085 | 90.0% | 1 | 0% | 0.703 | 100% | 11 | **95.5** |
| `P10_NICHE_ARTHOUSE` | Niche / Arthouse Explorer | 180 (130/50) | 3155 | 0.0% | 1 | 0% | 0.507 | 100% | 11 | **68.1** |
| `P11_MIXED_BALANCED` | Mixed Balanced Viewer | 500 (400/100) | 2835 | 100.0% | 1 | 0% | 0.664 | 100% | 11 | **96.6** |
| `P12_STRONG_NEGATIVE` | Strong Negative Preference User | 150 (100/50) | 3185 | 40.0% | 0.97 | 0% | 0.792 | 100% | 11 | **84.6** |
| `P13_MOSTLY_NOT_WATCHED` | Mostly NOT_WATCHED User | 300 (30/270) | 3035 | 100.0% | 0.972 | 0% | 0.471 | 100% | 11 | **94.9** |
| `P14_SMALL_EVIDENCE` | Small Profile User (30 Items) | 30 (25/5) | 3303 | 50.0% | 0.953 | 0% | 0.774 | 100% | 11 | **86.1** |
| `P15_POWER_USER_1043` | Power User (1043 Evaluated: 177 Watched / 866 Not Watched) | 1043 (177/866) | 2292 | 40.0% | 0.91 | 0% | 0.545 | 63% | 11 | **73.5** |
| `P16_SUPER_POWER_1500` | Super Power User (1500+ Items: 300 Watched / 1200+ Not Watched) | 1500 (300/1200) | 1835 | 100.0% | 1 | 0% | 0.571 | 92% | 11 | **90.2** |

---

## 5. Diagnostic Worst 20 Recommendations (Global Failure Analysis)

| Profil | Film | Skor | TMDB Puan | Kaynak | Beklenen | Seçilen Referans | Hata Nedeni / Açıklama |
|---|---|---|---|---|---|---|---|
| `P15_POWER_USER_1043` | **Mortal Kombat Legends: Battle of the Realms** (2021) | %93 | 7.63 | `FRESH_DISCOVERY` | `0/3` | Adalet Birliği : Apokolips Savaşı | İzlediğin 'Adalet Birliği : Apokolips Savaşı' ile aynı Animasyon, Aksiyon ve Fantezi türlerini paylaşıyor. |
| `P14_SMALL_EVIDENCE` | **Minyonlar ve Canavarlar** (2026) | %89 | 7.337 | `ADJACENT_DISCOVERY` | `0/3` | — | Macera ve karakter odaklı yapımlara verdiğiniz yüksek puanlarla güçlü biçimde örtüşüyor. |
| `P14_SMALL_EVIDENCE` | **Oyuncak Hikayesi 5** (2026) | %89 | 7.41 | `ADJACENT_DISCOVERY` | `0/3` | — | Animasyon ve karakter odaklı yapımlara olan ilginiz, bu filmin sizin için ideal bir seçim olduğunu gösteriyor. |
| `P14_SMALL_EVIDENCE` | **Davet** (2026) | %89 | 7.387 | `ADJACENT_DISCOVERY` | `0/3` | — | Komedi ve karakter odaklı yapımlara verdiğin yüksek puanlarla güçlü biçimde örtüşüyor. |
| `P14_SMALL_EVIDENCE` | **Korkunç Bir Film** (2026) | %88 | 6.466 | `ADJACENT_DISCOVERY` | `0/3` | — | Komedi türündeki bu yapım, karakter odaklı hikayelere verdiğin yüksek puanlarla birebir örtüşüyor. |
| `P14_SMALL_EVIDENCE` | **Şeytan Marka Giyer 2** (2026) | %88 | 7.082 | `ADJACENT_DISCOVERY` | `0/3` | — | Seçim, komedi ve dram türlerindeki karakter gelişimine verdiğin öncelikle uyumlu. |
| `P04_PRESTIGE_DRAMA` | **Kalbin Kırılacak** (2026) | %81 | 7.1 | `ADJACENT_DISCOVERY` | `0/3` | — | Romantik türdeki karakter odaklı yapımlara verdiğiniz yüksek puanlar, bu filmin sizin için güçlü bir eşleşme olduğunu gösteriyor. |
| `P05_SCIFI_FANTASY` | **Dondurmacı** (2026) | %81 | 5.1 | `ADJACENT_DISCOVERY` | `0/3` | — | Korku türündeki güçlü ilginiz, bu filmin gerilim ve atmosfer odaklı yapısıyla doğrudan örtüşüyor. |
| `P05_SCIFI_FANTASY` | **Günahkârlar** (2025) | %76 | 7.503 | `ADJACENT_DISCOVERY` | `0/3` | — | Korku ve karakter odaklı yapımlara verdiğin yüksek puanlar, bu filmin türünün senin zevkine uygun olduğunu gösteriyor. |
| `P05_SCIFI_FANTASY` | **In the Grey** (2026) | %75 | 7.554 | `ADJACENT_DISCOVERY` | `0/3` | — | Aksiyon ve gerilim türlerindeki karakter odaklı anlatım, izleme geçmişindeki güçlü tercihlerle uyum sağlıyor. |
| `P05_SCIFI_FANTASY` | **Tom Clancy'den Jack Ryan: Hayalet Savaş** (2026) | %75 | 7 | `ADJACENT_DISCOVERY` | `0/3` | — | Aksiyon ve gerilim türlerindeki güçlü yapımlara olan ilgin, bu filmin temposu ve çatışma odaklı anlatımıyla birebir örtüşüyor. |
| `P06_HORROR` | **Truva** (2004) | %62 | 7.185 | `ADJACENT_DISCOVERY` | `0/3` | — | Savaş temalı yapımlara olan ilgin, bu filmin epik savaş sahneleriyle birebir örtüşüyor. |
| `P15_POWER_USER_1043` | **Nanatsu no Taizai Movie: Tenkuu no Torawarebito** (2018) | %94 | 7.533 | `FRESH_DISCOVERY` | `1/3` | Adalet Birliği : Apokolips Savaşı | Bu film, beğendiğin Adalet Birliği : Apokolips Savaşı ile aynı türleri (Aksiyon, Macera, Fantezi, Animasyon) paylaşıyor. |
| `P15_POWER_USER_1043` | **Mortal Kombat Legends: Scorpion's Revenge** (2020) | %93 | 8.099 | `KNOWN_UNWATCHED` | `1/3` | Adalet Birliği : Apokolips Savaşı | Adalet Birliği : Apokolips Savaşı filmine verdiğin beğeni, Animasyon ve Aksiyon türlerindeki tercihinle birebir örtüşüyor. |
| `P15_POWER_USER_1043` | **My Hero Academia: Heroes Rising** (2019) | %93 | 8.1 | `KNOWN_UNWATCHED` | `1/3` | Adalet Birliği : Apokolips Savaşı | Beğendiğin 'Adalet Birliği : Apokolips Savaşı' ile aynı Animasyon, Aksiyon, Fantezi ve Macera türlerini paylaşıyor. |
| `P15_POWER_USER_1043` | **Yeşil Yılan** (2021) | %93 | 8.062 | `KNOWN_UNWATCHED` | `1/3` | Adalet Birliği : Apokolips Savaşı | Beğendiğin Adalet Birliği : Apokolips Savaşı ile aynı Animasyon, Fantezi, Aksiyon ve Macera türlerini paylaşıyor, bu yüzden zevkine hitap edecek. |
| `P15_POWER_USER_1043` | **Ay Savaşçısı: Sonsuzluk Film 1 ./ Pretty Guardian Sailor Moon Eternal The Movie Part 1** (2021) | %93 | 7.896 | `KNOWN_UNWATCHED` | `1/3` | Adalet Birliği : Apokolips Savaşı | Bu film, beğendiğin 'Adalet Birliği : Apokolips Savaşı' ile aynı türleri paylaşıyor: Animasyon, Aksiyon ve Fantezi. |
| `P04_PRESTIGE_DRAMA` | **Ateşten Kalbe, Akıldan Dumana** (1998) | %87 | 8.096 | `FRESH_DISCOVERY` | `1/3` | — | Komedi ve suç türlerindeki karakter odaklı anlatımı, zevkine uygun güçlü bir seçim. |
| `P04_PRESTIGE_DRAMA` | **Arkadaşlarım** (1975) | %87 | 8.116 | `FRESH_DISCOVERY` | `1/3` | — | Komedi türündeki karakter odaklı yapımlara verdiğiniz yüksek puanlarla uyumlu. |
| `P04_PRESTIGE_DRAMA` | **Neşeli Günler** (1978) | %87 | 8.229 | `FRESH_DISCOVERY` | `1/3` | — | Komedi ve aile temaları, keyifli vakit geçirme beklentini karşılayacak türde. |

---

## 6. Diagnostic Top 20 Strongest Recommendations (Best Cases)

| Profil | Film | Skor | TMDB Puan | Kaynak | Beklenen | Seçilen Referans |
|---|---|---|---|---|---|---|
| `P15_POWER_USER_1043` | **Gintama : Final - Sonsuza Kadar Yorozuya Olmak** (2013) | %94 | 8 | `KNOWN_UNWATCHED` | `3/3` | Avengers: Sonsuzluk Savaşı |
| `P15_POWER_USER_1043` | **Dragon Ball Super: Broly** (2018) | %94 | 7.951 | `KNOWN_UNWATCHED` | `3/3` | Avengers: Sonsuzluk Savaşı |
| `P16_SUPER_POWER_1500` | **Kırmızı Fenerin Yükselişi** (1991) | %94 | 7.922 | `KNOWN_UNWATCHED` | `3/3` | Kan Dökülecek |
| `P16_SUPER_POWER_1500` | **Kimse Fark Etmiyor** (2004) | %94 | 7.998 | `KNOWN_UNWATCHED` | `3/3` | Front of the Class |
| `P16_SUPER_POWER_1500` | **Benim Yolum** (2011) | %94 | 7.914 | `KNOWN_UNWATCHED` | `3/3` | Woonjunsa Taksi |
| `P16_SUPER_POWER_1500` | **Mükemmel Yabancılar** (2016) | %94 | 7.852 | `KNOWN_UNWATCHED` | `3/3` | Annemle Geçen Yaz |
| `P16_SUPER_POWER_1500` | **Aşka Maruz a.k.a. Love Exposure** (2008) | %94 | 7.922 | `KNOWN_UNWATCHED` | `3/3` | Köşedeki Dükkân |
| `P16_SUPER_POWER_1500` | **Savaş Odası** (2015) | %94 | 7.838 | `KNOWN_UNWATCHED` | `3/3` | Annemle Geçen Yaz |
| `P16_SUPER_POWER_1500` | **Postacı** (1994) | %94 | 7.919 | `KNOWN_UNWATCHED` | `3/3` | Yaşamak |
| `P16_SUPER_POWER_1500` | **Son Veda** (2008) | %94 | 7.849 | `KNOWN_UNWATCHED` | `3/3` | Front of the Class |
| `P16_SUPER_POWER_1500` | **Hatırlıyorum** (1973) | %94 | 7.873 | `KNOWN_UNWATCHED` | `3/3` | Büyük Budapeşte Oteli |
| `P16_SUPER_POWER_1500` | **Unutulmuş Sevgi** (2023) | %94 | 7.827 | `KNOWN_UNWATCHED` | `3/3` | Kalplerimiz Bir |
| `P15_POWER_USER_1043` | **My Hero Academia: World Heroes' Mission** (2021) | %93 | 7.597 | `FRESH_DISCOVERY` | `3/3` | Örümcek-Adam: Örümcek-Evrenine Geçiş |
| `P15_POWER_USER_1043` | **Inuyashiki** (2018) | %93 | 7.681 | `FRESH_DISCOVERY` | `3/3` | Örümcek-Adam: Örümcek-Evrenine Geçiş |
| `P13_MOSTLY_NOT_WATCHED` | **Doctor Who: The Day of the Doctor** (2013) | %92 | 8.188 | `KNOWN_UNWATCHED` | `3/3` | Dune: Part Two |
| `P14_SMALL_EVIDENCE` | **Odyssey** (2026) | %91 | 8 | `ADJACENT_DISCOVERY` | `3/3` | Yüzüklerin Efendisi: Kralın Dönüşü |
| `P14_SMALL_EVIDENCE` | **Amansız** (2026) | %90 | 7.97 | `ADJACENT_DISCOVERY` | `3/3` | Kara Şövalye |
| `P14_SMALL_EVIDENCE` | **Alacaklı** (2026) | %90 | 7.826 | `ADJACENT_DISCOVERY` | `3/3` | Kara Şövalye |
| `P14_SMALL_EVIDENCE` | **Mortal Kombat II** (2026) | %89 | 7.884 | `ADJACENT_DISCOVERY` | `3/3` | — |
| `P13_MOSTLY_NOT_WATCHED` | **Mad Max: Fury Road** (2015) | %88 | 7.636 | `ADJACENT_DISCOVERY` | `3/3` | — |

---

## 7. Failures & Diagnostics Summary

- **Kritik Hatalar (Critical)**: Yok (None)
- **Yüksek Öncelikli Uyarılar (High)**: 
  - ⚠️ Average Precision@10 is below 0.60 threshold (0.566)
  - ⚠️ High false positive rate for 90+ display scores (11 false high candidates)
- **Orta Öncelikli Uyarılar (Medium)**: 
  - ℹ️ Score monotonicity failure detected in one or more profiles
