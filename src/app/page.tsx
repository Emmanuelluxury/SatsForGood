"use client";

import React, { useState, useEffect, useRef } from "react";
import { Landing } from "@/components/landing";
import { DonateForm } from "@/components/donate-form";
import { InvoiceQR } from "@/components/invoice-qr";
import { DonationReceiptComponent } from "@/components/donation-receipt";
import { DonationStats } from "@/components/donation-stats";
import { RecentDonations } from "@/components/recent-donations";
import { Footer } from "@/components/footer";
import { Confetti } from "@/components/confetti";
import type { Donation, Invoice, InvoiceStatus } from "@/lib/types";
import { createInvoice, getRecentDonations, getDonationStats } from "@/lib/api";

type View = "form" | "invoice" | "receipt";

export default function Home() {
  const [view, setView] = useState<View>("form");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [completedDonation, setCompletedDonation] = useState<{
    payment_hash: string;
    amount_sats: number;
    donor_name: string;
    recipient?: string;
  } | null>(null);
  const [recentDonations, setRecentDonations] = useState<Donation[]>([]);
  const [stats, setStats] = useState<{ totalSats: number; donorCount: number }>({
    totalSats: 0,
    donorCount: 0,
  });
  const [showConfetti, setShowConfetti] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);

  const donationSectionRef = useRef<HTMLDivElement>(null);

  const fetchDashboardData = async () => {
    const [donations, donationStats] = await Promise.all([
      getRecentDonations(),
      getDonationStats(),
    ]);
    setRecentDonations(donations);
    setStats(donationStats);
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreateInvoice = async (amount: number, name?: string, recipient?: string) => {
    setIsCreatingInvoice(true);
    try {
      const newInvoice = await createInvoice(amount, name, recipient);
      setInvoice(newInvoice);
      setView("invoice");
    } catch (error) {
      console.error("Failed to create invoice:", error);
      // Here you would show a toast to the user
    } finally {
      setIsCreatingInvoice(false);
    }
  };

  const handlePaymentSuccess = () => {
    if (!invoice) return;
    
    setCompletedDonation({
      payment_hash: invoice.payment_hash,
      amount_sats: invoice.amount_sats,
      donor_name: invoice.donor_name || "Anonymous",
      recipient: invoice.recipient,
    });
    
    setView("receipt");
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000); // Hide confetti after 5 seconds
    fetchDashboardData();
  };
  
  const handleBack = () => {
    setInvoice(null);
    setCompletedDonation(null);
    setView("form");
  };

  const handleNewDonation = () => {
    setCompletedDonation(null);
    setInvoice(null);
    setView("form");
  };

  const scrollToDonation = () => {
    donationSectionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="flex min-h-screen flex-col">
      {showConfetti && <Confetti />}
      <main className="flex-1">
        <Landing onDonateNowClick={scrollToDonation} />

        <div className="container mx-auto px-4 py-16 sm:py-24">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
            <div ref={donationSectionRef} className="flex flex-col gap-8">
              <h2 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl">
                Support Our Cause
              </h2>
              {view === "form" ? (
                <DonateForm onCreateInvoice={handleCreateInvoice} isSubmitting={isCreatingInvoice} />
              ) : view === "invoice" && invoice ? (
                <InvoiceQR
                  invoice={invoice}
                  onPaymentSuccess={handlePaymentSuccess}
                  onBack={handleBack}
                />
              ) : view === "receipt" && completedDonation ? (
                <DonationReceiptComponent
                  payment_hash={completedDonation.payment_hash}
                  amount_sats={completedDonation.amount_sats}
                  donor_name={completedDonation.donor_name}
                  recipient={completedDonation.recipient}
                  onBack={handleBack}
                  onNewDonation={handleNewDonation}
                />
              ) : null}
            </div>
            <div className="flex flex-col gap-8">
               <DonationStats totalSats={stats.totalSats} donorCount={stats.donorCount} />
               <RecentDonations donations={recentDonations} />
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
