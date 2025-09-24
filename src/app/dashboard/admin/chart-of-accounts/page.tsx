
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
    
  const handleAccountCreated = (newAccount: LedgerAccount) => {
    setAccounts(prev => [...prev, newAccount]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row justify-between items-center">
          <div>
            <CardTitle>Chart of Accounts</CardTitle>
            <CardDescription>A structural view of all financial accounts.</CardDescription>
          </div>
          <CreateLedgerAccountDialog onAccountCreated={handleAccountCreated} />
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Code</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Type</TableHead>
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
                        </TableRow>
                        {account.children.map(child => (
                            <TableRow key={child.accountId}>
                                <TableCell className="pl-8">{child.accountCode}</TableCell>
                                <TableCell>{child.accountName}</TableCell>
                                <TableCell>{child.accountType}</TableCell>
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
