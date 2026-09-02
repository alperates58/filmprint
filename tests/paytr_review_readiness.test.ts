import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import { getLegalOperatorProfile, LEGAL_ROUTES } from "@/lib/legal/operator";
import { getAdminBillingDashboardData } from "@/lib/admin/billing-data";
import { createBillingCheckout } from "@/lib/billing/service";

export async function runPaytrReviewReadinessTests() {
  console.log("--> Starting SINEAI PayTR Review Readiness V2 (Individual Model) Tests...");

  // 1. Legal Operator Profile & Individual Model Checks
  console.log("Testing Legal Operator Profile configuration...");
  const operator = getLegalOperatorProfile();
  assert.strictEqual(operator.brandName, "SINEAI", "Brand name must be SINEAI");
  assert.strictEqual(operator.operatorType, "INDIVIDUAL", "Operator type must be INDIVIDUAL for freelancer/individual model");
  assert.strictEqual(operator.supportEmail, "destek@sineai.com.tr", "Real support email must be destek@sineai.com.tr");
  
  // Strict test: corporate/tax info MUST be null (no fake data)
  assert.strictEqual(operator.legalName, null, "legalName must be null for INDIVIDUAL");
  assert.strictEqual(operator.taxOffice, null, "taxOffice must be null for INDIVIDUAL");
  assert.strictEqual(operator.taxNumber, null, "taxNumber must be null for INDIVIDUAL");
  assert.strictEqual(operator.mersisNumber, null, "mersisNumber must be null for INDIVIDUAL");
  assert.strictEqual(operator.tradeRegistryNumber, null, "tradeRegistryNumber must be null for INDIVIDUAL");
  assert.strictEqual(operator.kepAddress, null, "kepAddress must be null for INDIVIDUAL");

  // 2. Missing tax number does not crash any legal helper
  console.log("Testing safety when company fields are null (no crash)...");
  assert.doesNotThrow(() => {
    const profile = getLegalOperatorProfile();
    const str = `${profile.brandName} - ${profile.taxNumber ?? "Bireysel"} - ${profile.supportEmail}`;
    assert(str.includes("Bireysel"), "Should gracefully handle null taxNumber");
  }, "Accessing null company fields must not throw");

  // 3. Scan codebase for fake corporate placeholders
  console.log("Auditing codebase for forbidden fake corporate/tax placeholders...");
  const forbiddenPlaceholders = [
    "[VERGİ NO]",
    "1234567890",
    "Örnek Ltd. Şti.",
    "Örnek A.Ş.",
    "[MERSİS NO]",
    "[TİCARET SİCİL]",
  ];

  const appLegalFiles = [
    "app/hakkimizda/page.tsx",
    "app/iletisim/page.tsx",
    "app/gizlilik/page.tsx",
    "app/kvkk/page.tsx",
    "app/kullanim-kosullari/page.tsx",
    "app/mesafeli-satis-sozlesmesi/page.tsx",
    "app/iptal-iade/page.tsx",
    "app/teslimat/page.tsx",
    "app/cerez-politikasi/page.tsx",
    "app/premium/page.tsx",
    "components/ui/Footer.tsx",
    "lib/legal/operator.ts",
  ];

  for (const relPath of appLegalFiles) {
    const fullPath = path.resolve(process.cwd(), relPath);
    assert(fs.existsSync(fullPath), `Required legal file must exist: ${relPath}`);
    const content = fs.readFileSync(fullPath, "utf8");

    for (const placeholder of forbiddenPlaceholders) {
      assert(
        !content.includes(placeholder),
        `Forbidden fake placeholder "${placeholder}" detected in ${relPath}`
      );
    }
  }

  // 4. Content Audits: Physical Shipment vs Digital Delivery
  console.log("Auditing physical shipment & digital delivery wording...");
  const hakkimizdaContent = fs.readFileSync(path.resolve(process.cwd(), "app/hakkimizda/page.tsx"), "utf8");
  assert(hakkimizdaContent.includes("FİZİKSEL ÜRÜN SATIŞI YOKTUR"), "Hakkimizda must explicitly disclose no physical sales");
  assert(hakkimizdaContent.includes("STREAMING / MEDYA SATIŞI DEĞİLDİR"), "Hakkimizda must disclose not a streaming service");
  assert(hakkimizdaContent.includes("The Movie Database (TMDB)"), "Hakkimizda must retain TMDB attribution");

  const teslimatContent = fs.readFileSync(path.resolve(process.cwd(), "app/teslimat/page.tsx"), "utf8");
  assert(teslimatContent.includes("Dijital Hizmet Teslimatı"), "Teslimat page title must be Dijital Hizmet Teslimatı");
  assert(teslimatContent.includes("FİZİKSEL ÜRÜN VE KARGO GÖNDERİMİ BULUNMAMAKTADIR"), "Teslimat must explicitly disclose no shipping");
  assert(teslimatContent.includes("server-to-server verified callback"), "Teslimat must specify server callback as source of truth");

  // 5. Privacy & KVKK PAN/CVV non-storage audit
  console.log("Auditing PAN/CVV non-storage guarantee in Privacy and KVKK...");
  const gizlilikContent = fs.readFileSync(path.resolve(process.cwd(), "app/gizlilik/page.tsx"), "utf8");
  assert(gizlilikContent.includes("ASLA saklamaz, işlemez"), "Privacy policy must guarantee PAN/CVV are never stored");
  assert(gizlilikContent.includes("PayTR Ödeme ve Elektronik Para Kuruluşu A.Ş."), "Privacy policy must mention licensed provider PayTR");

  const kvkkContent = fs.readFileSync(path.resolve(process.cwd(), "app/kvkk/page.tsx"), "utf8");
  assert(kvkkContent.includes("Ödeme kartı PAN/CVV bilgileri platformumuzda ASLA tutulmaz"), "KVKK must state PAN/CVV not stored");

  // 6. Mesafeli Satış Sözleşmesi & İptal/İade
  console.log("Auditing Distance Sales & Cancellation/Refund policies...");
  const mesafeliContent = fs.readFileSync(path.resolve(process.cwd(), "app/mesafeli-satis-sozlesmesi/page.tsx"), "utf8");
  assert(mesafeliContent.includes("Mesafeli Satış Sözleşmesi"), "Must be Distance Sales Agreement");
  assert(mesafeliContent.includes("Elektronik ortamda anında ifa edilen hizmetler"), "Must cite digital performance exception");
  assert(mesafeliContent.includes("Bireysel"), "Must reference individual provider model");

  const iptalContent = fs.readFileSync(path.resolve(process.cwd(), "app/iptal-iade/page.tsx"), "utf8");
  assert(iptalContent.includes("İptal ve İade Koşulları"), "Must be cancellation & refund policy");
  assert(!iptalContent.includes("İade kesinlikle yapılmaz"), "Must not use aggressive no-refund statements");

  // 7. Footer Links & Canonical Routes
  console.log("Auditing Footer links and route consistency...");
  const footerContent = fs.readFileSync(path.resolve(process.cwd(), "components/ui/Footer.tsx"), "utf8");
  for (const route of LEGAL_ROUTES) {
    assert(footerContent.includes(route.path), `Footer must link to canonical legal route: ${route.path}`);
  }

  // 8. Middleware Public Allowlist Audit
  console.log("Auditing Middleware public allowlist...");
  const middlewareContent = fs.readFileSync(path.resolve(process.cwd(), "middleware.ts"), "utf8");
  assert(middlewareContent.includes("/hakkimizda"), "Middleware must allowlist /hakkimizda");
  assert(middlewareContent.includes("/iletisim"), "Middleware must allowlist /iletisim");
  assert(middlewareContent.includes("/gizlilik"), "Middleware must allowlist /gizlilik");
  assert(middlewareContent.includes("/kvkk"), "Middleware must allowlist /kvkk");
  assert(middlewareContent.includes("/kullanim-kosullari"), "Middleware must allowlist /kullanim-kosullari");
  assert(middlewareContent.includes("/mesafeli-satis-sozlesmesi"), "Middleware must allowlist /mesafeli-satis-sozlesmesi");
  assert(middlewareContent.includes("/iptal-iade"), "Middleware must allowlist /iptal-iade");
  assert(middlewareContent.includes("/teslimat"), "Middleware must allowlist /teslimat");
  assert(middlewareContent.includes("/cerez-politikasi"), "Middleware must allowlist /cerez-politikasi");
  assert(middlewareContent.includes("/premium"), "Middleware must allowlist /premium");
  assert(middlewareContent.includes("/api/billing/paytr/callback"), "Middleware must allowlist PayTR webhook callback");

  // 9. Premium Page Public State & Legal Consent in Checkout
  console.log("Auditing Premium Page & Checkout consent...");
  const premiumContent = fs.readFileSync(path.resolve(process.cwd(), "app/premium/page.tsx"), "utf8");
  assert(premiumContent.includes("Fiyat yakında"), "Premium must show 'Fiyat yakında' when pricing is not configured");
  assert(premiumContent.includes("Mesafeli Satış Sözleşmesi"), "Premium checkout must include Distance Sales consent link");
  assert(premiumContent.includes("legalConsentAccepted"), "Premium checkout must track legalConsentAccepted state");

  // 10. Checkout Server-Side Legal Consent & NOT_CONFIGURED Safety
  console.log("Testing Checkout API server-side consent validation & provider safety...");
  const checkoutRouteContent = fs.readFileSync(path.resolve(process.cwd(), "app/api/billing/checkout/route.ts"), "utf8");
  assert(checkoutRouteContent.includes("LEGAL_CONSENT_REQUIRED"), "Checkout route must reject requests without legal consent");

  // Verify createBillingCheckout rejects when PayTR is not configured
  await assert.rejects(
    async () => {
      await createBillingCheckout({
        userId: "test_user_anon",
        interval: "MONTHLY",
        userIp: "127.0.0.1",
      });
    },
    /BILLING_NOT_READY|PRICING_NOT_CONFIGURED|USER_NOT_FOUND/,
    "createBillingCheckout must block when PayTR is not configured or pricing missing"
  );

  // 11. Admin Review Readiness Data Structure
  console.log("Auditing Admin Billing Dashboard review readiness data...");
  const adminData = await getAdminBillingDashboardData();
  assert(adminData.reviewReadiness, "Admin dashboard data must contain reviewReadiness");
  assert.strictEqual(adminData.reviewReadiness.operatorType, "INDIVIDUAL", "Admin readiness operatorType must be INDIVIDUAL");
  assert(adminData.reviewReadiness.operatorBadge.includes("Bireysel"), "Admin readiness badge must indicate individual application");
  assert(adminData.reviewReadiness.checks.length >= 10, "Admin readiness must check all required public routes and settings");

  console.log("✅ All PayTR Review Readiness V2 (Individual Model) Tests Passed Successfully!");
}

