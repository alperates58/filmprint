import { getDeepSeekConfig, CANONICAL_DEEPSEEK_MODEL } from "../config/service";
import { generateRichFilmDnaSummary } from "./calculator";
import type {
  GenrePreference,
  EraPreference,
  PopularityOrientation,
  FamiliarityPreference,
} from "./types";

export interface GenerateAiNarrativeInput {
  userName?: string;
  lovedMovies: Array<{ title: string; releaseYear?: number | null; genres?: string[] }>;
  likedMovies: Array<{ title: string; releaseYear?: number | null; genres?: string[] }>;
  dislikedMovies: Array<{ title: string; releaseYear?: number | null; genres?: string[] }>;
  genreList: GenrePreference[];
  topEra?: EraPreference;
  popularity: PopularityOrientation;
  familiarity: FamiliarityPreference;
  traits: string[];
  sample: { ratedMovies: number; totalInteractions: number };
}

const AI_NARRATIVE_SYSTEM_PROMPT = `Sen SineAI platformunun baş film küratörü ve usta sinefil sinema eleştirmenisin.
Görevin: Kullanıcının izlediği, çok sevdiği (LOVE), beğendiği (LIKE) ve sevmediği (DISLIKE) filmleri ve tür/dönem istatistiklerini derinlemesine analiz ederek ona özel, edebi, akıcı ve tamamen özgün bir "Sinefil DNA Analiz Raporu" yazmak.

KURALLAR VE TON:
1. Kesinlikle hazır şablon, robotik veya kuru istatistik tekrarı yapma ("X türüne yüzde şu kadar ilgi gösteriyorsun" gibi mekanik formüller KURMA).
2. Kullanıcının sevdiği filmlerin (özellikle verilen listedeki spesifik film isimlerinin) arkasındaki ortak ruhu, yönetmen vizyonunu, tematik ortaklıkları (örneğin ahlaki ikilemler, varoluşsal krizler, tekinsiz neo-noir atmosferi, karakter odaklı psikolojik dramalar, dünya inşası vb.) analiz et.
3. Sevmediği (DISLIKE) filmler varsa, bunlardan yola çıkarak izleyicinin kaçındığı klişeleri, yüzeysel gişe formüllerini veya yapay anlatıları tespit et.
4. Vurgulanması gereken anahtar kavramları, yönetmen ekollerini, akımları, temaları ve film adlarını **bu şekilde kalın** yaz.
5. Tam olarak 4 akıcı, doğal ve edebi paragraftan oluşmalıdır:
   - Paragraf 1: Temel Sinefil Kimliği ve Anlatı Felsefesi (Bu izleyici sinemada ne arıyor? Karakterlerin ve senaryonun hangi yönü onu büyülüyor?).
   - Paragraf 2: Estetik Doku, Dönem ve Sevilen Filmlerin Sinematik Rezonansı (Sevdiği filmler ve dönemlerin yarattığı sinematik kimya).
   - Paragraf 3: Seçicilik, Kaçındığı Klişeler ve Kürasyon Davranışı (Sevmediği filmlerden de sinyal alarak neden sıradan gişe işlerinden uzak durup özgün işlere yöneldiği).
   - Paragraf 4: SineAI Öneri Pusulası (SineAI algoritmasının bu izleyiciye hangi spesifik sinematik deneyimleri vadettiği).
6. Paragrafları çift satır atlayarak (\\n\\n) ayır. Başlık veya madde işareti kullanma; doğrudan 4 paragraflık akıcı bir sinefil denemesi yaz.`;

/**
 * Generates a truly bespoke, dynamic AI Cinephile Analysis Report using DeepSeek or OpenAI LLM.
 * If LLM is unconfigured, times out, or fails, gracefully falls back to the deterministic synthesizer.
 */
export async function generateBespokeAiNarrative(input: GenerateAiNarrativeInput): Promise<string> {
  try {
    const deepseekConfig = await getDeepSeekConfig();

    if (deepseekConfig.enabled && deepseekConfig.apiKey) {
      const promptPayload = buildPromptPayload(input);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12-second timeout

      try {
        const response = await fetch(`${deepseekConfig.baseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${deepseekConfig.apiKey}`,
          },
          body: JSON.stringify({
            model: deepseekConfig.modelId || CANONICAL_DEEPSEEK_MODEL,
            temperature: 0.65,
            max_tokens: 1200,
            messages: [
              { role: "system", content: AI_NARRATIVE_SYSTEM_PROMPT },
              { role: "user", content: promptPayload },
            ],
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content?.trim();
          if (content && content.length > 150) {
            return content;
          }
        } else {
          console.warn(`[AiNarrativeService] DeepSeek returned ${response.status}: ${await response.text().catch(() => "")}`);
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.warn("[AiNarrativeService] DeepSeek API call failed or timed out:", err.message);
      }
    }

    // Check OpenAI if configured in environment
    if (process.env.OPENAI_API_KEY) {
      const promptPayload = buildPromptPayload(input);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: process.env.OPENAI_MODEL || "gpt-4o-mini",
            temperature: 0.65,
            max_tokens: 1200,
            messages: [
              { role: "system", content: AI_NARRATIVE_SYSTEM_PROMPT },
              { role: "user", content: promptPayload },
            ],
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content?.trim();
          if (content && content.length > 150) {
            return content;
          }
        }
      } catch (err: any) {
        clearTimeout(timeoutId);
        console.warn("[AiNarrativeService] OpenAI API call failed:", err.message);
      }
    }
  } catch (outerErr) {
    console.error("[AiNarrativeService] Unexpected error in narrative generation:", outerErr);
  }

  // Graceful, guaranteed fallback to rich algorithmic synthesizer
  return generateRichFilmDnaSummary({
    genreList: input.genreList,
    topEra: input.topEra,
    popularity: input.popularity,
    familiarity: input.familiarity,
    traits: input.traits,
    sample: input.sample,
  });
}

function buildPromptPayload(input: GenerateAiNarrativeInput): string {
  const formatMovieList = (list: typeof input.lovedMovies, max = 15) => {
    if (!list.length) return "Kayıt yok";
    return list
      .slice(0, max)
      .map((m) => {
        const yr = m.releaseYear ? ` (${m.releaseYear})` : "";
        const gn = m.genres?.length ? ` [${m.genres.slice(0, 2).join(", ")}]` : "";
        return `${m.title}${yr}${gn}`;
      })
      .join(", ");
  };

  const topGenresStr = input.genreList
    .slice(0, 4)
    .map((g) => `${g.name} (%${Math.round(g.score * 100)})`)
    .join(", ");

  return `KULLANICI VERİLERİ:
- Toplam Değerlendirilen Film: ${input.sample.ratedMovies} film (${input.sample.totalInteractions} etkileşim)
- Çok Sevdiği Filmler (LOVE): ${formatMovieList(input.lovedMovies, 20)}
- Beğendiği Filmler (LIKE): ${formatMovieList(input.likedMovies, 15)}
- Sevmediği Filmler (DISLIKE): ${formatMovieList(input.dislikedMovies, 10)}
- Baskın Türler: ${topGenresStr || "Dengeli"}
- Baskın Dönem: ${input.topEra ? `${input.topEra.label} (${input.topEra.ratedCount} film)` : "Belirtilmemiş"}
- Kürasyon / Keşif Profili: ${input.popularity.label} (Ortalama Popülerlik: ${input.popularity.avgPopularityScore})
- Arketip Nitelikleri: ${input.traits.join(", ")}

Lütfen bu izleyici için 4 paragraflık derinlemesine, edebi ve tamamen özgün Sinefil DNA Analiz Raporunu yaz.`;
}
