"use client";

import React, { useState } from "react";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.message) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setFormData({ name: "", email: "", subject: "", message: "" });
    }, 800);
  };

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent selection:text-white">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 space-y-12 w-full">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-mono font-bold text-accent">
            📬 İletişim & Destek
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight text-text-primary">
            Bizimle İletişime Geçin
          </h1>
          <p className="text-sm md:text-base text-text-secondary max-w-xl mx-auto leading-relaxed">
            Filmprint platformuyla ilgili sorularınız, önerileriniz, geri bildirimleriniz veya telif hakları bildirimleriniz için bize ulaşabilirsiniz.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Contact Info Cards */}
          <div className="space-y-4 md:col-span-1">
            <div className="p-6 rounded-2xl bg-surface border border-border/80 space-y-2">
              <div className="text-xl">📧 E-Posta Destek</div>
              <p className="text-xs text-text-muted">7/24 Teknik destek ve genel sorularınız için:</p>
              <div className="font-mono text-xs font-bold text-accent">destek@filmprint.app</div>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-border/80 space-y-2">
              <div className="text-xl">⚖️ Yasal Haklar & Telif</div>
              <p className="text-xs text-text-muted">DMCA ve Telif Bildirimleri için:</p>
              <div className="font-mono text-xs font-bold text-text-primary">legal@filmprint.app</div>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-border/80 space-y-2">
              <div className="text-xl">⏱️ Yanıt Süresi</div>
              <p className="text-xs text-text-muted leading-relaxed">
                Tüm mesajlar en geç 24 saat içerisinde teknik ekibimiz tarafından değerlendirilir.
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-2 p-8 rounded-3xl bg-surface border border-border/80 shadow-cinematic space-y-6">
            <h2 className="font-display text-xl font-bold text-text-primary">
              İletişim Formu
            </h2>

            {submitted ? (
              <div className="p-6 rounded-2xl bg-accent/15 border border-accent/40 text-center space-y-3 animate-fadeIn">
                <div className="text-3xl">✅</div>
                <h3 className="font-display text-base font-bold text-accent">Mesajınız Alındı!</h3>
                <p className="text-xs text-text-secondary">
                  Geri bildiriminiz için teşekkür ederiz. Ekibimiz en kısa sürede sizinle iletişime geçecektir.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="px-4 py-2 rounded-xl bg-accent text-white font-mono text-xs font-bold hover:bg-accent-hover transition-colors"
                >
                  Yeni Mesaj Gönder
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-text-muted">Adınız Soyadınız</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Ahmet Yılmaz"
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border/80 text-xs font-mono text-text-primary focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-text-muted">E-Posta Adresiniz</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="ahmet@example.com"
                      className="w-full px-4 py-2.5 rounded-xl bg-background border border-border/80 text-xs font-mono text-text-primary focus:outline-none focus:border-accent transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-text-muted">Konu</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="Algoritma önerisi / Hata bildirimi / Soru"
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border/80 text-xs font-mono text-text-primary focus:outline-none focus:border-accent transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-text-muted">Mesajınız</label>
                  <textarea
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Mesajınızı detaylı şekilde yazabilirsiniz..."
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border/80 text-xs font-sans text-text-primary focus:outline-none focus:border-accent transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-accent text-white font-mono font-bold text-xs hover:bg-accent-hover transition-colors shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? "Gönderiliyor..." : "✉️ Mesajı Gönder"}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* FAQ Section */}
        <section className="p-8 rounded-3xl bg-surface border border-border/80 space-y-6">
          <h2 className="font-display text-xl font-bold text-text-primary text-center">
            Sıkça Sorulan Sorular (SSS)
          </h2>

          <div className="space-y-4 text-xs font-sans">
            <div className="p-4 rounded-2xl bg-background border border-border/60 space-y-1">
              <h3 className="font-bold text-text-primary text-sm">Filmprint önerileri ücretli mi?</h3>
              <p className="text-text-muted leading-relaxed">
                Hayır. Filmprint kişisel tat kalibrasyonu ve film öneri motoru tamamen ücretsizdir.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-background border border-border/60 space-y-1">
              <h3 className="font-bold text-text-primary text-sm">Match skoru neden %100 olamıyor?</h3>
              <p className="text-text-muted leading-relaxed">
                Match Engine v3.1 prensiplerine göre hiçbir film %100 eşleşme garantisi veremez. Gösterim üst sınırı %97'dir ve %90+ skor için sevdiğiniz filmlerle matematiksel referans şarttır.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-background border border-border/60 space-y-1">
              <h3 className="font-bold text-text-primary text-sm">Movie Night ortak öneri nasıl çalışır?</h3>
              <p className="text-text-muted leading-relaxed">
                Movie Night, katılan tüm kullanıcıların Film DNA profillerini birleştirerek grubun ortak kesişim kümesini ve Pareto optimum film önerilerini hesaplar.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
