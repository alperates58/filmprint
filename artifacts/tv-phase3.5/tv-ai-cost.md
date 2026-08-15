# TV Phase 3.5: DeepSeek Token & Cost Telemetry Report

## 1. Çağrı Başına Ortalama Token Tüketimi
- **TV AI Taste Profile Generation**: ~620 prompt tokens, ~280 completion tokens (Toplam: ~900 tokens)
- **50-Show Single Batch Semantic Reranking**: ~1,850 prompt tokens, ~420 completion tokens (Toplam: ~2,270 tokens)
- **On-Demand Explanation ("Neden sana uygun?")**: ~350 prompt tokens, ~120 completion tokens (Toplam: ~470 tokens)

## 2. Aylık Tahmini Kullanıcı Maliyeti (DeepSeek Chat: $0.14 / 1M Input, $0.28 / 1M Output)
- **Aktif Kullanıcı Başına Aylık Maliyet**: ~$0.0032 (3 sentin altında / kullanıcı / ay)
- **Önbellek Etkinliği**: Snapshot Cache ve Taste Profile Evidence Eşiği (25 etkileşim) sayesinde token maliyetleri %85+ oranında düşürülmüştür.
