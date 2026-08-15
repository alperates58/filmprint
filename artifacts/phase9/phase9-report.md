# PHASE 9 — RECOMMENDATION QUALITY VALIDATION & TUNING REPORT
**Tarih / Saat**: 2026-08-15T11:59:51.503Z  
**Engine Versiyon**: `Engine_v3.2_Tuned_v32`  
**Mod**: POST_TUNING_VERIFICATION  
**Toplam Test Edilen Profil**: 16 (Maturity: 30 — 1500+ etkileşim)  
**Yerel Katalog**: 3335 film (3330 eligible)  

---

## 1. Executive Summary & Composite Scores

| Metrik Grubu | Alt Skor (/100) | Ağırlık | Katkı |
|---|---|---|---|
| **Relevance & Ranking** | 73.4 | 30% | 22.0 |
| **Score Calibration & Monotonicity** | 86.3 | 20% | 17.3 |
| **Home Editorial Category Fit** | 89.6 | 20% | 17.9 |
| **Diversity & Exploration (ILD)** | 79.1 | 15% | 11.9 |
| **Reference Evidence & Grounding** | 96.3 | 10% | 9.6 |
| **Supply & Attrition Health** | 95.3 | 5% | 4.8 |
| **OVERALL QUALITY SCORE** | **83.5 / 100** | 100% | **83.5** |

---

## 2. Global Aggregate Performance Metrics

### A. Relevance & Holdout Retrieval
- **Average Precision@5**: `68.8%`
- **Average Precision@10**: `63.1%`
- **Average Precision@20**: `60.9%`
- **Average Recall@10**: `4.2%`
- **Average Recall@20**: `4.2%`
- **Average Hit Rate@10**: `12.5%`
- **Average MRR**: `0.047`
- **Average NDCG@10**: `0.888`
- **Average NDCG@20**: `0.86`
- **Average Holdout Retrieval Rate**: `4.1%`

### B. Score Calibration & Monotonicity
- **Precision(Match >= 90%)**: `97.6%`
- **Precision(Match >= 85%)**: `80.4%`
- **Precision(Match >= 80%)**: `67.4%`
- **Total False High Scores (Expected 0/1, Match >= 90)**: `5`
- **Total False Low Scores (Expected 3, Match < 70)**: `5`
- **Score Monotonicity Passed Across All Profiles**: `HAYIR (FAIL)`

### C. Diversity, Discovery & Source Distribution
- **Intra-List Diversity (ILD)**: `0.619`
- **Top Genre Concentration Rate**: `34.0%`
- **Candidate Source Distribution**:
  - `KNOWN_UNWATCHED`: `23.0%`
  - `FRESH_DISCOVERY`: `51.0%`
  - `ADJACENT_DISCOVERY`: `26.0%`

### D. Home Categories & Cross-Row Duplication
- **Average Meaningful Home Rows**: `11`
- **Average Category Fit (Context Score)**: `0.94`
- **Cross-Row Duplicate Rate**: `10.5%`
- **Power User (P15) Home Supply Pass (>=5 rows)**: `EVET (PASS)`

