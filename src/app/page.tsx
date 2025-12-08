"use client";

import React, { useState, useEffect, useRef } from "react";
import { Landing } from "@/components/landing";
import { DonateForm } from "@/components/donate-form";
import { InvoiceQR } from "@/components/invoice-qr";
import { DonationStats } from "@/components/donation-stats";
import { RecentDonations } from "@/components/recent-donations";
import { Footer } from "@/components/footer";
import { Confetti } from "@/components/confetti";
import type { Donation, Invoice, InvoiceStatus } from "@/lib/types";
import { createInvoice, getRecentDonations, getDonationStats } from "@/lib/api";

type View = "form" | "invoice";

export default function Home() {
  const [view, setView] = useState<View>("form");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
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
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 5000); // Hide confetti after 5 seconds
    fetchDashboardData();
    setTimeout(() => {
        setInvoice(null);
        setView("form");
    }, 3000); // Go back to form after 3 seconds
  };
  
  const handleBack = () => {
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
              ) : invoice ? (
                <InvoiceQR 
                  invoice={invoice} 
                  onPaymentSuccess={handlePaymentSuccess} 
                  onBack={handleBack}
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
