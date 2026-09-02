"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { getLegalOperatorProfile } from "@/lib/legal/operator";

export default function IletisimPage() {
  const operator = getLegalOperatorProfile();
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
    }, 600);
  };

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent selection:text-white">
      <Header />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 space-y-12 w-full">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-accent/15 border border-accent/30 text-xs font-mono font-bold text-accent">
            📬 İletişim & Destek Merkezi
          </div>
          <h1 className="font-display text-3xl md:text-5xl font-extrabold tracking-tight text-text-primary">
            Bizimle İletişime Geçin
          </h1>
          <p className="text-sm md:text-base text-text-secondary max-w-xl mx-auto leading-relaxed">
            SINEAI platformu, dijital abonelikler, öneri algoritmaları veya teknik destek talepleriniz için bize ulaşabilirsiniz.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Contact Info Cards */}
          <div className="space-y-4 md:col-span-1">
            <div className="p-6 rounded-2xl bg-surface border border-border/80 space-y-2">
              <div className="text-xl">📧 E-Posta Destek</div>
              <p className="text-xs text-text-muted">7/24 Teknik destek, soru ve bildirimleriniz için:</p>
              <a href={`mailto:${operator.supportEmail}`} className="font-mono text-xs font-bold text-accent hover:underline block">
                {operator.supportEmail}
              </a>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-border/80 space-y-2">
              <div className="text-xl">⏱️ Yanıt Süresi</div>
              <p className="text-xs text-text-muted leading-relaxed">
                Tüm e-posta ve iletişim formu mesajları en geç <strong className="text-text-primary">24 saat</strong> içerisinde teknik ekibimiz tarafından yanıtlanır.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-surface border border-border/80 space-y-2">
              <div className="text-xl">🌐 Hizmet Türü</div>
              <p className="text-xs text-text-muted leading-relaxed">
                Dijital Bilgi & Kişiselleştirilmiş Tavsiye Platformu
              </p>
              <div className="font-mono text-[11px] text-text-secondary">
                {operator.websiteUrl}
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="md:col-span-2 p-8 rounded-3xl bg-surface border border-border/80 shadow-cinematic space-y-6">
            <h2 className="font-display text-xl font-bold text-text-primary">
              Destek ve Geri Bildirim Formu
            </h2>

            {submitted ? (
              <div className="p-6 rounded-2xl bg-accent/15 border border-accent/40 text-center space-y-3 animate-fadeIn">
                <div className="text-3xl">✅</div>
                <h3 className="font-display text-base font-bold text-accent">Mesajınız Alındı!</h3>
                <p className="text-xs text-text-secondary">
                  Talebiniz bize ulaştı. En kısa sürede e-posta adresiniz üzerinden sizinle iletişime geçeceğiz.
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
                      placeholder="Adınız Soyadınız"
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
                      placeholder="ornek@alanadi.com"
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
                    placeholder="Abonelik / Teknik Destek / Geri Bildirim"
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
                    placeholder="Mesajınızı detaylı şekilde iletebilirsiniz..."
                    className="w-full px-4 py-2.5 rounded-xl bg-background border border-border/80 text-xs font-sans text-text-primary focus:outline-none focus:border-accent transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-accent text-white font-mono font-bold text-xs hover:bg-accent-hover transition-colors shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? "Gönderiliyor..." : "✉️ Mesajı İlet"}
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
              <h3 className="font-bold text-text-primary text-sm">SINEAI öneri motoru ücretli mi?</h3>
              <p className="text-text-muted leading-relaxed">
                Hayır. SINEAI kişisel tat kalibrasyonu ve film/dizi öneri özellikleri temel kullanımda tamamen ücretsizdir.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-background border border-border/60 space-y-1">
              <h3 className="font-bold text-text-primary text-sm">Ödeme güvenliği nasıl sağlanır?</h3>
              <p className="text-text-muted leading-relaxed">
                Kart bilgileriniz SINEAI veritabanında asla tutulmaz. Ödemeler lisanslı ödeme kuruluşu PayTR altyapısı ve 3D Secure güvencesiyle gerçekleşir.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-background border border-border/60 space-y-1">
              <h3 className="font-bold text-text-primary text-sm">Abonelik iptali nasıl yapılır?</h3>
              <p className="text-text-muted leading-relaxed">
                Aboneliğinizi dilediğiniz an hesap ayarlarınızdan iptal edebilirsiniz. İptal durumunda mevcut dönemin bitişine kadar haklarınız korunur.
              </p>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

