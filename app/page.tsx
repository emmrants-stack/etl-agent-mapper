'use client';

import { useState } from 'react';
import { ChevronDown, Upload, AlertCircle, CheckCircle2, Zap, TrendingUp } from 'lucide-react';

export default function Home() {
  const [step, setStep] = useState<'upload' | 'analyzing' | 'review' | 'transform' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [mappingResult, setMappingResult] = useState<any>(null);
  const [selectedTemplate, setSelectedTemplate] = useState('Customers');
  const [confirmMapping, setConfirmMapping] = useState(false);

  const templates = ['Customers', 'Contacts', 'Reference Accounts', 'Bank Accounts'];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setStep('analyzing');

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('template', selectedTemplate);

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Analysis failed');
      const result = await response.json();

      setMappingResult(result);
      setStep('review');
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to analyze file');
      setStep('upload');
    }
  };

  const handleConfirmMapping = async () => {
    setStep('transform');
    try {
      const response = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappingResult }),
      });

      if (!response.ok) throw new Error('Transform failed');
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transformed_${Date.now()}.xlsx`;
      a.click();

      setStep('complete');
    } catch (error) {
      console.error('Transform error:', error);
      alert('Failed to transform data');
      setStep('review');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <div className="max-w-6xl mx-auto mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-cyan-500/20 rounded-full flex items-center justify-center w-12 h-12">
            <span className="text-cyan-400 font-bold text-lg">OT</span>
          </div>
          <h1 className="text-4xl font-bold">ETL Agent Mapper</h1>
        </div>
        <p className="text-slate-300 text-sm mb-2">A prototype attempt to automate data mapping for our customers and projects</p>
        <p className="text-slate-400 text-lg">Automated data mapping from raw files to ERP templates</p>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-3 gap-4 mb-12">
        {['upload', 'review', 'transform', 'complete'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition ${
                step === s
                  ? 'bg-cyan-500 text-white'
                  : ['upload', 'review', 'transform', 'complete'].indexOf(step) > i
                    ? 'bg-green-500/30 text-green-400'
                    : 'bg-slate-700 text-slate-400'
              }`}
            >
              {['upload', 'review', 'transform', 'complete'].indexOf(step) > i ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                i + 1
              )}
            </div>
            <span className="text-sm font-medium capitalize">{s}</span>
          </div>
        ))}
      </div>

      {step === 'upload' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12">
            <div className="mb-8">
              <label className="block text-sm font-semibold mb-4">Select Destination Template</label>
              <div className="grid grid-cols-2 gap-4">
                {templates.map((t) => (
                  <button
                    key={t}
                    onClick={() => setSelectedTemplate(t)}
                    className={`p-4 rounded-lg border-2 transition text-left ${
                      selectedTemplate === t
                        ? 'border-cyan-500 bg-cyan-500/10'
                        : 'border-slate-700 bg-slate-700/30 hover:border-slate-600'
                    }`}
                  >
                    <div className="font-medium">{t}</div>
                    <div className="text-xs text-slate-400 mt-1">Upload to {t.toLowerCase()}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-2 border-dashed border-slate-600 rounded-xl p-12 text-center hover:border-cyan-400 transition cursor-pointer relative">
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
                disabled={step !== 'upload'}
              />
              <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">Upload Your Data File</p>
              <p className="text-sm text-slate-400">
                Drag & drop or click to select <strong>.xlsx, .xls, or .csv</strong>
              </p>
              {file && <p className="text-xs text-cyan-400 mt-4">Selected: {file.name}</p>}
            </div>
          </div>
        </div>
      )}

      {step === 'analyzing' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12 text-center">
            <div className="inline-block mb-6">
              <svg className="w-12 h-12 text-cyan-400 animate-bounce" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                {/* Head */}
                <circle cx="50" cy="20" r="8" fill="currentColor" />
                {/* Body */}
                <line x1="50" y1="28" x2="50" y2="50" stroke="currentColor" strokeWidth="2" />
                {/* Left arm */}
                <line x1="50" y1="35" x2="30" y2="25" stroke="currentColor" strokeWidth="2" />
                {/* Right arm */}
                <line x1="50" y1="35" x2="70" y2="25" stroke="currentColor" strokeWidth="2" />
                {/* Left leg */}
                <line x1="50" y1="50" x2="35" y2="70" stroke="currentColor" strokeWidth="2" />
                {/* Right leg */}
                <line x1="50" y1="50" x2="65" y2="70" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Analyzing Your Data...</h2>
            <p className="text-slate-400">
              Claude is mapping your columns to the destination template <br /> and flagging data quality issues.
            </p>
          </div>
        </div>
      )}

      {step === 'review' && mappingResult && (
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="grid grid-cols-4 gap-4">
            {[
              {
                label: 'Source Columns',
                value: mappingResult.mappings.summary.total_source_columns,
                color: 'cyan',
              },
              { label: 'Mapped', value: mappingResult.mappings.summary.mapped_columns, color: 'green' },
              {
                label: 'Unmapped',
                value: mappingResult.mappings.summary.unmapped_columns,
                color: 'amber',
              },
              { label: 'Issues Found', value: mappingResult.mappings.data_quality_issues.length, color: 'red' },
            ].map((stat) => (
              <div
                key={stat.label}
                className={`bg-${stat.color}-500/10 border border-${stat.color}-500/30 rounded-lg p-6`}
              >
                <div className={`text-3xl font-bold text-${stat.color}-400 mb-2`}>{stat.value}</div>
                <div className="text-sm text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-lg font-bold">Column Mappings</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-700/50 border-b border-slate-700">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Source Column</th>
                    <th className="px-6 py-3 text-left font-semibold">Destination Field</th>
                    <th className="px-6 py-3 text-left font-semibold">Confidence</th>
                    <th className="px-6 py-3 text-left font-semibold">Transformation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {mappingResult.mappings.mappings.slice(0, 10).map((m: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-700/30 transition">
                      <td className="px-6 py-4 font-mono text-cyan-400">
                        {Array.isArray(m.source_columns) ? m.source_columns.join(', ') : m.source_column || 'N/A'}
                      </td>
                      <td className="px-6 py-4">{m.destination_field || '—'}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            m.confidence === 'HIGH'
                              ? 'bg-green-500/20 text-green-400'
                              : m.confidence === 'MEDIUM'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-slate-500/20 text-slate-400'
                          }`}
                        >
                          {m.confidence}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400">{m.transformation || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {mappingResult.mappings.mappings.length > 10 && (
              <div className="p-4 text-center text-sm text-slate-400 border-t border-slate-700">
                Showing 10 of {mappingResult.mappings.mappings.length} mappings
              </div>
            )}
          </div>

          {mappingResult.mappings.data_quality_issues.length > 0 && (
            <div className="bg-slate-800 border border-red-500/30 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-700 flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <h3 className="text-lg font-bold">Data Quality Issues</h3>
              </div>
              <div className="space-y-4 p-6">
                {mappingResult.mappings.data_quality_issues.map((issue: any, i: number) => (
                  <div key={i} className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start gap-3">
                      <div className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 uppercase">
                        {issue.severity || issue.type}
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-red-300 mb-1">{issue.issue || issue.details}</p>
                        <p className="text-sm text-slate-400 mb-2">
                          Columns: {Array.isArray(issue.affected_columns) ? issue.affected_columns.join(', ') : 'N/A'}
                        </p>
                        <p className="text-sm text-red-300">{issue.details}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4 justify-end">
            <button
              onClick={() => setStep('upload')}
              className="px-6 py-3 border border-slate-600 rounded-lg hover:bg-slate-700/50 transition font-semibold"
            >
              Upload Different File
            </button>
            <button
              onClick={handleConfirmMapping}
              className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg transition font-semibold flex items-center gap-2"
            >
              <TrendingUp className="w-5 h-5" />
              Proceed to Transform
            </button>
          </div>
        </div>
      )}

      {step === 'transform' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12 text-center">
            <div className="inline-block mb-6">
              <div className="animate-spin">
                <Zap className="w-12 h-12 text-cyan-400" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Transforming Data...</h2>
            <p className="text-slate-400">
              Applying mappings and generating cleaned file <br /> ready for upload to your ERP system.
            </p>
          </div>
        </div>
      )}

      {step === 'complete' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800 border border-green-500/30 rounded-2xl p-12 text-center">
            <div className="inline-block mb-6 p-4 bg-green-500/20 rounded-full">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Transformation Complete!</h2>
            <p className="text-slate-400 mb-8">
              Your file has been cleaned and mapped to the destination template.<br />
              Download started. Ready to upload to your ERP system.
            </p>
            <button
              onClick={() => setStep('upload')}
              className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg transition font-semibold"
            >
              Transform Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
