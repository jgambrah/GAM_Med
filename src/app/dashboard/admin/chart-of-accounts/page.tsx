

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
import { Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function ChartOfAccountsPage({ hideHeader = false }: { hideHeader?: boolean }) {
    const [accounts, setAccounts] = useLocalStorage<LedgerAccount[]>('ledgerAccounts', mockLedgerAccounts);
    const [entries] = useLocalStorage<LedgerEntry[]>('ledgerEntries', mockLedgerEntries);

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

  const handleDeleteAccount = (accountToDelete: LedgerAccount) => {
    // Safety check 1: Can't delete account with a non-zero balance.
    if (accountToDelete.balance !== 0) {
      toast.error('Deletion Failed', { description: 'Cannot delete an account with a non-zero balance.' });
      return;
    }

    // Safety check 2: Can't delete account with transactions.
    const hasTransactions = entries.some(entry => entry.accountId === accountToDelete.accountId);
    if (hasTransactions) {
      toast.error('Deletion Failed', { description: 'Cannot delete an account that has transactions recorded against it.' });
      return;
    }
    
    // Safety check 3: Can't delete a control account that has sub-ledgers.
    const isParent = !accountToDelete.isSubLedger;
    if (isParent) {
        const hasChildren = accounts.some(acc => acc.parentAccountId === accountToDelete.accountId);
        if (hasChildren) {
            toast.error('Deletion Failed', { description: 'Cannot delete a control account that has sub-ledgers. Please delete the sub-ledgers first.' });
            return;
        }
    }
    

    // Confirmation dialog
    if (window.confirm(`Are you sure you want to permanently delete the account "${accountToDelete.accountName}"? This action cannot be undone.`)) {
      setAccounts(prev => prev.filter(acc => acc.accountId !== accountToDelete.accountId));
      toast.success('Account Deleted', { description: `The account "${accountToDelete.accountName}" has been deleted.` });
    }
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
                                <span>{account.accountName}</span>
                                <Badge variant="secondary">Control Account</Badge>
                            </TableCell>
                            <TableCell>{account.accountType}</TableCell>
                            <TableCell className="text-right font-mono">{account.balance.toFixed(2)}</TableCell>
                            <TableCell className="text-right space-x-2">
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => handleDeleteAccount(account)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
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
                                <TableCell className="pl-8">{child.accountName}</TableCell>
                                <TableCell>{child.accountType}</TableCell>
                                <TableCell className="text-right font-mono">{child.balance.toFixed(2)}</TableCell>
                                 <TableCell className="text-right">
                                    <Button
                                      variant="destructive"
                                      size="icon"
                                      className="h-8 w-8"
                                      onClick={() => handleDeleteAccount(child)}
                                    >
                                      <Trash2 className="h-4 w-4" />
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
