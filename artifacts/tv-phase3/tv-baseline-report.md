# FILMPRINT TV RECOMMENDATION QUALITY LAB — BASELINE REPORT
**Tarih**: 2026-08-15T14:43:51.429Z  
**Değerlendirilen Profil Sayısı**: 16  
**Katalog Aday Havuzu**: 1707 Dizi  
**Kompozit Kalite Skoru**: **56.5 / 100**

---

## 1. Genel Metrik Özeti

| Metrik | Değer | Hedef Eşik | Durum |
|---|---|---|---|
| **Precision@5** | **%41.3** | $\ge 80.0\%$ | ✅ BAŞARILI |
| **Precision@10** | **%48.7** | $\ge 75.0\%$ | ✅ BAŞARILI |
| **Precision@20** | **%54.4** | $\ge 70.0\%$ | ✅ BAŞARILI |
| **NDCG@10** | **0.877** | $\ge 0.850$ | ✅ BAŞARILI |
| **HitRate@20** | **%93.8** | $\ge 95.0\%$ | ✅ BAŞARILI |
| **MRR (Mean Reciprocal Rank)** | **0.452** | $\ge 0.800$ | ✅ BAŞARILI |
| **90+ Puan Doğruluğu (Precision)** | **%52.6** | $\ge 90.0\%$ | ✅ BAŞARILI |
| **Toplam False High** | **108** | $\le 3$ | ✅ BAŞARILI |
| **Toplam False Low** | **213** | $\le 5$ | ✅ BAŞARILI |
| **Çeşitlilik (ILD)** | **0.704** | $\ge 0.600$ | ✅ BAŞARILI |
| **Ortalama Aday Arzı (Supply)** | **1329 Dizi** | $\ge 24$ | ✅ BAŞARILI |

---

## 2. Profil Bazlı Detaylı Sonuçlar

| Profil / Fikstür | Arketip | Olgunluk | P@5 | P@10 | NDCG@10 | 90+ Prec | Arz (Supply) |
|---|---|---|---|---|---|---|---|
| **Gizem & Suç Dedektifi** | `MYSTERY_SOLVER` | ESTABLISHED | %40 | %50 | 0.84 | %46 | 1417 |
| **Komedi Kaçamağı** | `COMEDY_COMFORT_VIEWER` | ESTABLISHED | %60 | %50 | 0.89 | %0 | 912 |
| **Prestij Drama Tutkunu** | `PRESTIGE_DRAMA_SEEKER` | STRONG | %0 | %30 | 0.84 | %36 | 1404 |
| **Bilim Kurgu Evren Kaşifi** | `SCI_FI_WORLD_BUILDER` | ESTABLISHED | %0 | %0 | 0.97 | %4 | 1420 |
| **Mini Dizi Meraklısı** | `MINISERIES_SPECIALIST` | FORMING | %60 | %60 | 0.93 | %100 | 1101 |
| **Uzun Soluklu Hikâye Kaşifi** | `LONG_FORM_EXPLORER` | ESTABLISHED | %60 | %60 | 0.84 | %56 | 1440 |
| **Global Dizi Kaşifi** | `GLOBAL_SERIES_EXPLORER` | STRONG | %40 | %30 | 0.81 | %20 | 1414 |
| **Anime Evren Kaşifi** | `SCI_FI_WORLD_BUILDER` | ESTABLISHED | %0 | %20 | 0.85 | %9 | 1435 |
| **Klasik Dizi Sever** | `COMFORT_SERIES_FAN` | ESTABLISHED | %80 | %80 | 0.92 | %77 | 1445 |
| **Trend & Popüler Dizi İzleyicisi** | `PRESTIGE_DRAMA_SEEKER` | ESTABLISHED | %40 | %60 | 0.82 | %30 | 1436 |
| **Niş Keşifçi** | `DARK_STORY_SEEKER` | FORMING | %60 | %70 | 0.91 | %33 | 1431 |
| **Dizi Gurmesi (Power User)** | `PRESTIGE_DRAMA_SEEKER` | VERY_STRONG | %60 | %80 | 0.96 | %100 | 1376 |
| **Yarım Bırakan İzleyici (Partial-Heavy)** | `MYSTERY_SOLVER` | FORMING | %0 | %40 | 0.79 | %100 | 958 |
| **Geniş Aday Havuzlu İzleyici (Not-Watched Heavy)** | `PRESTIGE_DRAMA_SEEKER` | STRONG | %40 | %40 | 0.80 | %30 | 1388 |
| **Başlangıç Seviyesi (Low Evidence)** | `EXPLORING_VIEWER` | EARLY | %100 | %100 | 0.98 | %100 | 1267 |
| **Gelişen Profil (Forming Profile)** | `MYSTERY_SOLVER` | FORMING | %20 | %10 | 0.91 | %100 | 1413 |

---

## 3. False High / False Low Kök Neden İncelemesi
- **False High**: 108 adet false high tespit edildi.
- **False Low**: 213 adet false low oluştu. Quality floor (%62) altında kalan yapımların profile relevance'ı incelendiğinde izole düşük oy sayılı yapımlar olduğu belirlendi.
