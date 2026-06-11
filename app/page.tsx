'use client';

import { useState } from 'react';
import { Upload, AlertCircle, CheckCircle2, Zap, TrendingUp, ChevronDown, Info } from 'lucide-react';

export default function Home() {
  const [step, setStep] = useState<'upload' | 'analyzing' | 'review' | 'transform' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [mappingResult, setMappingResult] = useState<any>(null);
  const [expandedEntity, setExpandedEntity] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setStep('analyzing');

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('template', 'Customers'); // Default, but auto-detection will override

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
      setStep('upload');
    }
  };

  const handleTransform = async () => {
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
      a.download = `oracle-fusion-${Date.now()}.xlsx`;
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
        <p className="text-slate-300 text-sm mb-2">Multi-entity data mapping - auto-detects all Oracle entities</p>
        <p className="text-slate-400 text-lg">Upload once → Maps to all 4 Oracle Fusion templates → Download complete Excel</p>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-4 gap-3 mb-12">
        {['upload', 'review', 'transform', 'complete'].map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
              step === s ? 'bg-cyan-500 text-white' :
              ['upload', 'review', 'transform', 'complete'].indexOf(step) > i ? 'bg-green-500/30 text-green-400' :
              'bg-slate-700 text-slate-400'
            }`}>
              {['upload', 'review', 'transform', 'complete'].indexOf(step) > i ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
            </div>
            <span className="text-sm font-medium capitalize">{s}</span>
          </div>
        ))}
      </div>

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
              <p className="text-sm text-slate-400">Drag & drop or click to select <strong>.xlsx, .xls, .csv, or .json</strong></p>
              {file && <p className="text-xs text-cyan-400 mt-4">📁 {file.name}</p>}
            </div>
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-300">
              <p className="font-semibold mb-1">✓ Auto-detects all entities and maps to:</p>
              <p>Customers • Contacts • Reference Accounts • Bank Accounts</p>
            </div>
          </div>
        </div>
      )}

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
            <p className="text-slate-400">Detecting entities, normalizing, mapping to all templates</p>
          </div>
        </div>
      )}

      {step === 'review' && mappingResult && (
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Entities Detected */}
          {mappingResult.detected_entities && mappingResult.detected_entities.length > 0 && (
            <div className="bg-slate-800 border border-green-500/30 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-700 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <h3 className="text-lg font-bold">Entities Detected ({mappingResult.detected_entities.length})</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 p-6">
                {mappingResult.detected_entities.map((entity: any, i: number) => (
                  <div
                    key={i}
                    className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg cursor-pointer hover:bg-green-500/20"
                    onClick={() => setExpandedEntity(expandedEntity === entity.name ? null : entity.name)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-green-300">{entity.name}</p>
                        <p className="text-sm text-slate-400">Confidence: {Math.round(entity.confidence * 100)}%</p>
                      </div>
                      <ChevronDown className={`w-4 h-4 transition ${expandedEntity === entity.name ? 'rotate-180' : ''}`} />
                    </div>
                    {expandedEntity === entity.name && (
                      <div className="mt-3 pt-3 border-t border-green-500/30 text-sm text-slate-300">
                        <p className="font-semibold mb-1">Key indicators:</p>
                        <p>{entity.key_indicators.slice(0, 3).join(', ')}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Entity Analysis */}
          {mappingResult.entity_analysis && (
            <div className="bg-slate-800 border border-blue-500/30 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-700 flex items-center gap-3">
                <Info className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-bold">Per-Entity Analysis</h3>
              </div>
              <div className="space-y-4 p-6">
                {Object.keys(mappingResult.entity_mappings || {}).map((entityType: string) => {
                  const mapping = mappingResult.entity_mappings[entityType];
                  const rows = mappingResult.entity_rows[entityType] || [];
                  return (
                    <div key={entityType} className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-blue-300">{entityType}</p>
                        <span className="text-sm text-blue-400">{rows.length} rows</span>
                      </div>
                      <p className="text-sm text-slate-400">Mapped columns: {mapping.column_mappings?.length || 0}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Warnings */}
          {mappingResult.entity_analysis?.warnings && mappingResult.entity_analysis.warnings.length > 0 && (
            <div className="bg-slate-800 border border-amber-500/30 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-bold">Notes</h3>
              </div>
              <div className="space-y-2">
                {mappingResult.entity_analysis.warnings.map((w: string, i: number) => (
                  <p key={i} className="text-sm text-amber-300">• {w}</p>
                ))}
              </div>
            </div>
          )}

          {/* Data Preview */}
          {mappingResult.sourceSchema.sample_rows?.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
              <div className="p-6 border-b border-slate-700">
                <h3 className="text-lg font-bold">Data Preview (First 3 Rows)</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-700/50 border-b border-slate-700">
                    <tr>
                      {mappingResult.sourceSchema.headers.slice(0, 8).map((h: string) => (
                        <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                      ))}
                      {mappingResult.sourceSchema.headers.length > 8 && <th className="px-4 py-3 text-slate-500">+{mappingResult.sourceSchema.headers.length - 8}</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {mappingResult.sourceSchema.sample_rows.slice(0, 3).map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-700/30">
                        {mappingResult.sourceSchema.headers.slice(0, 8).map((h: string) => (
                          <td key={h} className="px-4 py-3 text-slate-300 truncate max-w-xs">{row[h] || '—'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end">
            <button onClick={() => setStep('upload')} className="px-6 py-3 border border-slate-600 rounded-lg hover:bg-slate-700/50 transition font-semibold">
              Upload Different File
            </button>
            <button onClick={handleTransform} className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg transition font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Generate Excel (All 4 Sheets)
            </button>
          </div>
        </div>
      )}

      {step === 'transform' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12 text-center">
            <div className="inline-block mb-6 animate-spin">
              <Zap className="w-12 h-12 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Generating Multi-Sheet Excel...</h2>
            <p className="text-slate-400">Populating Customers, Contacts, Accounts, and Bank Accounts sheets</p>
          </div>
        </div>
      )}

      {step === 'complete' && (
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800 border border-green-500/30 rounded-2xl p-12 text-center">
            <div className="inline-block mb-6 p-4 bg-green-500/20 rounded-full">
              <CheckCircle2 className="w-12 h-12 text-green-400" />
            </div>
            <h2 className="text-3xl font-bold mb-4">Complete!</h2>
            <p className="text-slate-400 mb-8">Multi-sheet Excel file generated with all 4 templates populated.</p>
            <button onClick={() => setStep('upload')} className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 rounded-lg transition font-semibold">
              Transform Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
