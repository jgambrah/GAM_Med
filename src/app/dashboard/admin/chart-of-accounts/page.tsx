
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { mockLedgerAccounts } from '@/lib/data';
import { LedgerAccount } from '@/lib/types';
import { Eye, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function ChartOfAccountsPage() {
    // In a real app, this data would be fetched.
    const [accounts, setAccounts] = React.useState<LedgerAccount[]>(mockLedgerAccounts);

    const organizedAccounts = React.useMemo(() => {
        const accountsMap = new Map<string, LedgerAccount & { children: LedgerAccount[] }>();
        const rootAccounts: (LedgerAccount & { children: LedgerAccount[] })[] = [];

        accounts.forEach(acc => {
            accountsMap.set(acc.accountId, { ...acc, children: [] });
        });

        accounts.forEach(acc => {
            if (acc.isSubLedger && acc.parentAccountId) {
                const parent = accountsMap.get(acc.parentAccountId);
                if (parent) {
                    parent.children.push(accountsMap.get(acc.accountId)!);
                }
            } else {
                 rootAccounts.push(accountsMap.get(acc.accountId)!);
            }
        });

        return rootAccounts;

    }, [accounts]);

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
            <div>
                <h1 className="text-3xl font-bold">Chart of Accounts</h1>
                <p className="text-muted-foreground">
                    A hierarchical view of all financial ledgers and sub-ledgers.
                </p>
            </div>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Ledger Accounts</CardTitle>
          <CardDescription>Click 'View Ledger' to see the transaction history for an account.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizedAccounts.map((account) => (
                    <React.Fragment key={account.accountId}>
                        <TableRow className="bg-muted/50 font-semibold">
                            <TableCell>{account.accountCode}</TableCell>
                            <TableCell className="flex items-center gap-2">
                                <span>{account.accountName}</span>
                                {account.children.length > 0 && <Badge variant="secondary">Control Account</Badge>}
                            </TableCell>
                            <TableCell>{account.accountType}</TableCell>
                             <TableCell>
                                <Button asChild variant="outline" size="sm">
                                    <Link href={`/dashboard/admin/chart-of-accounts/${account.accountId}`}>
                                        <Eye className="h-4 w-4 mr-2" />
                                        View Ledger
                                    </Link>
                                </Button>
                            </TableCell>
                        </TableRow>
                        {account.children.map(child => (
                            <TableRow key={child.accountId}>
                                <TableCell className="pl-8">{child.accountCode}</TableCell>
                                <TableCell>{child.accountName}</TableCell>
                                <TableCell>{child.accountType}</TableCell>
                                 <TableCell>
                                    <Button asChild variant="outline" size="sm">
                                        <Link href={`/dashboard/admin/chart-of-accounts/${child.accountId}`}>
                                           <Eye className="h-4 w-4 mr-2" />
                                           View Ledger
                                        </Link>
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
