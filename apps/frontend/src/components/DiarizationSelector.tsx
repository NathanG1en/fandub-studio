'use client';

import { useState, useEffect } from 'react';
import { Cpu, Sparkles, Check, X, Loader2, Layers, AlertTriangle } from 'lucide-react';

interface DiarizationProvider {
  id: string;
  name: string;
  available: boolean;
  status_message?: string;
}

interface DiarizationSelectorProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onRunDiarization: (providerId: string, numSpeakers: number, enableSAMAudio: boolean) => Promise<void>;
}

export function DiarizationSelector({ projectId, isOpen, onClose, onRunDiarization }: DiarizationSelectorProps) {
  const [providers, setProviders] = useState<DiarizationProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('spectral_vad');
  const [numSpeakers, setNumSpeakers] = useState<number>(2);
  const [enableSAMAudio, setEnableSAMAudio] = useState<boolean>(true);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProviders() {
      try {
        const res = await fetch('/api/diarization/providers');
        if (res.ok) {
          const data = await res.json();
          setProviders(data);
        }
      } catch (err) {
        console.error('Error fetching diarization providers:', err);
      }
    }
    if (isOpen) {
      setErrorMessage(null);
      fetchProviders();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    setIsRunning(true);
    setErrorMessage(null);
    try {
      await onRunDiarization(selectedProvider, numSpeakers, enableSAMAudio);
      onClose();
    } catch (err: any) {
      const msg = err?.message || 'Failed to run diarization microservice.';
      setErrorMessage(msg);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
      <div className="minimal-card w-full max-w-lg p-6 border border-zinc-800 relative flex flex-col gap-5 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 border-b border-zinc-800 pb-3.5">
          <div className="w-8 h-8 rounded bg-zinc-800 text-zinc-200 flex items-center justify-center font-bold">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Diarization & Audio Isolation Engine</h3>
            <p className="text-xs text-zinc-500 font-mono-code">Select Diarization Technique & SAM-Audio Separation</p>
          </div>
        </div>

        {/* Explicit Failure Banner */}
        {errorMessage && (
          <div className="p-3 bg-red-950/60 border border-red-800/80 rounded flex items-start gap-2.5 text-xs text-red-200 font-mono-code">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold uppercase tracking-wider block text-red-400 mb-0.5">Diarization Failed</span>
              <span>{errorMessage}</span>
            </div>
          </div>
        )}

        {/* Diarization Provider Options */}
        <div className="flex flex-col gap-2.5">
          <label className="text-xs font-mono-code uppercase text-zinc-400 font-bold tracking-wider">
            1. Select Speaker Diarization Technique ("WHO spoke WHEN?")
          </label>

          <div className="flex flex-col gap-2">
            {providers.map((p) => {
              const isSelected = selectedProvider === p.id;

              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProvider(p.id)}
                  className={`p-3 rounded border text-left flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-zinc-900 border-zinc-100 text-zinc-100'
                      : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Cpu className={`w-4 h-4 ${isSelected ? 'text-blue-400' : 'text-zinc-500'}`} />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{p.name}</span>
                      {p.status_message && (
                        <span className="text-[10px] text-zinc-500 font-mono-code">{p.status_message}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-mono-code px-2 py-0.5 rounded border ${
                      p.available
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-zinc-800 border-zinc-700 text-zinc-500'
                    }`}>
                      {p.available ? 'Ready' : 'CPU Fallback'}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-zinc-100 ml-1" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Speaker Count & SAM-Audio Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono-code uppercase text-zinc-400 tracking-wider">
              Expected Speaker Count
            </label>
            <select
              value={numSpeakers}
              onChange={(e) => setNumSpeakers(parseInt(e.target.value))}
              className="bg-black border border-zinc-800 text-zinc-100 text-xs rounded px-3 py-2 font-mono-code focus:outline-none focus:border-zinc-600"
            >
              <option value={2}>2 Speakers (Duet / Dialogue)</option>
              <option value={3}>3 Speakers</option>
              <option value={4}>4 Speakers</option>
              <option value={5}>5+ Speakers</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-mono-code uppercase text-zinc-400 tracking-wider">
              SAM-Audio Target Isolation
            </label>
            <button
              type="button"
              onClick={() => setEnableSAMAudio(!enableSAMAudio)}
              className={`flex items-center justify-between px-3 py-2 rounded border text-xs font-mono-code transition-colors ${
                enableSAMAudio
                  ? 'bg-zinc-900 border-blue-500/50 text-blue-400'
                  : 'bg-black border-zinc-800 text-zinc-500'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> SAM-Audio Isolation
              </span>
              <span>{enableSAMAudio ? 'ENABLED' : 'DISABLED'}</span>
            </button>
          </div>
        </div>

        {/* Submit Action */}
        <button
          onClick={handleSubmit}
          disabled={isRunning}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs rounded uppercase tracking-wider disabled:opacity-50 transition-colors mt-2"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Running Multimodal Pipeline...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" /> Run Diarization & Separation
            </>
          )}
        </button>
      </div>
    </div>
  );
}
