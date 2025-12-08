import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BitcoinIcon, Users } from "@/components/icons";

interface DonationStatsProps {
  totalSats: number;
  donorCount: number;
}

export function DonationStats({ totalSats, donorCount }: DonationStatsProps) {
  return (
    <div>
        <h2 className="font-headline text-3xl font-bold tracking-tight sm:text-4xl mb-8 text-center">
            Impact Dashboard
        </h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Card className="shadow-lg border-2 border-primary/10 bg-gradient-to-br from-background to-muted/20 hover:shadow-xl transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg font-semibold text-primary">Total Sats Donated</CardTitle>
                <div className="p-2 bg-primary/10 rounded-full">
                  <BitcoinIcon className="h-6 w-6 text-primary" />
                </div>
                </CardHeader>
                <CardContent>
                <div className="text-4xl font-bold mb-2">
                    {totalSats.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">
                    Making a big impact together
                </p>
                </CardContent>
            </Card>
            <Card className="shadow-lg border-2 border-primary/10 bg-gradient-to-br from-background to-muted/20 hover:shadow-xl transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle className="text-lg font-semibold text-primary">Total Donors</CardTitle>
                <div className="p-2 bg-primary/10 rounded-full">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                </CardHeader>
                <CardContent>
                <div className="text-4xl font-bold mb-2">
                    {donorCount.toLocaleString()}
                </div>
                <p className="text-sm text-muted-foreground">
                    Amazing community support!
                </p>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
