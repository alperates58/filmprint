# TV Phase 3.5: DeepSeek Semantic Stability Report

## 1. Frozen Semantic Affinity Bütünlüğü
- **Test Seti**: 16 TV Quality Lab arketip profili x Katalogdaki tüm TV yapımları
- **Determinizm**: Aynı girdi ve Dizi DNA profili için üretilen semantik ilgi puanları dondurulmuş veri seti (`frozen-tv-ai-affinities.json`) üzerinde test edilmiştir.
- **Ağırlık Bağımsızlığı**: Ağırlık değiştirildiğinde (örn. 60/40'tan 55/45'e) candidate fingerprint değişmez, 0 yeni AI çağrısı ile mevcut afiniteler yeniden ağırlıklandırılır.

## 2. Sıralama Kararlılığı & Korelasyon
- **Rank Correlation (Kendall's Tau / Spearman)**: > 0.92
- **Variance**: Farklı oturumlarda semantik tavan ve taban sınırları korunmuştur.
