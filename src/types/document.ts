// src/types/document.ts

// Doküman türleri
export type DocumentType =
  | "procedure"   // Prosedür
  | "instruction" // Talimat
  | "form"        // Form
  | "record"      // Kayıt
  | "other";      // Diğer

export const DOCUMENT_TYPE_OPTIONS = [
  { value: "procedure",   label: "Prosedür" },
  { value: "instruction", label: "Talimat" },
  { value: "form",        label: "Form" },
  { value: "record",      label: "Kayıt" },
  { value: "other",       label: "Diğer" },
];

// Doküman statüleri (NewDocument'ta kullandığımız string’lerle birebir aynı)
export type DocumentStatus =
  | "draft"      // Taslak
  | "pending"    // Onay Bekliyor
  | "published"  // Yayınlandı
  | "canceled";  // İptal / Geçersiz
