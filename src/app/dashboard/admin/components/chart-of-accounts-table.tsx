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
import { mockLedgerAccounts, mockLedgerEntries } from '@/lib/data';
import { LedgerAccount, LedgerEntry } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { CreateLedgerAccountDialog } from '../reports/components/create-ledger-account-dialog';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { DeleteConfirmationDialog } from '@/app/dashboard/patients/components/delete-confirmation-dialog';
import { useAuth } from '@/hooks/use-auth';

export function ChartOfAccountsTable({ hideHeader = false }: { hideHeader?: boolean }) {
    const { user } = useAuth();
    const [accounts, setAccounts] = useLocalStorage<LedgerAccount[]>('ledgerAccounts', mockLedgerAccounts);
    const [entries] = useLocalStorage<LedgerEntry[]>('ledgerEntries', mockLedgerEntries);
    const [accountToDelete, setAccountToDelete] = React.useState<LedgerAccount | null>(null);

    // SaaS LOGIC: Only show accounts for the current facility
    const hospitalAccounts = React.useMemo(() => {
        return accounts.filter(acc => acc.hospitalId === user?.hospitalId);
    }, [accounts, user?.hospitalId]);

    const organizedAccounts = React.useMemo(() => {
        const accountsMap = new Map<string, LedgerAccount & { children: LedgerAccount[] }>();
        const rootAccounts: (LedgerAccount & { children: LedgerAccount[] })[] = [];

        // Initialize all accounts in the map
        hospitalAccounts.forEach(acc => {
            accountsMap.set(acc.accountId, { ...acc, children: [] });
        });

        // Populate children arrays and identify root accounts
        hospitalAccounts.forEach(acc => {
            if (acc.isSubLedger && acc.parentAccountId) {
                const parent = accountsMap.get(acc.parentAccountId);
                if (parent) {
                    parent.children.push(accountsMap.get(acc.accountId)!);
                } else {
                    rootAccounts.push(accountsMap.get(acc.accountId)!);
                }
            } else if (!acc.isSubLedger) {
                 rootAccounts.push(accountsMap.get(acc.accountId)!);
            }
        });
        
        rootAccounts.forEach(parent => {
            parent.children.sort((a, b) => a.accountCode.localeCompare(b.accountCode));
        });

        rootAccounts.sort((a, b) => a.accountCode.localeCompare(b.accountCode));

        return rootAccounts;

    }, [hospitalAccounts]);
    
  const handleAccountCreated = (newAccount: LedgerAccount) => {
    setAccounts(prev => [...prev, newAccount]);
  };
  
  const handleAttemptDelete = (account: LedgerAccount) => {
    if (Math.abs(account.balance) > 0.001) {
      toast.error('Cannot delete account with a non-zero balance.');
      return;
    }
    
    const hasTransactions = entries.some(entry => entry.accountId === account.accountId);
    if (hasTransactions) {
        toast.error('Cannot delete an account with existing transactions.');
        return;
    }

    const hasChildren = hospitalAccounts.some(child => child.parentAccountId === account.accountId);
    if (hasChildren) {
        toast.error('Cannot delete a control account that has sub-ledgers.');
        return;
    }

    setAccountToDelete(account);
  };
  
  const handleConfirmDelete = () => {
    if (!accountToDelete) return;
    setAccounts(prev => prev.filter(acc => acc.accountId !== accountToDelete.accountId));
    toast.success(`Account "${accountToDelete.accountName}" has been deleted.`);
    setAccountToDelete(null);
  };

  return (
    <>
    <div className="space-y-6">
      <Card>
        {!hideHeader && (
          <CardHeader className="flex flex-row justify-between items-center">
            <div>
              <CardTitle>Chart of Accounts</CardTitle>
              <CardDescription>A structural view of all financial accounts for <strong>{user?.hospitalId}</strong>.</CardDescription>
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
                {organizedAccounts.length > 0 ? organizedAccounts.map((account) => (
                    <React.Fragment key={`${account.accountId}-fragment`}>
                        <TableRow className="bg-muted/50 font-semibold">
                            <TableCell>{account.accountCode}</TableCell>
                            <TableCell className="flex items-center gap-2">
                                <Link href={`/dashboard/admin/chart-of-accounts/${account.accountId}`} className="hover:underline">
                                    <span>{account.accountName}</span>
                                </Link>
                                <Badge variant="secondary">Control Account</Badge>
                            </TableCell>
                            <TableCell>{account.accountType}</TableCell>
                            <TableCell className="text-right font-mono">{typeof account.balance === 'number' ? account.balance.toFixed(2) : '0.00'}</TableCell>
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
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAttemptDelete(account)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
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
                                <TableCell className="text-right font-mono">{typeof child.balance === 'number' ? child.balance.toFixed(2) : '0.00'}</TableCell>
                                 <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAttemptDelete(child)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </React.Fragment>
                )) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                            No ledger accounts found for your facility.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
    {accountToDelete && (
        <DeleteConfirmationDialog 
            isOpen={!!accountToDelete}
            onOpenChange={() => setAccountToDelete(null)}
            onConfirm={handleConfirmDelete}
            itemName={`account ${accountToDelete.accountName} (${accountToDelete.accountCode})`}
        />
    )}
    </>
  );
}
