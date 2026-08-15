"use client";

import React, { useState } from "react";

interface FaqItem {
  question: string;
  answer: string;
}

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FaqItem[] = [
    {
      question: "Match Score nasıl oluşur?",
      answer:
        "Match skoru; Bayesian kalite tabanı (W), Film DNA vektör uyumu (S_DNA), keşif yönelimi (D), geçmiş referans kanıtı (E) ve tekrar/uyumsuzluk cezalarının (P) çok boyutlu matematiksel birleşimiyle üretilir.",
    },
    {
      question: "Bayesian kalite filtresi nedir?",
      answer:
        "Az sayıda kişinin 10/10 verdiği yapımların, yüz binlerce kişinin oyuyla kalitesi tescillenmiş başyapıtların önüne geçmesini önlemek için küresel veri tabanı ortalamasıyla ağırlıklandıran güvenilirlik düzeltmesidir.",
    },
    {
      question: "NOT_WATCHED neden negatif sayılmaz?",
      answer:
        "Bir filmi henüz izlememiş olman, o filmi veya türünü sevmediğin anlamına gelmez. 'İzlemedim' kararı zevk profilini olumsuz etkilemez; sadece izleme listesi planlamanıza yardımcı olur.",
    },
    {
      question: "Neden bazı filmler hiç gösterilmez?",
      answer:
        "Eksik afiş, yetersiz/placeholder özet, gelecekteki vizyon tarihi, adult/erotik filtreye takılan veya kullanıcının kaçındığı tür cezaları nedeniyle minimum taban puanının altında kalan filmler elenir.",
    },
    {
      question: "90+ skor neden nadirdir?",
      answer:
        "SineAI yapay şişirme puanlar üretmez. 90 ve üzeri eşleşmeler için kullanıcının 'Çok Sevdim' dediği gerçek filmlerle yüksek benzerlik ve olgunlaşmış profil güvenilirliği (%65+) şart koşulur.",
    },
    {
      question: "Aynı filmler neden sürekli tekrar etmez?",
      answer:
        "Global ana sayfa tekilleştirme (deduplication) ve etkileşim yorgunluk filtreleri sayesinde bir film tek bir kategoride sunulur ve kullanıcının önüne sürekli aynı yapımların gelmesi engellenir.",
    },
    {
      question: "Film referansları nasıl seçilir?",
      answer:
        "Açıklamalarda gösterilen filmler sadece kullanıcının daha önce izleyip 'Çok Sevdim' veya 'Beğendim' dediği kütüphaneden seçilir. Aday film ile benzerlik eşiği yakalanamazsa yapay referans uydurulmaz, profil genel sinyalleri kullanılır.",
    },
    {
      question: "AI Confidence Gating (Güven Kısıtı) nedir?",
      answer:
        "SineAI profiliniz henüz yeniyse veya yeterince veri oluşmamışsa, yapay zekanın etkisi otomatik olarak sınırlandırılır ve matematiksel Match Engine daha baskın tutulur. Profil olgunlaştıkça semantik AI ağırlığı yapılandırılan seviyeye yükselir.",
    },
    {
      question: "AI Taste Profile ne sıklıkla yenilenir?",
      answer:
        "AI Taste Profile her istekte baştan çağrılmaz. Yaklaşık 25 yeni değerlendirme yapıldığında veya anlamlı bir zevk kayması tespit edildiğinde arka planda asenkron yenilenir. Böylece sayfalar her zaman anında (sıfır gecikmeyle) açılır.",
    },
    {
      question: "'Neden Sana Uygun?' açıklaması nasıl çalışır?",
      answer:
        "Öneri sıralamasında çalışan semantik reranker ile 'Neden sana uygun?' butonuna basıldığında açılan doğal dil açıklaması iki bağımsız servistir. Açıklama üretimi yalnızca siz butona tıkladığınızda istek üzerine (on-demand) çalışır ve önbelleğe alınır.",
    },
  ];

  const toggleIndex = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="space-y-6">
      <div className="text-center space-y-2 max-w-xl mx-auto">
        <span className="text-xs font-mono font-bold text-accent uppercase tracking-wider">
          Sıkça Sorulan Sorular
        </span>
        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-text-primary">
          Teknik Detaylar
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary">
          Algoritma ve öneri mimarisine dair merak edilenler.
        </p>
      </div>

      <div className="space-y-3 max-w-3xl mx-auto">
        {faqs.map((faq, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                isOpen
                  ? "bg-surface border-accent/40 shadow-sm"
                  : "bg-surface/60 border-border/70 hover:border-border"
              }`}
            >
              <button
                type="button"
                onClick={() => toggleIndex(idx)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 font-display text-sm sm:text-base font-bold text-text-primary focus:outline-none"
              >
                <span>{faq.question}</span>
                <span
                  className={`text-accent font-mono text-lg transition-transform duration-200 shrink-0 ${
                    isOpen ? "rotate-45" : ""
                  }`}
                >
                  +
                </span>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 text-xs sm:text-sm text-text-secondary leading-relaxed font-sans border-t border-border/40 pt-3">
                  {faq.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