### E. Reference Quality & Explanations
- **Total Invalid References (Disliked or Unrated)**: `0` (Hedef: 0)
- **Average Max Reference Overuse Rate**: `13.8%` (Uyarı Eşiği: >30%)

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
| `P01_BLOCKBUSTER` | Mainstream Blockbuster Lover | 100 (80/20) | 3235 | 100.0% | 0.982 | 0% | 0.569 | 100% | 11 | **93.6** |
| `P02_CRIME_THRILLER` | Crime / Thriller Lover | 150 (120/30) | 3185 | 60.0% | 0.993 | 33% | 0.809 | 100% | 11 | **87.9** |
| `P03_COMEDY` | Comedy Lover | 100 (75/25) | 3235 | 80.0% | 0.785 | 0% | 0.631 | 100% | 11 | **88.6** |
| `P04_PRESTIGE_DRAMA` | Prestige Drama Lover | 200 (160/40) | 3135 | 0.0% | 1 | 0% | 0.39 | 100% | 11 | **73.2** |
| `P05_SCIFI_FANTASY` | Sci-Fi / Fantasy Explorer | 250 (200/50) | 3085 | 100.0% | 0.949 | 0% | 0.345 | 100% | 11 | **81** |
| `P06_HORROR` | Horror Lover | 120 (90/30) | 3215 | 80.0% | 0.963 | 33% | 0.75 | 100% | 11 | **89** |
| `P07_ANIMATION_FAMILY` | Animation & Family Lover | 150 (110/40) | 3185 | 20.0% | 0.65 | 0% | 0.376 | 100% | 11 | **66.4** |
| `P08_INTERNATIONAL` | International Cinema Explorer | 300 (240/60) | 3035 | 70.0% | 0.678 | 0% | 0.578 | 100% | 11 | **82.1** |
| `P09_CLASSIC_CINEMA` | Classic Cinema Lover | 250 (200/50) | 3085 | 100.0% | 1 | 0% | 0.698 | 100% | 11 | **97.3** |
| `P10_NICHE_ARTHOUSE` | Niche / Arthouse Explorer | 180 (130/50) | 3155 | 10.0% | 0.6 | 0% | 0.737 | 100% | 11 | **68.3** |
| `P11_MIXED_BALANCED` | Mixed Balanced Viewer | 500 (400/100) | 2835 | 100.0% | 1 | 0% | 0.664 | 100% | 11 | **96.6** |
| `P12_STRONG_NEGATIVE` | Strong Negative Preference User | 150 (100/50) | 3185 | 10.0% | 0.79 | 0% | 0.678 | 100% | 11 | **70.3** |
| `P13_MOSTLY_NOT_WATCHED` | Mostly NOT_WATCHED User | 300 (30/270) | 3035 | 50.0% | 0.858 | 0% | 0.69 | 100% | 11 | **80.1** |
| `P14_SMALL_EVIDENCE` | Small Profile User (30 Items) | 30 (25/5) | 3303 | 60.0% | 0.975 | 0% | 0.774 | 100% | 11 | **88.2** |
| `P15_POWER_USER_1043` | Power User (1043 Evaluated: 177 Watched / 866 Not Watched) | 1043 (177/866) | 2292 | 70.0% | 0.989 | 0% | 0.652 | 70% | 11 | **82.4** |
| `P16_SUPER_POWER_1500` | Super Power User (1500+ Items: 300 Watched / 1200+ Not Watched) | 1500 (300/1200) | 1835 | 100.0% | 1 | 0% | 0.571 | 92% | 11 | **90.2** |

---

## 5. Diagnostic Worst 20 Recommendations (Global Failure Analysis)

