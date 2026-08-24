'use client';

import { useState } from 'react';
import { Film, Download, CheckCircle2, Loader2, X } from 'lucide-react';

interface ExportModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  exportUrl?: string | null;
  onTriggerExport: () => Promise<string | null>;
}

export function ExportModal({ projectId, isOpen, onClose, exportUrl, onTriggerExport }: ExportModalProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(exportUrl || null);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const url = await onTriggerExport();
      if (url) {
        setDownloadUrl(url);
      }
    } catch (err) {
      alert('Failed to render export.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
      <div className="minimal-card w-full max-w-md p-6 border border-zinc-800 relative flex flex-col gap-4 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-200 p-1 rounded hover:bg-zinc-800"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 border-b border-zinc-800 pb-3">
          <div className="w-8 h-8 rounded bg-zinc-800 text-zinc-200 flex items-center justify-center font-bold">
            <Film className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100">Export Fan Dub Video</h3>
            <p className="text-xs text-zinc-500 font-mono-code">FFmpeg Audio Track Mixing</p>
          </div>
        </div>

        {!downloadUrl ? (
          <div className="flex flex-col gap-4 py-2 items-center text-center">
            <p className="text-xs text-zinc-400 leading-relaxed">
              Compile replacement voiceover recordings into a finished <span className="text-zinc-200 font-bold">.MP4</span> video file.
            </p>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs rounded uppercase tracking-wider disabled:opacity-50 transition-colors"
            >
              {isExporting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Rendering MP4...
                </>
              ) : (
                <>
                  <Film className="w-4 h-4" /> Start Export
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-4 py-2 items-center text-center">
            <div className="w-10 h-10 rounded bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-zinc-100">Render Complete</h4>
              <p className="text-xs text-zinc-500 font-mono-code mt-0.5">Your video is ready to download.</p>
            </div>

            <a
              href={downloadUrl}
              download
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs rounded uppercase tracking-wider transition-colors"
            >
              <Download className="w-4 h-4" /> Download MP4 Video
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
