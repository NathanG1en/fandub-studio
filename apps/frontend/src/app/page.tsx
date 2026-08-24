'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Youtube, ArrowRight, Mic, Users, PlayCircle, Loader2 } from 'lucide-react';

export default function Home() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!youtubeUrl.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ youtube_url: youtubeUrl }),
      });

      if (!res.ok) throw new Error('Failed to create project');
      const data = await res.json();
      router.push(`/project/${data.id}`);
    } catch (err) {
      alert('Error creating project. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-between p-6 md:p-12">
      {/* Header Bar */}
      <header className="w-full max-w-5xl flex items-center justify-between py-4 border-b border-zinc-800/80">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-zinc-100 text-zinc-950 font-bold flex items-center justify-center font-mono-code text-xs">
            FS
          </div>
          <span className="text-base font-bold tracking-tight text-zinc-100">
            FanDub<span className="text-zinc-500 font-normal ml-1">Studio</span>
          </span>
        </div>

        <div className="flex items-center gap-2 border border-zinc-800 bg-zinc-900/60 px-3 py-1 rounded text-xs font-mono-code text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>v1.0 • Diarization Pipeline</span>
        </div>
      </header>

      {/* Hero Section */}
      <div className="max-w-3xl text-center my-auto flex flex-col items-center gap-8 py-16">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-zinc-800 bg-zinc-900/40 text-xs font-mono-code text-zinc-400 uppercase tracking-wider">
          Collaborative Video Dubbing
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-zinc-50 tracking-tight leading-tight">
          Turn Any Video Into A Custom Fan Dub
        </h1>

        <p className="text-sm md:text-base text-zinc-400 max-w-xl leading-relaxed">
          Paste a YouTube URL. Automated speaker diarization separates dialogue by character. Invite collaborators, record browser voiceovers, and export your dubbed video.
        </p>

        {/* Minimal Input Bar */}
        <form
          onSubmit={handleCreateProject}
          className="w-full max-w-xl bg-zinc-900/90 p-2 rounded-lg border border-zinc-800 focus-within:border-zinc-700 flex flex-col md:flex-row items-center gap-2"
        >
          <div className="relative flex-1 w-full flex items-center pl-3 pr-2">
            <Youtube className="w-5 h-5 text-red-500 shrink-0 mr-2.5" />
            <input
              type="url"
              required
              placeholder="Paste YouTube Video URL..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="w-full bg-transparent text-zinc-100 placeholder-zinc-500 focus:outline-none text-sm py-2 font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full md:w-auto px-5 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 font-bold text-xs rounded uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shrink-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...
              </>
            ) : (
              <>
                Create Studio <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Minimal Grid Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full mt-8 text-left">
          <div className="minimal-card minimal-card-hover p-5 flex flex-col gap-2">
            <div className="w-7 h-7 rounded bg-zinc-800 flex items-center justify-center text-zinc-300">
              <PlayCircle className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider mt-1">1. Speaker Detection</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">Silero VAD isolates dialogue clips and generates speaker swimlanes automatically.</p>
          </div>

          <div className="minimal-card minimal-card-hover p-5 flex flex-col gap-2">
            <div className="w-7 h-7 rounded bg-zinc-800 flex items-center justify-center text-zinc-300">
              <Mic className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider mt-1">2. Browser Mic Take</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">Record replacement voice tracks directly from your microphone with instant take preview.</p>
          </div>

          <div className="minimal-card minimal-card-hover p-5 flex flex-col gap-2">
            <div className="w-7 h-7 rounded bg-zinc-800 flex items-center justify-center text-zinc-300">
              <Users className="w-4 h-4" />
            </div>
            <h3 className="text-xs font-bold text-zinc-100 uppercase tracking-wider mt-1">3. Live Sync & Export</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">Collaborate via WebSockets and render a finished MP4 fan dub using FFmpeg audio mixing.</p>
          </div>
        </div>
      </div>

      {/* Minimal Footer */}
      <footer className="text-xs font-mono-code text-zinc-600 py-4 border-t border-zinc-900 w-full text-center">
        FanDub Studio — Swiss Industrial Minimalist Interface
      </footer>
    </main>
  );
}