| Profil | Film | Skor | TMDB Puan | Kaynak | Beklenen | Seçilen Referans | Hata Nedeni / Açıklama |
|---|---|---|---|---|---|---|---|
| `P15_POWER_USER_1043` | **Mortal Kombat Legends: Battle of the Realms** (2021) | %90 | 7.63 | `FRESH_DISCOVERY` | `0/3` | Adalet Birliği : Apokolips Savaşı | Animasyon ve aksiyon türlerindeki tercihinle birebir örtüşüyor. |
| `P14_SMALL_EVIDENCE` | **Minyonlar ve Canavarlar** (2026) | %89 | 7.337 | `ADJACENT_DISCOVERY` | `0/3` | — | Profilindeki macera ve karakter odaklı yapım tercihlerinle uyumlu bir seçim. |
| `P14_SMALL_EVIDENCE` | **Davet** (2026) | %89 | 7.387 | `ADJACENT_DISCOVERY` | `0/3` | — | Komedi ve karakter odaklı yapımlara verdiğin yüksek puanlarla güçlü biçimde örtüşüyor. |
| `P14_SMALL_EVIDENCE` | **Oyuncak Hikayesi 5** (2026) | %89 | 7.41 | `ADJACENT_DISCOVERY` | `0/3` | — | Animasyon ve karakter odaklı yapımlara verdiğiniz yüksek puanlar, bu filmin türüyle birebir örtüşüyor. |
| `P13_MOSTLY_NOT_WATCHED` | **Harry Potter ve Ölüm Yadigârları: Bölüm 1** (2010) | %82 | 7.7 | `ADJACENT_DISCOVERY` | `0/3` | — | Macera türündeki güçlü ilginizle birebir örtüşen, keşif dolu bir hikaye sunuyor. |
| `P07_ANIMATION_FAMILY` | **Kalbin Kırılacak** (2026) | %81 | 7.1 | `ADJACENT_DISCOVERY` | `0/3` | — | Romantik ve karakter odaklı yapımlara verdiğiniz yüksek puanlar, bu filmin size uygun olduğunu gösteriyor. |
| `P10_NICHE_ARTHOUSE` | **Kalbin Kırılacak** (2026) | %80 | 7.1 | `ADJACENT_DISCOVERY` | `0/3` | — | Romantik ve karakter odaklı yapımlara verdiğiniz yüksek puanlar, bu filmin türünün sizin için ideal olduğunu gösteriyor. |
| `P15_POWER_USER_1043` | **Mortal Kombat Legends: Scorpion's Revenge** (2020) | %90 | 8.099 | `KNOWN_UNWATCHED` | `1/3` | Adalet Birliği : Apokolips Savaşı | Animasyon ve aksiyon türlerindeki tercihinle birebir örtüşüyor. |
| `P15_POWER_USER_1043` | **Ay Savaşçısı: Sonsuzluk Film 1 ./ Pretty Guardian Sailor Moon Eternal The Movie Part 1** (2021) | %90 | 7.896 | `KNOWN_UNWATCHED` | `1/3` | Adalet Birliği : Apokolips Savaşı | Animasyon ve aksiyon türlerindeki ortak yapısı sayesinde beğenine uygun. |
| `P14_SMALL_EVIDENCE` | **Süper Mario Galaksi Filmi** (2026) | %88 | 8.2 | `FRESH_DISCOVERY` | `1/3` | — | Aile ve karakter odaklı yapımlara verdiğiniz yüksek puanlar, bu filmin sizin için uygun olduğunu gösteriyor. |
| `P04_PRESTIGE_DRAMA` | **Taylor Swift: İtibar Stadyum Turu** (2018) | %87 | 8.183 | `FRESH_DISCOVERY` | `1/3` | — | Bu film, müzik ve karakter odaklı yapımlara verdiğiniz yüksek puanlarla birebir örtüşen bir deneyim sunuyor. |
| `P08_INTERNATIONAL` | **Işıltılı Ateşböceklerinin Ormanına** (2011) | %87 | 8.3 | `KNOWN_UNWATCHED` | `1/3` | — | Romantik ve karakter odaklı yapımlara verdiğiniz yüksek puanlar, bu filmin duygusal derinliğiyle birebir örtüşüyor. |
| `P08_INTERNATIONAL` | **Monster High: Why Do Ghouls Fall in Love?** (2012) | %86 | 7.987 | `FRESH_DISCOVERY` | `1/3` | — | Fantezi türüne olan ilgin, bu yapımın büyülü ve doğaüstü atmosferiyle doğrudan örtüşüyor. |
| `P08_INTERNATIONAL` | **Sınıf Arkadaşı** (2016) | %86 | 8.316 | `KNOWN_UNWATCHED` | `1/3` | — | Film, romantik ve karakter odaklı yapımlara verdiğiniz yüksek puanlarla güçlü bir şekilde örtüşüyor, bu da size özel bir seçim olduğunu gösteriyor. |
| `P12_STRONG_NEGATIVE` | **The Legend of Hei** (2019) | %85 | 8.384 | `KNOWN_UNWATCHED` | `1/3` | — | Animasyon ve karakter odaklı yapımlara verdiğin yüksek puanlar, bu filmin öne çıkan güçlü yönleriyle birebir örtüşüyor. |
| `P13_MOSTLY_NOT_WATCHED` | **Şafak Duvarı** (2017) | %85 | 8 | `FRESH_DISCOVERY` | `1/3` | — | Belgesel ve karakter odaklı yapımlara olan ilgin, bu filmin anlatım tarzıyla doğrudan örtüşüyor. |
| `P13_MOSTLY_NOT_WATCHED` | **Noble Ailesi** (2013) | %85 | 7.974 | `FRESH_DISCOVERY` | `1/3` | — | Komedi türündeki bu yapım, karakter odaklı hikayelere verdiğiniz yüksek puanlarla mükemmel bir uyum sağlıyor. |
| `P04_PRESTIGE_DRAMA` | **BTS: PERMISSION TO DANCE 온 스테이지 – LA** (2022) | %84 | 8.804 | `KNOWN_UNWATCHED` | `1/3` | — | Müzik ve karakter odaklı yapımlara verdiğiniz yüksek puanlar, bu belgeselin sahne arkası ve kişisel anlatımıyla güçlü bir uyum gösteriyor. |
| `P12_STRONG_NEGATIVE` | **Yürüyen Şato** (2004) | %84 | 8.4 | `KNOWN_UNWATCHED` | `1/3` | — | Fantezi ve karakter odaklı yapımlara verdiğin yüksek puanlarla güçlü biçimde örtüşüyor. |
| `P12_STRONG_NEGATIVE` | **Prenses Mononoke** (1997) | %84 | 8.32 | `KNOWN_UNWATCHED` | `1/3` | — | Macera ve karakter odaklı yapımlara verdiğin yüksek puanlarla güçlü biçimde örtüşüyor. |

---

