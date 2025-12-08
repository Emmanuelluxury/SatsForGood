"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BitcoinIcon, Loader2, Zap } from "@/components/icons";

const formSchema = z.object({
  name: z.string().optional(),
  recipient: z.string().optional(),
  amount: z.coerce
    .number({ invalid_type_error: "Please enter a number." })
    .min(1, { message: "Donation must be at least 1 sat." })
    .max(1000000, { message: "Donation cannot exceed 1,000,000 sats." }),
});

interface DonateFormProps {
  onCreateInvoice: (amount: number, name?: string, recipient?: string) => Promise<void>;
  isSubmitting: boolean;
}

export function DonateForm({ onCreateInvoice, isSubmitting }: DonateFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      recipient: "",
      amount: 1000,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    onCreateInvoice(values.amount, values.name, values.recipient);
  }

  return (
    <Card className="shadow-lg border-2 border-primary/10 bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 font-headline text-2xl">
          <Zap className="h-7 w-7 text-primary" />
          Make a Donation
        </CardTitle>
        <p className="text-muted-foreground mt-2">
          Support our cause with Bitcoin Lightning. Every sat counts!
        </p>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Satoshi Nakamoto" className="h-11" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="recipient"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Recipient (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="Charity Name or Cause" className="h-11" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {[100, 500, 1000, 5000, 10000, 50000].map((amount) => (
                      <Button
                        key={amount}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => field.onChange(amount)}
                        className="text-xs"
                      >
                        {amount.toLocaleString()} sats
                      </Button>
                    ))}
                  </div>
                  <FormControl>
                    <div className="relative">
                      <Input type="number" placeholder="1000" {...field} className="pl-8 h-11"/>
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground">
                        <BitcoinIcon className="h-4 w-4" />
                      </span>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full h-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Invoice...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-5 w-5" />
                  Donate Now
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-4">
              🔒 Secure Lightning Network payment • No fees • Instant confirmation
            </p>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
