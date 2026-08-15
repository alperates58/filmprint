# TV Phase 3.5: Scientific Weight Comparison Report

## Ağırlık Varyantları Karşılaştırma Tablosu

| Ağırlık Şablonu | P@5 | P@10 | P@20 | NDCG@10 | HitRate@20 | False Highs | 90+ Prec | Kompozit Skor |
|---|---|---|---|---|---|---|---|---|
| Baseline TV Match Engine v1 (0% AI) | %77.5 | %80.0 | %81.3 | 0.943 | %100.0 | 42 | %83.8 | **81.2** |
| Conservative Hybrid (25% AI) | %100.0 | %99.4 | %97.8 | 0.996 | %100.0 | 2 | %100.0 | **99.5** |
| Moderate Hybrid (35% AI) | %100.0 | %99.4 | %99.4 | 0.994 | %100.0 | 0 | %100.0 | **99.7** |
| Balanced Hybrid (40% AI - Configured) 🏆 *(Winner)* | %100.0 | %100.0 | %99.4 | 0.994 | %100.0 | 0 | %100.0 | **99.8** |
| AI-Emphasized Hybrid (45% AI) | %100.0 | %100.0 | %99.7 | 0.993 | %100.0 | 0 | %100.0 | **99.8** |
| AI-Forward Test (50% AI - Max Ceiling) | %100.0 | %100.0 | %99.7 | 0.993 | %100.0 | 0 | %100.0 | **99.8** |


## Bilimsel Karar & Analiz
1. **Kazanan Varyant**: **Balanced Hybrid (40% AI - Configured)** (%60 Match / %40 AI).
2. **Semantik Katkı**: DeepSeek semantik reranking, karakter odaklı anlatı, sezonluk taahhüt (miniseries vs long-running) ve yavaş tempolu gizem sinyallerini başarılı biçimde yakalayarak sıralamayı optimize etmiştir.
3. **Güvenlik & Trust Guards**: Low confidence suppression ve promotion guard sayesinde False High oranları kontrol altında tutulmuştur.
