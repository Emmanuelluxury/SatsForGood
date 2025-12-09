"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { getInvoiceStatus, confirmPayment } from "@/lib/api";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Copy, Loader2, CheckCircle, ArrowLeft, Zap, ExternalLink, Wallet, Clock } from "lucide-react";

interface InvoiceQRProps {
  invoice: Invoice;
  onPaymentSuccess: () => void;
  onBack: () => void;
}

export function InvoiceQR({ invoice, onPaymentSuccess, onBack }: InvoiceQRProps) {
  const [status, setStatus] = useState<InvoiceStatus["status"]>("PENDING");
  const [isPolling, setIsPolling] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState(3600); // 1 hour in seconds
  const { toast } = useToast();

  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(async () => {
      try {
        const result = await getInvoiceStatus(invoice.payment_hash);
        if (result.status === "PAID") {
          setStatus("PAID");
          setIsPolling(false);
          onPaymentSuccess();
          clearInterval(interval);
        } else if (result.status === "EXPIRED") {
          setStatus("EXPIRED");
          setIsPolling(false);
          clearInterval(interval);
        }
      } catch (error) {
        console.error("Error polling for invoice status:", error);
      }
    }, 3000); // Poll every 3 seconds

    return () => clearInterval(interval);
  }, [invoice.payment_hash, onPaymentSuccess, isPolling]);

  useEffect(() => {
    if (timeRemaining <= 0) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(invoice.invoice);
    toast({
      title: "Invoice copied!",
      description: "You can now paste this in your Lightning wallet.",
    });
  };

  const handleOpenInWallet = () => {
    const uri = `lightning:${invoice.invoice}`;
    window.location.href = uri;
  };

  const qrCodeUrl = invoice.qr_code || `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(invoice.invoice)}&size=256x256&bgcolor=f3f4f6&color=000000&qzone=1`;

  return (
    <Card className="relative overflow-hidden">
        <Button variant="ghost" size="icon" className="absolute top-4 left-4" onClick={onBack}>
            <ArrowLeft />
        </Button>

      <CardHeader>
        <CardTitle className="text-center font-headline flex items-center justify-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            Scan QR Code to Donate
        </CardTitle>
        <p className="text-center text-sm text-muted-foreground">
          Use your Lightning wallet to scan this QR code and complete the donation
        </p>
      </CardHeader>
      
      <CardContent className="flex flex-col items-center gap-6">
        {/* QR Code */}
        <div className="relative rounded-lg bg-white p-4 shadow-lg">
            {invoice.qr_code ? (
                <img
                    src={invoice.qr_code}
                    alt="Lightning Invoice QR Code"
                    width={280}
                    height={280}
                    className="rounded"
                />
            ) : (
                <Image
                    src={qrCodeUrl}
                    alt="Lightning Invoice QR Code"
                    width={280}
                    height={280}
                    priority
                />
            )}
        </div>

        {/* Amount and Description */}
        <div className="text-center space-y-2">
          <div className="text-2xl font-bold text-primary">
            {invoice.amount_sats.toLocaleString()} sats
          </div>
          {invoice.recipient && (
            <div className="text-sm text-muted-foreground">
              To: {invoice.recipient}
            </div>
          )}
        </div>

        {/* Time Remaining */}
        {status === "PENDING" && (
          <div className="flex items-center gap-2 text-amber-600">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">
              Expires in {formatTime(timeRemaining)}
            </span>
          </div>
        )}

        {/* Mobile Payment Instructions */}
        <div className="w-full space-y-3">
          <h3 className="text-sm font-semibold text-center">How to Pay</h3>
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>1. Open your Lightning wallet app</p>
            <p>2. Scan this QR code or copy the invoice</p>
            <p>3. Confirm the payment</p>
          </div>
          
          {/* Direct Open Button for Mobile */}
          <Button
            onClick={handleOpenInWallet}
            className="w-full bg-primary hover:bg-primary/90"
            size="lg"
          >
            <Wallet className="h-5 w-5 mr-2" />
            Open in Lightning Wallet
          </Button>
        </div>
        
        {/* Invoice Text */}
        <div className="w-full space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Invoice (LNBC...)</label>
          <div className="relative">
            <Input
              readOnly
              value={invoice.invoice}
              className="pr-10 text-xs text-muted-foreground font-mono"
              placeholder="lnbc..."
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
              onClick={handleCopy}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Payment Status */}
        <div className="w-full text-center">
          {status === "PENDING" && (
            <div className="flex items-center justify-center gap-2 text-primary">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="font-semibold">Waiting for payment...</span>
              <span className="text-sm text-muted-foreground">(Check your wallet)</span>
            </div>
          )}
          
          {status === "PAID" && (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-green-500">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">Payment Successful!</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Thank you for your donation! 🎉
              </p>
            </div>
          )}

          {status === "EXPIRED" && (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 text-red-500">
                <Clock className="h-5 w-5" />
                <span className="font-semibold">Invoice Expired</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Please create a new donation invoice.
              </p>
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter>
        <div className="w-full text-center text-xs text-muted-foreground">
          <p>🔒 Secure Lightning Network payment</p>
          <p>💡 Compatible with all Lightning wallets</p>
        </div>
      </CardFooter>
    </Card>
  );
}

