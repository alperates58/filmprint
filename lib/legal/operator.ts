/**
 * SINEAI Legal Operator & Service Provider Configuration
 * 
 * Bireysel / Freelancer Başvuru Modeli
 * Şirket veya vergi kaydı bulunmadığı için şirket alanları null olarak tutulur.
 * Kesinlikle sahte veya uydurma vergi/şirket bilgisi yayınlanmaz.
 */

export type OperatorType = "INDIVIDUAL" | "COMPANY";

export interface LegalOperatorProfile {
  brandName: string;
  websiteUrl: string;
  supportEmail: string;
  contactEmail: string;
  legalEmail: string;
  operatorType: OperatorType;
  serviceType: "DIGITAL_INFORMATION_AND_RECOMMENDATION_SERVICE";
  description: string;

  // Corporate fields: strictly null for INDIVIDUAL operator
  legalName: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
  mersisNumber: string | null;
  tradeRegistryNumber: string | null;
  kepAddress: string | null;
  physicalAddress: string | null;
  phone: string | null;
}

export function getLegalOperatorProfile(): LegalOperatorProfile {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sineai.com.tr";

  return {
    brandName: "SINEAI",
    websiteUrl: appUrl,
    supportEmail: "destek@sineai.com.tr",
    contactEmail: "destek@sineai.com.tr",
    legalEmail: "destek@sineai.com.tr",
    operatorType: "INDIVIDUAL",
    serviceType: "DIGITAL_INFORMATION_AND_RECOMMENDATION_SERVICE",
    description: "Kişiselleştirilmiş film ve dizi tat analizi, öneri ve keşif platformu",

    // Strictly null - no fake corporate/tax data
    legalName: null,
    taxOffice: null,
    taxNumber: null,
    mersisNumber: null,
    tradeRegistryNumber: null,
    kepAddress: null,
    physicalAddress: null,
    phone: null,
  };
}

export const LEGAL_ROUTES = [
  { path: "/hakkimizda", label: "Hakkımızda", category: "corporate" as const },
  { path: "/iletisim", label: "İletişim", category: "corporate" as const },
  { path: "/kullanim-kosullari", label: "Kullanım Koşulları", category: "legal" as const },
  { path: "/gizlilik", label: "Gizlilik Politikası", category: "legal" as const },
  { path: "/kvkk", label: "KVKK Aydınlatma Metni", category: "legal" as const },
  { path: "/mesafeli-satis-sozlesmesi", label: "Mesafeli Satış Sözleşmesi", category: "legal" as const },
  { path: "/iptal-iade", label: "İptal ve İade Koşulları", category: "legal" as const },
  { path: "/teslimat", label: "Dijital Hizmet Teslimatı", category: "legal" as const },
  { path: "/cerez-politikasi", label: "Çerez Politikası", category: "legal" as const },
  { path: "/premium", label: "SINEAI Premium", category: "product" as const },
] as const;
