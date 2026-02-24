'use client';

import React from 'react';

/**
 * == High-Fidelity Clinical Document: Laboratory Return ==
 * 
 * This component renders a formal, structured lab report designed for 
 * clinical review and physical printing. It includes hospital branding, 
 * patient demographics, and multi-parameter results with reference ranges.
 */
export function LabReportPrintable({ report }: { report: any }) {
    return (
        <div className="p-8 bg-white text-black border max-w-[800px] mx-auto shadow-sm print:shadow-none print:border-0">
            {/* Hospital Header */}
            <div className="flex justify-between border-b-2 border-black pb-4 mb-6">
                <div>
                    <h1 className="text-xl font-black uppercase tracking-tight">{report.hospitalName}</h1>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-600">Laboratory Department - Quality Accredited</p>
                </div>
                <div className="text-right text-[10px] font-mono">
                    <p>Report Date: {new Date().toLocaleDateString()}</p>
                    <p>Accession #: {report.id.slice(0,8).toUpperCase()}</p>
                </div>
            </div>

            {/* Patient Info Block */}
            <div className="grid grid-cols-2 gap-8 text-xs mb-8 bg-slate-50 p-4 border rounded-lg">
                <div className="space-y-1">
                    <p className="uppercase font-black text-slate-500 text-[9px]">Patient Information</p>
                    <p className="text-sm font-bold"><strong>Name:</strong> {report.patientName}</p>
                    <p><strong>MRN:</strong> {report.patientMrn}</p>
                    <p><strong>Gender / Age:</strong> {report.gender} / {report.age}</p>
                </div>
                <div className="text-right space-y-1">
                    <p className="uppercase font-black text-slate-500 text-[9px]">Request Details</p>
                    <p className="text-sm font-bold"><strong>Test:</strong> {report.testName}</p>
                    <p><strong>Requested By:</strong> Dr. {report.doctorName || 'Medical Staff'}</p>
                    <p><strong>Status:</strong> FINAL REPORT</p>
                </div>
            </div>

            {/* The Results Table */}
            <div className="min-h-[300px]">
                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="border-b-2 border-slate-900 text-left">
                            <th className="py-2 text-[10px] font-black uppercase tracking-wider">Test Parameter</th>
                            <th className="py-2 text-[10px] font-black uppercase tracking-wider">Result</th>
                            <th className="py-2 text-[10px] font-black uppercase tracking-wider">Units</th>
                            <th className="py-2 text-[10px] font-black uppercase tracking-wider">Reference Range</th>
                            <th className="py-2 text-[10px] font-black uppercase tracking-wider text-center">Flag</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {report.parameters && report.parameters.length > 0 ? (
                            report.parameters.map((p: any, i: number) => (
                                <tr key={i} className="hover:bg-slate-50 transition-colors">
                                    <td className="py-3 font-semibold text-slate-900">{p.name}</td>
                                    <td className={`py-3 font-black font-mono ${p.flag !== 'Normal' ? 'text-red-600' : 'text-slate-900'}`}>{p.value}</td>
                                    <td className="py-3 text-slate-600 font-medium">{p.unit}</td>
                                    <td className="py-3 text-slate-500 font-mono text-xs">{p.range}</td>
                                    <td className="py-3 text-center">
                                        {p.flag === 'Low' || p.flag === 'High' || p.flag === 'Critical' ? (
                                            <span className="text-red-600 font-black text-[10px] uppercase underline underline-offset-4 decoration-2">
                                                {p.flag}
                                            </span>
                                        ) : (
                                            <span className="text-slate-400 font-bold text-[10px] uppercase tracking-tighter">Normal</span>
                                        )}
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="py-12 text-center text-slate-400 italic">
                                    No structured parameters found. Results: {report.resultDetails || 'N/A'}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer / Verification */}
            <div className="mt-12 pt-6 border-t border-slate-200 flex justify-between items-end">
                <div className="space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 italic">Technical Verification</p>
                    <p className="text-xs font-bold">Scientifically verified by: {report.completedBy || 'Lab Scientist'}</p>
                    <p className="text-[8px] text-slate-400">Electronic Record ID: {report.id.toUpperCase()}</p>
                </div>
                <div className="text-right text-[8px] text-slate-400 italic max-w-[250px]">
                    This report is for clinical use only. All critical values have been communicated to the clinical team.
                </div>
            </div>
        </div>
    );
}
