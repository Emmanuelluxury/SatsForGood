export interface Invoice {
  invoice: string;
  payment_hash: string;
  expires_in: number;
  donor_name?: string;
  recipient?: string;
  amount_sats: number;
  qr_code?: string;
}

export interface InvoiceStatus {
  status: "PENDING" | "PAID" | "EXPIRED";
  paid_at?: string;
}

export interface Donation {
  id: string;
  donor_name: string;
  recipient?: string;
  amount_sats: number;
  status: "PAID";
  paid_at: string;
}
