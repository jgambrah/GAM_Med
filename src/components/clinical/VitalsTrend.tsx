'use client';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Activity, Thermometer } from 'lucide-react';

export default function VitalsTrend({ data }: { data: any[] }) {
  // We reverse the data to show Chronological order (Oldest to Newest)
  const chartData = [...data].reverse().map(enc => ({
    date: enc.createdAt?.toDate()
        ? new Date(enc.createdAt.toDate()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
        : 'Unknown Date',
    Temp: enc.vitals?.temp ?? null,
    Systolic: enc.vitals?.systolic ?? null,
    Diastolic: enc.vitals?.diastolic ?? null,
    Pulse: enc.vitals?.pulse ?? null,
  }));

  return (
    <div className="bg-card p-6 rounded-[32px] border shadow-sm space-y-4">
      <div className="flex justify-between items-center border-b pb-4">
        <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
          <Activity size={16} className="text-primary" /> Longitudinal Vitals Trend
        </h3>
        <div className="flex gap-4">
           <div className="flex items-center gap-1 text-[10px] font-bold text-red-500 uppercase"><div className="w-2 h-2 bg-red-500 rounded-full"/> BP</div>
           <div className="flex items-center gap-1 text-[10px] font-bold text-blue-500 uppercase"><div className="w-2 h-2 bg-blue-500 rounded-full"/> Temp</div>
        </div>
      </div>

      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#94a3b8'}} />
            <Tooltip 
              contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }}
            />
            <Line connectNulls type="monotone" dataKey="Systolic" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} />
            <Line connectNulls type="monotone" dataKey="Temp" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
