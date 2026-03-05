
'use client';

import { BarChart3, FileText, Landmark, TrendingUp, Scale, Wallet } from 'lucide-react';
import Link from 'next/link';

const reports = [
  {
    title: "Income Statement",
    description: "Net surplus or deficit over a period.",
    href: "/accountant/reports/income-statement",
    icon: TrendingUp,
    color: "text-green-600 bg-green-50",
  },
  {
    title: "Balance Sheet",
    description: "Statement of assets, liabilities, and equity.",
    href: "/accountant/reports/balance-sheet",
    icon: Scale,
    color: "text-blue-600 bg-blue-50",
  },
  {
    title: "Cash Flow Statement",
    description: "Movement of cash from activities.",
    href: "/accountant/reports/cash-flow",
    icon: Wallet,
     color: "text-purple-600 bg-purple-50",
  },
  {
    title: "Trial Balance",
    description: "Verifies that total debits equal total credits.",
    href: "/accountant/reports/trial-balance",
    icon: Landmark,
    color: "text-orange-600 bg-orange-50",
  },
  {
    title: "General Ledger",
    description: "Detailed transaction history for any account.",
    href: "/accountant/reports/ledger",
    icon: FileText,
    color: "text-slate-600 bg-slate-50",
  },
];

export default function FinancialReportsHub() {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end border-b pb-6">
        <div>
          <h1 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">
            Financial <span className="text-primary">Intelligence Hub</span>
          </h1>
          <p className="text-muted-foreground font-medium">
            Generate statutory and management financial reports.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map((report) => (
          <Link href={report.href} key={report.title} className="group">
            <div className="bg-card p-6 rounded-[32px] border shadow-sm space-y-4 h-full flex flex-col justify-between hover:border-primary/20 hover:-translate-y-1 transition-all">
              <div>
                <div className={`p-3 rounded-2xl w-fit mb-4 ${report.color}`}>
                  <report.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-black text-card-foreground uppercase tracking-tight">
                  {report.title}
                </h3>
                <p className="text-sm text-muted-foreground font-medium">
                  {report.description}
                </p>
              </div>
              <p className="text-xs font-bold text-primary group-hover:underline">Generate Report &rarr;</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
