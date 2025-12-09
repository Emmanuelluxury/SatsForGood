import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import type { Donation } from "@/lib/types";
import { BitcoinIcon } from './icons';

interface RecentDonationsProps {
  donations: Donation[];
}

export function RecentDonations({ donations }: RecentDonationsProps) {
  return (
    <Card className="shadow-lg border-2 border-primary/10 bg-gradient-to-br from-background to-muted/20">
      <CardHeader className="text-center">
        <CardTitle className="text-xl font-semibold text-primary">Recent Donations</CardTitle>
        <p className="text-sm text-muted-foreground">See how others are contributing</p>
      </CardHeader>
      <CardContent>
        {donations.length > 0 ? (
          <div className="rounded-lg border border-border/50 overflow-hidden">
            <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-semibold">Donor</TableHead>
                <TableHead className="text-right font-semibold">Amount</TableHead>
                <TableHead className="hidden sm:table-cell text-right font-semibold">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donations.map((donation) => (
                <TableRow key={donation.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {donation.donor_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{donation.donor_name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-mono flex justify-end items-center gap-1">
                    {donation.amount_sats.toLocaleString()}
                    <BitcoinIcon className="h-3 w-3 text-primary" />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-right text-muted-foreground">
                    {formatDistanceToNow(new Date(donation.paid_at), { addSuffix: true })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="text-lg font-semibold mb-2">No donations yet</h3>
            <p className="text-muted-foreground">Be the first to make a difference!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}