import type { Donation, Invoice, InvoiceStatus } from "./types";
import { format } from "date-fns";

// --- In-memory mock database ---
let mockDonations: Donation[] = [];

let pendingInvoice: Invoice | null = null;
let pollCount = 0;

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

// --- Mock API Functions ---

export async function createInvoice(
  amount_sats: number,
  donor_name: string = "Anonymous",
  recipient?: string
): Promise<Invoice> {
  await delay(1000); // Simulate network latency

  const payment_hash = `mock_payment_hash_${Date.now()}`;
  const invoiceString = `ln-testnet-invoice-${amount_sats}-${donor_name.replace(
    /\s/g,
    "_"
  )}-${payment_hash}`;

  const newInvoice: Invoice = {
    invoice: invoiceString,
    payment_hash,
    expires_in: 3600,
    donor_name,
    recipient,
    amount_sats,
  };

  pendingInvoice = newInvoice;
  pollCount = 0; // Reset poll count for the new invoice

  return newInvoice;
}

export async function getInvoiceStatus(
  payment_hash: string
): Promise<InvoiceStatus> {
  await delay(2000); // Simulate polling delay

  if (payment_hash !== pendingInvoice?.payment_hash) {
    // This case handles polling for an old or invalid invoice
    return { status: "PENDING" };
  }

  pollCount++;

  // Simulate payment success after 2 polls
  if (pollCount >= 2) {
    const paid_at = new Date().toISOString();
    const newDonation: Donation = {
      id: `${mockDonations.length + 1}`,
      donor_name: pendingInvoice.donor_name || "Anonymous",
      recipient: pendingInvoice.recipient,
      amount_sats: pendingInvoice.amount_sats,
      status: "PAID",
      paid_at,
    };
    
    // Add to the top of the list
    mockDonations.unshift(newDonation);

    pendingInvoice = null; // Clear pending invoice
    pollCount = 0;

    return { status: "PAID", paid_at };
  }

  return { status: "PENDING" };
}

export async function getRecentDonations(): Promise<Donation[]> {
  await delay(500);
  // Return the most recent 5 donations
  return mockDonations.slice(0, 5);
}

export async function getDonationStats(): Promise<{
  totalSats: number;
  donorCount: number;
}> {
  await delay(500);
  const totalSats = mockDonations.reduce(
    (acc, donation) => acc + donation.amount_sats,
    0
  );
  return {
    totalSats,
    donorCount: mockDonations.length,
  };
}
