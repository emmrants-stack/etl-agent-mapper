'use client';

import { useState } from 'react';
import { Upload, AlertCircle, CheckCircle2, Zap, TrendingUp, ChevronRight } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  description: string;
}

const TEMPLATES: Template[] = [
  {
    id: 'customers',
    name: 'Customers',
    description: 'Customer Master with Contacts, Addresses, Bank Accounts',
  },
  {
    id: 'assets',
    name: 'Fixed Assets',
    description: 'Fixed Asset Mass Additions - Asset Book, Description, Type, Tag Number',
  },
  {
    id: 'suppliers',
    name: 'Suppliers',
    description: 'Supplier Address - Supplier Name, Address, Country, City',
  },
  {
    id: 'journals',
    name: 'Journal Entries',
    description: 'GL Journal Import - Ledger, Journal Source, Category, Amounts',
  },
  {
    id: 'items',
    name: 'Inventory Items',
    description: 'Item Master - Item Number, Description, Organization, Type',
  },
];

export default function Home() {
  const [step, setStep] = useState<'upload' | 'select-template' | 'analyzing' | 'review' | 'transform' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [mappingResult, setMappingResult] = useState<any>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setStep('select-template');
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
  };

  const handleAnalyze = async () => {
    if (!file || !selectedTemplate) return;
    setStep('analyzing');

    try {
      const formData = new FormData();
      formData.append('file', file);
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
      console.error('Error:', error);
      alert('Failed to analyze file');
      setStep('select-template');
    }
  };

  const handleTransform = async () => {
    if (!mappingResult) return;
    setStep('transform');

    try {
      const response = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mappingResult,
          sourceRows: mappingResult.sourceSchema.sample_rows,
        }),
      });

      if (!response.ok) throw new Error('Transform failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedTemplate}-${Date.now()}.xlsx`;
      a.click();
      setStep('complete');
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to transform');
      setStep('review');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white p-8">
      <div className="max-w-7xl mx-auto mb-12">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-cyan-500/20 rounded-full flex items-center justify-center w-12 h-12">
            <span className="text-cyan-400 font-bold text-lg">OT</span>
          </div>
          <h1 className="text-4xl font-bold">ETL Agent Mapper</h1>
        </div>
        <p className="text-slate-300 text-sm mb-2">Multi-template data mapping for Oracle Fusion</p>
        <p className="text-slate-400 text-lg">Upload your data → Select destination template → Auto-map → Download</p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-5 gap-2 mb-12">
        {['upload', 'select-template', 'analyzing', 'review', 'complete'].map((s, i) => {
          const steps = ['upload', 'select-template', 'analyzing', 'review', 'complete'];
          const currentIdx = steps.indexOf(step);
          const isActive = step === s;
          const isDone = currentIdx > i;

          return (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                  isActive ? 'bg-cyan-500 text-white' : isDone ? 'bg-green-500/30 text-green-400' : 'bg-slate-700 text-slate-400'
                }`}
              >
                {isDone ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className="text-xs font-medium capitalize hidden sm:inline">{s.replace('-', ' ')}</span>
            </div>
          );
        })}
      </div>

      {/* UPLOAD */}
      {step === 'upload' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12">
            <div className="border-2 border-dashed border-slate-600 rounded-xl p-12 text-center hover:border-cyan-400 transition cursor-pointer relative mb-6">
              <input
                type="file"
                accept=".xlsx,.xls,.csv,.json"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">Upload Your Data File</p>
              <p className="text-sm text-slate-400">Drag & drop or click — <strong>.xlsx, .xls, .csv, or .json</strong></p>
              {file && <p className="text-xs text-cyan-400 mt-4">📁 {file.name}</p>}
            </div>
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-300">
              <p className="font-semibold mb-1">Supported formats:</p>
              <p>✓ CSV ✓ Excel ✓ JSON ✓ Denormalized data (Salesforce style)</p>
            </div>
          </div>
        </div>
      )}

      {/* SELECT TEMPLATE */}
      {step === 'select-template' && file && (
        <div className="max-w-6xl mx-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8">
            <h2 className="text-2xl font-bold mb-8">Select Destination Template</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              {TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className={`p-6 rounded-lg border-2 transition text-left ${
                    selectedTemplate === template.id
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-slate-700 bg-slate-700/30 hover:border-slate-600'
                  }`}
                >
                  <p className="font-semibold text-lg mb-2">{template.name}</p>
                  <p className="text-sm text-slate-400">{template.description}</p>
                </button>
              ))}
            </div>

            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setStep('upload')}
                className="px-6 py-3 border border-slate-600 rounded-lg hover:bg-slate-700/50 transition font-semibold"
              >
                Choose Different File
              </button>
              <button
                onClick={handleAnalyze}
                disabled={!selectedTemplate}
                className={`px-8 py-3 rounded-lg transition font-semibold flex items-center gap-2 ${
                  selectedTemplate ? 'bg-cyan-500 hover:bg-cyan-600 cursor-pointer' : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                Continue <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ANALYZING */}
      {step === 'analyzing' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12 text-center">
            <div className="inline-block mb-6">
              <svg className="w-12 h-12 text-cyan-400 animate-bounce" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="20" r="8" fill="currentColor" />
                <line x1="50" y1="28" x2="50" y2="50" stroke="currentColor" strokeWidth="2" />
                <line x1="50" y1="35" x2="30" y2="25" stroke="currentColor" strokeWidth="2" />
                <line x1="50" y1="35" x2="70" y2="25" stroke="currentColor" strokeWidth="2" />
                <line x1="50" y1="50" x2="35" y2="70" stroke="currentColor" strokeWidth="2" />
                <line x1="50" y1="50" x2="65" y2="70" stroke="currentColor" strokeWidth="2" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">Analyzing Your Data...</h2>
            <p className="text-slate-400">Mapping columns to {TEMPLATES.find((t) => t.id === selectedTemplate)?.name}</p>
          </div>
        </div>
      )}

      {/* REVIEW */}
      {step === 'review' && mappingResult && (
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="bg-slate-800 border border-blue-500/30 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-400" />
              Analysis Complete
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-300 font-semibold">{mappingResult.sourceSchema.total_rows}</p>
                <p className="text-slate-400">Source rows</p>
              </div>
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-300 font-semibold">{mappingResult.mappings.summary?.mapped || 0}</p>
                <p className="text-slate-400">Columns mapped</p>
              </div>
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-blue-300 font-semibold">{TEMPLATES.find((t) => t.id === selectedTemplate)?.name}</p>
                <p className="text-slate-400">Destination</p>
              </div>
            </div>
          </div>

          {mappingResult.mappings?.data_quality_issues && mappingResult.mappings.data_quality_issues.length > 0 && (
            <div className="bg-slate-800 border border-amber-500/30 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold">Data Quality Notes</h3>
              </div>
              <div className="space-y-2">
                {mappingResult.mappings.data_quality_issues.slice(0, 3).map((issue: any, i: number) => (
                  <p key={i} className="text-sm text-amber-300">
                    • <span className="font-semibold">{issue.issue_type}:</span> {issue.details}
                  </p>
                ))}
              </div>
            </div>
          )}

          <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-700">
              <h3 className="text-lg font-bold">Column Mappings</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-700/50 border-b border-slate-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Source Column</th>
                    <th className="px-4 py-3 text-left font-semibold">Destination Field</th>
                    <th className="px-4 py-3 text-left font-semibold">Confidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {mappingResult.mappings.mappings?.slice(0, 8).map((m: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-slate-300">
                        {Array.isArray(m.source_columns) ? m.source_columns.join(', ') : m.source_columns}
                      </td>
                      <td className="px-4 py-3 text-cyan-300 font-semibold">{m.destination_field}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded ${m.confidence === 'HIGH' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                          {m.confidence}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex gap-4 justify-end">
            <button
              onClick={() => setStep('select-template')}
              className="px-6 py-3 border border-slate-600 rounded-lg hover:bg-slate-700/50 transition font-semibold"
            >
              Select Different Template
            </button>
            <button
              onClick={handleTransform}
              className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg transition font-semibold flex items-center gap-2"
            >
              <TrendingUp className="w-5 h-5" />
              Generate Excel
            </button>
          </div>
        </div>
      )}

      {/* TRANSFORM */}
      {step === 'transform' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12 text-center">
            <div className="inline-block mb-6 animate-spin">
              <Zap className="w-12 h-12 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Generating Excel...</h2>
            <p className="text-slate-400">Transforming data to {TEMPLATES.find((t) => t.id === selectedTemplate)?.name} format</p>
          </div>
        </div>
      )}

      {/* COMPLETE */}
      {step === 'complete' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800 border border-green-500/30 rounded-2xl p-12 text-center">
            <div className="inline-block mb-6 p-4 bg-green-500/20 rounded-full">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Done!</h2>
            <p className="text-slate-400 mb-8">Excel file ready for {TEMPLATES.find((t) => t.id === selectedTemplate)?.name}</p>
            <button
              onClick={() => {
                setStep('upload');
                setFile(null);
                setSelectedTemplate('');
                setMappingResult(null);
              }}
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
