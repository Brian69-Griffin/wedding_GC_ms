export interface SecurityUser {
  token: string;
  role: "admin" | "couple";
  weddingId?: string;
  username: string;
  weddingName: string;
  profilePicture?: string;
  password?: string;
}

export interface GiftRecord {
  id: string;
  weddingId: string;
  imageUrl?: string; // base64 representation
  date: string;
  fullName: string;
  address: string;
  amountRiel: number;
  amountUsd: number;
  otherNotes?: string;
  createdAt: string;
}

export interface QRCodeConfig {
  id: string;
  weddingId: string;
  currencyType: "RIEL" | "USD";
  qrImageUrl?: string;
  description: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  createdAt: string;
}

export interface FaceMatchResult {
  giftId: string;
  fullName?: string;
  confidence: number;
  isMatch: boolean;
}
