import type { Donation, Invoice, InvoiceStatus } from "./types";

const RUST_BACKEND_URL = process.env.NEXT_PUBLIC_RUST_BACKEND_URL || 'http://localhost:3001';

let pendingInvoice: Invoice | null = null;
let pollCount = 0;

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// --- API Functions ---

export async function createInvoice(
  amount_sats: number,
  donor_name: string = "Anonymous",
  recipient?: string
): Promise<Invoice> {
  const params = new URLSearchParams({
    amount_sats: amount_sats.toString(),
    donor_name,
  });

  if (recipient) {
    params.append('recipient', recipient);
  }

  const response = await fetch(`${RUST_BACKEND_URL}/create-invoice?${params}`);
  if (!response.ok) {
    throw new Error('Failed to create invoice');
  }

  const data = await response.json();

  return {
    invoice: data.invoice,
    payment_hash: data.payment_hash,
    expires_in: data.expires_in,
    donor_name,
    recipient,
    amount_sats,
    qr_code: data.qr_code,
  };
}

export async function getInvoiceStatus(
  payment_hash: string
): Promise<InvoiceStatus> {
  const response = await fetch(`${RUST_BACKEND_URL}/check-payment?payment_hash=${encodeURIComponent(payment_hash)}`);
  if (!response.ok) {
    throw new Error('Failed to check payment status');
  }

  const data = await response.json();

  return {
    status: data.status,
    paid_at: data.paid_at,
  };
}

export async function getRecentDonations(): Promise<Donation[]> {
  const response = await fetch(`${RUST_BACKEND_URL}/recent-donations`);
  if (!response.ok) {
    throw new Error('Failed to fetch recent donations');
  }

  const donations = await response.json();

  // Transform the data to match our Donation type
  return donations.map((d: any) => ({
    id: d.id,
    donor_name: d.donor_name,
    recipient: d.recipient,
    amount_sats: d.amount_sats,
    status: "PAID" as const,
    paid_at: d.paid_at,
  }));
}

export async function getDonationStats(): Promise<{
  totalSats: number;
  donorCount: number;
}> {
  const response = await fetch(`${RUST_BACKEND_URL}/donation-stats`);
  if (!response.ok) {
    throw new Error('Failed to fetch donation stats');
  }

  const data = await response.json();
  return {
    totalSats: data.total_sats,
    donorCount: data.donor_count,
  };
}

export async function getDonationReceipt(payment_hash: string) {
  const response = await fetch(`${RUST_BACKEND_URL}/donation-receipt?payment_hash=${encodeURIComponent(payment_hash)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch donation receipt');
  }
  return response.json();
}

// Manual payment confirmation for demo/testing purposes
export async function confirmPayment(payment_hash: string): Promise<InvoiceStatus> {
  try {
    const response = await fetch(`${RUST_BACKEND_URL}/confirm-payment?payment_hash=${encodeURIComponent(payment_hash)}`);
    if (response.ok) {
      const data = await response.json();
      return {
        status: data.status,
        paid_at: data.paid_at,
      };
    }
  } catch (error) {
    // Fallback: if confirm-payment endpoint doesn't exist, simulate payment
    console.log('Confirm payment endpoint not available, simulating payment confirmation');
  }
  
  // Simulate successful payment confirmation for demo purposes
  return {
    status: "PAID",
    paid_at: new Date().toISOString(),
  };
}

export interface DonationReceipt {
  id: string;
  donor_name: string;
  recipient?: string;
  amount_sats: number;
  payment_hash: string;
  paid_at: string;
  transaction_id: string;
  network: string;
}
