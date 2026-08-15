# PHASE 9.5 — HYBRID AI WEIGHT COMPARISON & OPTIMIZATION REPORT
**Tarih / Saat**: 2026-08-15T14:31:29.857Z  
**Metodoloji**: Frozen AI Semantic Affinity Dataset (Tüm varyantlar için tek tip AI sinyali)  
**Toplam Profil**: 16 (30 — 1500+ etkileşim)  
**Yerel Katalog**: 3335 film (3330 eligible)  

---

## 1. Global Weight Comparison Matrix

| Varyant | Match / AI (%) | Overall Score (/100) | P@5 | P@10 | P@20 | NDCG@10 | HitRate@20 | 90+ Prec | False High | False Low | ILD | Home Rows |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Baseline Match Engine v3.2 (0% AI) | 100 / 0 | **85.2** | 65.0% | 61.9% | 56.9% | 0.899 | 18.8% | 97.1% | 11 | 9 | 0.681 | 11 |
| Conservative Hybrid (25% AI) | 75 / 25 | **85.9** | 73.7% | 67.5% | 62.4% | 0.898 | 6.3% | 97.1% | 11 | 5 | 0.606 | 11 |
| Moderate Hybrid (35% AI) | 65 / 35 | **83.5** | 58.1% | 58.1% | 54.4% | 0.925 | 18.8% | 95.0% | 12 | 1 | 0.608 | 11 |
| Balanced Hybrid (40% AI - Default) | 60 / 40 | **85.1** | 70.0% | 66.9% | 60.6% | 0.934 | 18.8% | 97.1% | 11 | 1 | 0.582 | 11 |
| AI-Emphasized Hybrid (45% AI) | 55 / 45 | **84.7** | 68.8% | 64.5% | 60.8% | 0.939 | 18.8% | 99.5% | 2 | 6 | 0.57 | 11 |
| 🏆 **AI-Forward Test (50% AI - Max Ceiling)** | 50 / 50 | **86.7** | 71.3% | 66.6% | 61.6% | 0.946 | 25.0% | 99.5% | 2 | 8 | 0.616 | 11 |

---

## 2. Key Insights & Findings

1. **AI Reranker Katkısı**:
   - Baseline (0% AI) skoru: **85.2/100**
   - Kazanan Hibrit (%50 AI) skoru: **86.7/100**
   - Precision@10: %61.9 -> %66.6
   - NDCG@10: 0.899 -> 0.946

2. **Ağırlık Davranış Analizi**:
   - **0% AI (Baseline)**: Deterministik temel, güvenli ve tutarlı.
   - **25% AI (Conservative)**: Hafif semantik iyileştirme, deterministik ağırlık baskın.
   - **40% AI (Balanced - Önerilen Default)**: İdeal denge; tematik anlatı uyumunu belirgin artırırken kalite ve tür guard'larını korur.
   - **50% AI (Tavan)**: Maksimum semantik esneklik; ancak düşük güven skorlu profillerde confidence-gating ile otomatik kısıtlanır.

3. **Güvenlik ve İzolasyon**:
   - False high skoru: 2 (Düşük deterministik adayların zirveye fırlaması AI Promotion Guard ile engellendi).
   - Invalid reference: 0 (Hiçbir uydurma veya izlenmemiş referans üretilmedi).
   - Power user (1043 & 1500) supply sağlığı: PASS.

---

## 3. Recommended Production Default

- **Önerilen Varsayılan Konfigürasyon**: `Match Engine %50 / AI Semantic %50`
- **Feature Flag**: `hybrid_rerank_enabled = true` olarak güvenle açılabilir.
