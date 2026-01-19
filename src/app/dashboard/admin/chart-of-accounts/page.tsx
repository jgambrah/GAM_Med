'use client';

import { ChartOfAccountsTable } from '../components/chart-of-accounts-table';

export default function ChartOfAccountsPage() {
  // This page now simply renders the reusable table component
  // with its default props (which includes the header).
  return <ChartOfAccountsTable />;
}