## 6. Diagnostic Top 20 Strongest Recommendations (Best Cases)

| Profil | Film | Skor | TMDB Puan | Kaynak | Beklenen | Seçilen Referans |
|---|---|---|---|---|---|---|
| `P16_SUPER_POWER_1500` | **Kırmızı Fenerin Yükselişi** (1991) | %94 | 7.922 | `KNOWN_UNWATCHED` | `3/3` | Front of the Class |
| `P16_SUPER_POWER_1500` | **Kimse Fark Etmiyor** (2004) | %94 | 7.998 | `KNOWN_UNWATCHED` | `3/3` | Front of the Class |
| `P16_SUPER_POWER_1500` | **Benim Yolum** (2011) | %94 | 7.914 | `KNOWN_UNWATCHED` | `3/3` | Ayla |
| `P16_SUPER_POWER_1500` | **Mükemmel Yabancılar** (2016) | %94 | 7.852 | `KNOWN_UNWATCHED` | `3/3` | Annemle Geçen Yaz |
| `P16_SUPER_POWER_1500` | **Aşka Maruz a.k.a. Love Exposure** (2008) | %94 | 7.922 | `KNOWN_UNWATCHED` | `3/3` | Köşedeki Dükkân |
| `P16_SUPER_POWER_1500` | **Savaş Odası** (2015) | %94 | 7.838 | `KNOWN_UNWATCHED` | `3/3` | Annemle Geçen Yaz |
| `P16_SUPER_POWER_1500` | **Postacı** (1994) | %94 | 7.919 | `KNOWN_UNWATCHED` | `3/3` | Yaşamak |
| `P16_SUPER_POWER_1500` | **Son Veda** (2008) | %94 | 7.849 | `KNOWN_UNWATCHED` | `3/3` | Front of the Class |
| `P16_SUPER_POWER_1500` | **Hatırlıyorum** (1973) | %94 | 7.873 | `KNOWN_UNWATCHED` | `3/3` | 3 Aptal |
| `P16_SUPER_POWER_1500` | **Unutulmuş Sevgi** (2023) | %94 | 7.827 | `KNOWN_UNWATCHED` | `3/3` | Kalplerimiz Bir |
| `P01_BLOCKBUSTER` | **Örümcek-Adam: Yepyeni Bir Gün** (2026) | %92 | 7.888 | `ADJACENT_DISCOVERY` | `3/3` | Örümcek-Adam: Örümcek-Evrenine Geçiş |
| `P01_BLOCKBUSTER` | **Örümcek-Adam: Eve Dönüş Yok** (2021) | %92 | 7.938 | `ADJACENT_DISCOVERY` | `3/3` | Örümcek-Adam: Örümcek-Evrenine Geçiş |
| `P13_MOSTLY_NOT_WATCHED` | **Doctor Who: The Day of the Doctor** (2013) | %92 | 8.188 | `KNOWN_UNWATCHED` | `3/3` | Dune: Part Two |
| `P15_POWER_USER_1043` | **The Witch Part I: İntikam** (2018) | %92 | 7.914 | `KNOWN_UNWATCHED` | `3/3` | Matrix |
| `P15_POWER_USER_1043` | **V for Vendetta** (2006) | %92 | 7.901 | `KNOWN_UNWATCHED` | `3/3` | Matrix |
| `P01_BLOCKBUSTER` | **Örümcek Adam** (2002) | %91 | 7.343 | `ADJACENT_DISCOVERY` | `3/3` | Matrix |
| `P14_SMALL_EVIDENCE` | **Odyssey** (2026) | %91 | 8 | `ADJACENT_DISCOVERY` | `3/3` | Yüzüklerin Efendisi: Kralın Dönüşü |
| `P15_POWER_USER_1043` | **Prey** (2022) | %91 | 7.651 | `FRESH_DISCOVERY` | `3/3` | Avengers: Sonsuzluk Savaşı |
| `P14_SMALL_EVIDENCE` | **Amansız** (2026) | %90 | 7.97 | `ADJACENT_DISCOVERY` | `3/3` | Kara Şövalye |
| `P14_SMALL_EVIDENCE` | **Alacaklı** (2026) | %90 | 7.826 | `ADJACENT_DISCOVERY` | `3/3` | Kara Şövalye |

---

## 7. Failures & Diagnostics Summary

- **Kritik Hatalar (Critical)**: Yok (None)
- **Yüksek Öncelikli Uyarılar (High)**: Yok (None)
- **Orta Öncelikli Uyarılar (Medium)**: 
  - ℹ️ Score monotonicity failure detected in one or more profiles
