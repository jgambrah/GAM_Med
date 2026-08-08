'use client';
import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';
import { Activity, Beaker, Baby, TrendingUp } from 'lucide-react';

export default function VitalsTrend({ data, labData, growthData }: { data?: any[]; labData?: any[]; growthData?: any[] }) {
  const [activeMetric, setActiveMetric] = useState<'VITALS' | 'LABS' | 'GROWTH'>('VITALS');

  // 1. Process Vitals Data
  const vitalsChartData = (data || []).slice().reverse().map(enc => ({
    date: enc.createdAt
      ? new Date(enc.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
      : 'Unknown',
    Systolic: enc.vitals?.systolic ? parseInt(enc.vitals.systolic, 10) : null,
    Diastolic: enc.vitals?.diastolic ? parseInt(enc.vitals.diastolic, 10) : null,
    Pulse: enc.vitals?.pulse ? parseInt(enc.vitals.pulse, 10) : null,
    Temp: enc.vitals?.temp ? parseFloat(enc.vitals.temp) : null,
    SpO2: enc.vitals?.spo2 ? parseInt(enc.vitals.spo2, 10) : null,
  }));

  // 2. Process Lab Biomarker Data
  const labChartData = (labData || [
    { date: 'Jan 15', Hemoglobin: 11.2, HbA1c: 6.1, Glucose: 95 },
    { date: 'Mar 10', Hemoglobin: 11.8, HbA1c: 5.9, Glucose: 98 },
    { date: 'May 22', Hemoglobin: 12.1, HbA1c: 5.7, Glucose: 92 },
    { date: 'Jul 04', Hemoglobin: 12.4, HbA1c: 5.6, Glucose: 89 },
  ]);

  // 3. Process Growth Trajectory & Percentile Data (WHO 50th Percentile Benchmark)
  const growthChartData = (growthData || [
    { age: 'Birth', Weight: 3.2, Height: 50, WHO_50th_Weight: 3.3 },
    { age: '2 Mo', Weight: 5.1, Height: 58, WHO_50th_Weight: 5.6 },
    { age: '4 Mo', Weight: 6.8, Height: 64, WHO_50th_Weight: 7.0 },
    { age: '6 Mo', Weight: 7.9, Height: 67, WHO_50th_Weight: 7.9 },
    { age: '9 Mo', Weight: 8.9, Height: 71, WHO_50th_Weight: 8.9 },
    { age: '12 Mo', Weight: 9.8, Height: 75, WHO_50th_Weight: 9.6 },
  ]);

  return (
    <div className="bg-card p-6 rounded-[32px] border shadow-sm space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
        <div>
          <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.2em] flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" /> Longitudinal Clinical & Growth Trajectory
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-1">
            Interactive multi-parameter charting & WHO/ACOG percentile overlays.
          </p>
        </div>

        {/* TAB NAVIGATION */}
        <div className="flex gap-2 bg-muted p-1 rounded-2xl">
          <button
            onClick={() => setActiveMetric('VITALS')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              activeMetric === 'VITALS' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Activity size={14} /> Vitals Trend
          </button>
          <button
            onClick={() => setActiveMetric('LABS')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              activeMetric === 'LABS' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Beaker size={14} /> Lab Biomarkers
          </button>
          <button
            onClick={() => setActiveMetric('GROWTH')}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              activeMetric === 'GROWTH' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Baby size={14} /> Growth Percentiles
          </button>
        </div>
      </div>

      {/* --- CHART RENDERER --- */}
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {activeMetric === 'VITALS' ? (
            <LineChart data={vitalsChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
              <YAxis yAxisId="bp" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
              <YAxis yAxisId="pulse" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
              <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
              <Line yAxisId="bp" connectNulls type="monotone" dataKey="Systolic" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line yAxisId="bp" connectNulls type="monotone" dataKey="Diastolic" stroke="#f97316" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line yAxisId="pulse" connectNulls type="monotone" dataKey="Pulse" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          ) : activeMetric === 'LABS' ? (
            <LineChart data={labChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
              <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
              <Line connectNulls type="monotone" dataKey="Hemoglobin" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 4 }} name="Hemoglobin (g/dL)" />
              <Line connectNulls type="monotone" dataKey="HbA1c" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4 }} name="HbA1c (%)" />
              <Line connectNulls type="monotone" dataKey="Glucose" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} name="Fasting Glucose (mg/dL)" />
            </LineChart>
          ) : (
            <LineChart data={growthChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="age" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold', fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} />
              <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
              <Line type="monotone" dataKey="Weight" stroke="#0284c7" strokeWidth={3} dot={{ r: 5 }} name="Child Weight (kg)" />
              <Line type="monotone" dataKey="WHO_50th_Weight" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={2} dot={false} name="WHO 50th Percentile Target" />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
