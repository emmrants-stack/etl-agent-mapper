'use client';

import { useState, useEffect } from 'react';
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

// Animated Loading Component
function AnimatedLoader({ templateName }: { templateName: string }) {
  const [stickmanY, setStickmanY] = useState(0);
  const [roadOffset, setRoadOffset] = useState(0);
  const [obstacles, setObstacles] = useState<{ id: number; x: number; type: 'box' | 'barrier' | 'spike' }[]>([]);
  const [action, setAction] = useState<'run' | 'jump' | 'duck' | 'roll'>('run');

  // Simulate animation
  useEffect(() => {
    let frameCount = 0;
    const interval = setInterval(() => {
      frameCount++;

      // Road animation
      setRoadOffset((prev) => (prev + 3) % 40);

      // Generate obstacles
      if (frameCount % 80 === 0) {
        setObstacles((prev) => [
          ...prev,
          { id: Date.now(), x: 800, type: ['box', 'barrier', 'spike'][Math.floor(Math.random() * 3)] as any },
        ]);
      }

      // Remove offscreen obstacles
      setObstacles((prev) => prev.filter((o) => o.x > -50));

      // Move obstacles
      setObstacles((prev) =>
        prev.map((o) => {
          const newX = o.x - 4;

          // Simple collision detection - change action
          if (newX > 140 && newX < 180) {
            if (o.type === 'spike') {
              setAction('jump');
              setTimeout(() => setAction('run'), 300);
            } else if (o.type === 'barrier') {
              setAction('duck');
              setTimeout(() => setAction('run'), 300);
            } else if (o.type === 'box') {
              setAction('roll');
              setTimeout(() => setAction('run'), 400);
            }
          }

          return { ...o, x: newX };
        })
      );

      // Stickman vertical position based on action
      if (action === 'jump') {
        setStickmanY(Math.sin((frameCount % 20) / 20 * Math.PI) * -30);
      } else if (action === 'duck') {
        setStickmanY(15);
      } else if (action === 'roll') {
        setStickmanY(0);
      } else {
        setStickmanY(0);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [action]);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Game Canvas */}
      <div className="relative w-full max-w-2xl h-48 bg-gradient-to-b from-sky-400 to-sky-200 rounded-lg overflow-hidden border-4 border-cyan-400">
        {/* Sun */}
        <div className="absolute top-4 right-8 w-12 h-12 bg-yellow-300 rounded-full opacity-80" />

        {/* Clouds */}
        <div className="absolute top-8 left-12 w-20 h-8 bg-white rounded-full opacity-70" />
        <div className="absolute top-16 right-20 w-16 h-6 bg-white rounded-full opacity-70" />

        {/* Road */}
        <div className="absolute bottom-0 w-full h-20 bg-gray-700">
          {/* Road lines animation */}
          <div
            className="absolute inset-0 bg-repeat-x"
            style={{
              backgroundImage: 'repeating-linear-gradient(90deg, #ffd700 0px, #ffd700 40px, transparent 40px, transparent 80px)',
              transform: `translateX(${roadOffset}px)`,
            }}
          />
        </div>

        {/* Grass */}
        <div className="absolute bottom-20 w-full h-8 bg-gradient-to-r from-green-500 to-green-600" />

        {/* Obstacles */}
        {obstacles.map((obs) => (
          <div
            key={obs.id}
            className="absolute bottom-20 w-10 h-10 transition-all"
            style={{ left: `${obs.x}px` }}
          >
            {obs.type === 'box' && <div className="w-full h-full bg-red-500 rounded shadow-lg" />}
            {obs.type === 'barrier' && <div className="w-2 h-full bg-orange-600 rounded-full" />}
            {obs.type === 'spike' && (
              <svg viewBox="0 0 40 40" className="w-full h-full">
                <polygon points="20,5 35,35 5,35" fill="#ff4444" />
              </svg>
            )}
          </div>
        ))}

        {/* Stickman */}
        <div
          className="absolute bottom-20 left-24 transition-all"
          style={{ transform: `translateY(${stickmanY}px)` }}
        >
          {action === 'duck' ? (
            // Ducking
            <svg viewBox="0 0 40 40" className="w-10 h-10">
              {/* Head */}
              <circle cx="20" cy="10" r="5" fill="#000" />
              {/* Body (curved) */}
              <path d="M 20 15 Q 25 18 20 22" stroke="#000" strokeWidth="2" fill="none" />
              {/* Legs (crouched) */}
              <line x1="18" y1="22" x2="15" y2="30" stroke="#000" strokeWidth="2" />
              <line x1="22" y1="22" x2="25" y2="30" stroke="#000" strokeWidth="2" />
            </svg>
          ) : action === 'roll' ? (
            // Rolling
            <svg viewBox="0 0 40 40" className="w-10 h-10 animate-spin">
              <circle cx="20" cy="20" r="4" fill="#000" />
              <line x1="20" y1="16" x2="20" y2="24" stroke="#000" strokeWidth="2" />
              <line x1="16" y1="20" x2="24" y2="20" stroke="#000" strokeWidth="2" />
            </svg>
          ) : action === 'jump' ? (
            // Jumping
            <svg viewBox="0 0 40 40" className="w-10 h-10">
              {/* Head */}
              <circle cx="20" cy="8" r="5" fill="#000" />
              {/* Body */}
              <line x1="20" y1="13" x2="20" y2="20" stroke="#000" strokeWidth="2" />
              {/* Arms up */}
              <line x1="20" y1="14" x2="12" y2="8" stroke="#000" strokeWidth="2" />
              <line x1="20" y1="14" x2="28" y2="8" stroke="#000" strokeWidth="2" />
              {/* Legs bent */}
              <line x1="20" y1="20" x2="15" y2="28" stroke="#000" strokeWidth="2" />
              <line x1="20" y1="20" x2="25" y2="28" stroke="#000" strokeWidth="2" />
            </svg>
          ) : (
            // Running
            <svg viewBox="0 0 40 40" className="w-10 h-10">
              {/* Head */}
              <circle cx="20" cy="8" r="5" fill="#000" />
              {/* Body */}
              <line x1="20" y1="13" x2="20" y2="22" stroke="#000" strokeWidth="2" />
              {/* Arms running */}
              <line x1="20" y1="14" x2="14" y2="10" stroke="#000" strokeWidth="2" />
              <line x1="20" y1="14" x2="26" y2="18" stroke="#000" strokeWidth="2" />
              {/* Legs running */}
              <line x1="20" y1="22" x2="16" y2="32" stroke="#000" strokeWidth="2" />
              <line x1="20" y1="22" x2="26" y2="28" stroke="#000" strokeWidth="2" />
            </svg>
          )}
        </div>

        {/* Text overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center bg-black/30 px-4 py-2 rounded-lg">
            <p className="text-white font-bold text-sm">Running the data through Claude...</p>
          </div>
        </div>
      </div>

      {/* Status text */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Analyzing Your Data...</h2>
        <p className="text-slate-400">Mapping columns to {templateName} template</p>
      </div>
    </div>
  );
}

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
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12">
            <AnimatedLoader templateName={TEMPLATES.find((t) => t.id === selectedTemplate)?.name || 'Unknown'} />
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
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-12">
            <AnimatedLoader templateName={TEMPLATES.find((t) => t.id === selectedTemplate)?.name || 'Unknown'} />
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
