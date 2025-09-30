

'use client';

import * as React from 'react';
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
import { mockLedgerAccounts } from '@/lib/data';
import { LedgerAccount } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { CreateLedgerAccountDialog } from '../reports/components/create-ledger-account-dialog';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ChartOfAccountsPage({ hideHeader = false }: { hideHeader?: boolean }) {
    const [accounts, setAccounts] = useLocalStorage<LedgerAccount[]>('ledgerAccounts', mockLedgerAccounts);

    const organizedAccounts = React.useMemo(() => {
        const accountsMap = new Map<string, LedgerAccount & { children: LedgerAccount[] }>();
        const rootAccounts: (LedgerAccount & { children: LedgerAccount[] })[] = [];

        // Initialize all accounts in the map
        accounts.forEach(acc => {
            accountsMap.set(acc.accountId, { ...acc, children: [] });
        });

        // Populate children arrays and identify root accounts
        accounts.forEach(acc => {
            if (acc.isSubLedger && acc.parentAccountId) {
                const parent = accountsMap.get(acc.parentAccountId);
                if (parent) {
                    parent.children.push(accountsMap.get(acc.accountId)!);
                } else {
                    // This sub-ledger has a missing parent, treat it as a root for now
                    rootAccounts.push(accountsMap.get(acc.accountId)!);
                }
            } else if (!acc.isSubLedger) {
                 rootAccounts.push(accountsMap.get(acc.accountId)!);
            }
        });
        
        // Sort children within each parent account by account code
        rootAccounts.forEach(parent => {
            parent.children.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
        });

        // Sort root accounts by account code
        rootAccounts.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

        return rootAccounts;

    }, [accounts]);
    
  const handleAccountCreated = (newAccount: LedgerAccount) => {
    setAccounts(prev => [...prev, newAccount]);
  };

  return (
    <div className="space-y-6">
      <Card>
        {!hideHeader && (
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle>Chart of Accounts</CardTitle>
              <CardDescription>A structural view of all financial accounts.</CardDescription>
            </div>
            <CreateLedgerAccountDialog onAccountCreated={handleAccountCreated} />
          </CardHeader>
        )}
        <CardContent className={hideHeader ? "pt-6" : ""}>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Balance (₵)</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizedAccounts.map((account) => (
                    <React.Fragment key={account.accountId}>
                        <TableRow className="bg-muted/50 font-semibold">
                            <TableCell>{account.accountCode}</TableCell>
                            <TableCell className="flex items-center gap-2">
                                <Link href={`/dashboard/admin/chart-of-accounts/${account.accountId}`} className="hover:underline">
                                    <span>{account.accountName}</span>
                                </Link>
                                <Badge variant="secondary">Control Account</Badge>
                            </TableCell>
                            <TableCell>{account.accountType}</TableCell>
                            <TableCell className="text-right font-mono">{account.balance.toFixed(2)}</TableCell>
                            <TableCell className="text-right space-x-2">
                                <CreateLedgerAccountDialog 
                                    onAccountCreated={handleAccountCreated} 
                                    parentAccountId={account.accountId}
                                    trigger={
                                        <Button variant="outline" size="sm">
                                            Add Sub-Ledger
                                        </Button>
                                    }
                                />
                            </TableCell>
                        </TableRow>
                        {account.children.map(child => (
                            <TableRow key={child.accountId}>
                                <TableCell className="pl-8">{child.accountCode}</TableCell>
                                 <TableCell className="pl-8">
                                    <Link href={`/dashboard/admin/chart-of-accounts/${child.accountId}`} className="hover:underline">
                                        {child.accountName}
                                    </Link>
                                </TableCell>
                                <TableCell>{child.accountType}</TableCell>
                                <TableCell className="text-right font-mono">{child.balance.toFixed(2)}</TableCell>
                                 <TableCell className="text-right">
                                    {/* Placeholder for future actions */}
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
