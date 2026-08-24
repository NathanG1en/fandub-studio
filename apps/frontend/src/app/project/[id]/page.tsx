'use client';

import { useEffect, useState, use, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Film, Share2, Download, ArrowLeft, Loader2, Check, Settings2 } from 'lucide-react';
import { VideoPlayer } from '@/components/VideoPlayer';
import { SpeakerPanel } from '@/components/SpeakerPanel';
import { ExportModal } from '@/components/ExportModal';
import { DiarizationSelector } from '@/components/DiarizationSelector';
import { useWebSocket } from '@/hooks/useWebSocket';

const WaveformTimeline = dynamic(
  () => import('@/components/WaveformTimeline').then((m) => m.WaveformTimeline),
  {
    ssr: false,
    loading: () => (
      <div className="minimal-card p-6 flex flex-col items-center justify-center text-zinc-500 py-12">
        <Loader2 className="w-5 h-5 animate-spin mb-2" />
        <span className="text-xs font-mono-code">Loading Timeline Canvas...</span>
      </div>
    ),
  }
);

const AudioRecorder = dynamic(
  () => import('@/components/AudioRecorder').then((m) => m.AudioRecorder),
  {
    ssr: false,
    loading: () => (
      <div className="minimal-card p-6 flex flex-col items-center justify-center text-zinc-500 py-8">
        <span className="text-xs font-mono-code">Loading Microphone Studio...</span>
      </div>
    ),
  }
);

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectStudio({ params }: PageProps) {
  const { id: projectId } = use(params);

  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDiarizationSelectorOpen, setIsDiarizationSelectorOpen] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
        if (!selectedSegmentId && data.segments?.length > 0) {
          setSelectedSegmentId(data.segments[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching project:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedSegmentId]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  useEffect(() => {
    if (!project || project.status === 'ready' || project.status === 'error') return;
    const interval = setInterval(fetchProject, 3000);
    return () => clearInterval(interval);
  }, [project, fetchProject]);

  const handleWSMessage = useCallback((event: any) => {
    if (event.type === 'project_ready' || event.type === 'speaker_renamed' || event.type === 'segment_updated' || event.type === 'recording_uploaded') {
      fetchProject();
    }
  }, [fetchProject]);

  useWebSocket(projectId, handleWSMessage);

  const handleRunDiarization = async (providerId: string, numSpeakers: number, enableSAMAudio: boolean) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/resegment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: providerId,
          num_speakers: numSpeakers,
          enable_sam_audio: enableSAMAudio,
        }),
      });
      if (res.ok) {
        fetchProject();
      }
    } catch (err) {
      console.error('Error running diarization:', err);
    }
  };

  const handleSplitSegment = async (segmentId: string, splitTime: number) => {
    try {
      const res = await fetch(`/api/segments/${segmentId}/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ split_time: splitTime }),
      });
      if (res.ok) {
        fetchProject();
      }
    } catch (err) {
      console.error('Error splitting segment:', err);
    }
  };

  const handleMergeSegments = async (segmentIds: string[]) => {
    try {
      const res = await fetch('/api/segments/merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ segment_ids: segmentIds }),
      });
      if (res.ok) {
        fetchProject();
      }
    } catch (err) {
      console.error('Error merging segments:', err);
    }
  };

  const handleUpdateSpeaker = async (speakerId: string, name: string, color: string) => {
    try {
      await fetch(`/api/speakers/${speakerId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      });
      fetchProject();
    } catch (err) {
      console.error('Error updating speaker:', err);
    }
  };

  const handleAssignSpeakerToSegment = async (speakerId: string) => {
    if (!selectedSegmentId) return;
    try {
      await fetch(`/api/segments/${selectedSegmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speaker_id: speakerId }),
      });
      fetchProject();
    } catch (err) {
      console.error('Error assigning speaker to segment:', err);
    }
  };

  const handleUploadRecording = async (segmentId: string, audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'voiceover.webm');
    formData.append('uploaded_by', 'Creator Participant');

    const res = await fetch(`/api/segments/${segmentId}/recordings`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    fetchProject();
  };

  const handleTriggerExport = async (): Promise<string | null> => {
    const res = await fetch(`/api/projects/${projectId}/export`, {
      method: 'POST',
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.export_url || null;
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center gap-3 text-zinc-400">
        <Loader2 className="w-6 h-6 animate-spin text-zinc-100" />
        <p className="text-xs font-mono-code">Loading Workspace...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center gap-4 text-zinc-400">
        <p className="text-sm font-bold text-zinc-100">Project not found.</p>
        <Link href="/" className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-mono-code">
          <ArrowLeft className="w-3.5 h-3.5" /> Return Home
        </Link>
      </div>
    );
  }

  const selectedSegment = project.segments?.find((s: any) => s.id === selectedSegmentId);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col">
      {/* Studio Header */}
      <header className="w-full bg-[#121215] border-b border-zinc-800 px-6 py-3 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <Link href="/" className="p-1.5 rounded bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded bg-zinc-800 text-zinc-200 flex items-center justify-center font-mono-code text-xs font-bold">
              FS
            </div>
            <div>
              <h1 className="text-sm font-bold text-zinc-100 max-w-md truncate">{project.title}</h1>
              <div className="flex items-center gap-2 text-xs font-mono-code text-zinc-400">
                <span className="uppercase text-[10px] text-emerald-400 font-semibold">{project.status}</span>
                <span>•</span>
                <span>{project.speakers?.length || 0} Speakers</span>
                <span>•</span>
                <span>{project.segments?.length || 0} Segments</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsDiarizationSelectorOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono-code text-zinc-300 transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5 text-blue-400" /> Diarization Settings
          </button>

          <button
            onClick={copyInviteLink}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono-code text-zinc-300 transition-colors"
          >
            {copiedInvite ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied Link
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" /> Invite Link
              </>
            )}
          </button>

          <button
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-bold uppercase tracking-wider transition-colors"
          >
            <Download className="w-3.5 h-3.5" /> Export Dub
          </button>
        </div>
      </header>

      {/* Main Studio Area */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl w-full mx-auto">
        {/* Left Column: Video & Timeline */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <VideoPlayer
            videoUrl={project.video_url}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onTimeUpdate={(t) => setCurrentTime(t)}
            onPlayPauseToggle={() => setIsPlaying(!isPlaying)}
            onSeekRelative={(delta) => setCurrentTime(Math.max(0, currentTime + delta))}
          />

          <WaveformTimeline
            audioUrl={project.audio_url}
            segments={project.segments || []}
            speakers={project.speakers || []}
            selectedSegmentId={selectedSegmentId}
            onSelectSegment={(id) => {
              setSelectedSegmentId(id);
              const seg = project.segments?.find((s: any) => s.id === id);
              if (seg) setCurrentTime(seg.start_time);
            }}
            currentTime={currentTime}
            isPlaying={isPlaying}
            onPlayPauseToggle={() => setIsPlaying(!isPlaying)}
            onSeek={(time) => setCurrentTime(time)}
            onResegment={() => setIsDiarizationSelectorOpen(true)}
            onSplitSegment={handleSplitSegment}
            onMergeSegments={handleMergeSegments}
          />
        </div>

        {/* Right Column: Speakers & Recorder */}
        <div className="flex flex-col gap-6">
          <SpeakerPanel
            speakers={project.speakers || []}
            onUpdateSpeaker={handleUpdateSpeaker}
            selectedSegmentId={selectedSegmentId}
            selectedSegmentSpeakerId={selectedSegment?.speaker_id}
            onAssignSpeakerToSegment={handleAssignSpeakerToSegment}
          />

          <AudioRecorder
            segmentId={selectedSegmentId}
            onUploadRecording={handleUploadRecording}
            existingRecordings={selectedSegment?.recordings || []}
          />
        </div>
      </main>

      {/* Diarization Selector Modal */}
      <DiarizationSelector
        projectId={projectId}
        isOpen={isDiarizationSelectorOpen}
        onClose={() => setIsDiarizationSelectorOpen(false)}
        onRunDiarization={handleRunDiarization}
      />

      {/* Export Modal */}
      <ExportModal
        projectId={projectId}
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        exportUrl={project.exports?.[0]?.export_url}
        onTriggerExport={handleTriggerExport}
      />
    </div>
  );
}
