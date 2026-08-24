'use client';

import { useEffect, useRef, useState } from 'react';
import { Play, Pause, ZoomIn, ZoomOut, Volume2, Sparkles, Scissors, Combine } from 'lucide-react';

interface Speaker {
  id: string;
  name: string;
  color: string;
}

interface DialogueSegment {
  id: string;
  speaker_id: string | null;
  start_time: number;
  end_time: number;
  speaker?: Speaker | null;
  recordings?: any[];
}

interface WaveformTimelineProps {
  audioUrl?: string;
  segments: DialogueSegment[];
  speakers: Speaker[];
  selectedSegmentId: string | null;
  onSelectSegment: (segmentId: string) => void;
  currentTime: number;
  isPlaying: boolean;
  onPlayPauseToggle: () => void;
  onSeek: (time: number) => void;
  onResegment?: () => void;
  onSplitSegment?: (segmentId: string, splitTime: number) => void;
  onMergeSegments?: (segmentIds: string[]) => void;
}

export function WaveformTimeline({
  audioUrl,
  segments,
  speakers,
  selectedSegmentId,
  onSelectSegment,
  currentTime,
  isPlaying,
  onPlayPauseToggle,
  onSeek,
  onResegment,
  onSplitSegment,
  onMergeSegments,
}: WaveformTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<any>(null);
  const [selectedForMerge, setSelectedForMerge] = useState<string[]>([]);

  useEffect(() => {
    if (!containerRef.current || !audioUrl) return;

    let isMounted = true;

    async function initWaveSurfer() {
      try {
        const WaveSurfer = (await import('wavesurfer.js')).default;
        if (!isMounted || !containerRef.current) return;

        const ws = WaveSurfer.create({
          container: containerRef.current,
          waveColor: '#27272a',
          progressColor: '#3b82f6',
          cursorColor: '#ffffff',
          cursorWidth: 1,
          height: 70,
          barWidth: 2,
          barGap: 1,
          url: audioUrl,
        });

        ws.on('interaction', (newTime) => {
          onSeek(newTime);
        });

        wavesurferRef.current = ws;
      } catch (err) {
        console.error('Error initializing WaveSurfer:', err);
      }
    }

    initWaveSurfer();

    return () => {
      isMounted = false;
      if (wavesurferRef.current) {
        try {
          wavesurferRef.current.destroy();
        } catch (e) {}
      }
    };
  }, [audioUrl]);

  const maxTime = Math.max(12, ...segments.map((s) => s.end_time));
  const activeSegment = segments.find((s) => s.id === selectedSegmentId);

  const toggleMergeSelect = (segId: string) => {
    if (selectedForMerge.includes(segId)) {
      setSelectedForMerge(selectedForMerge.filter((id) => id !== segId));
    } else {
      setSelectedForMerge([...selectedForMerge, segId]);
    }
  };

  return (
    <div className="minimal-card p-4 flex flex-col gap-4">
      {/* Controls Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onPlayPauseToggle}
            className="w-9 h-9 rounded bg-zinc-100 hover:bg-white text-zinc-950 flex items-center justify-center font-bold"
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <div className="flex flex-col">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 font-mono-code">
              Timeline Master
            </span>
            <div className="text-xs font-mono-code text-zinc-300">
              <span className="text-zinc-100 font-bold">{currentTime.toFixed(1)}s</span> / {maxTime.toFixed(1)}s
            </div>
          </div>
        </div>

        {/* SAM-Audio & Editing Actions */}
        <div className="flex items-center gap-2">
          {onResegment && (
            <button
              onClick={onResegment}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono-code text-zinc-200 transition-colors"
              title="Re-run Meta SAM-Audio Speaker Diarization"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" /> SAM-Audio Re-segment
            </button>
          )}

          {activeSegment && onSplitSegment && (
            <button
              onClick={() => {
                if (currentTime > activeSegment.start_time && currentTime < activeSegment.end_time) {
                  onSplitSegment(activeSegment.id, currentTime);
                } else {
                  alert('Position timeline playback cursor inside the selected segment to split.');
                }
              }}
              className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-mono-code text-zinc-300"
              title="Split active segment at cursor time"
            >
              <Scissors className="w-3.5 h-3.5" /> Split
            </button>
          )}

          {selectedForMerge.length >= 2 && onMergeSegments && (
            <button
              onClick={() => {
                onMergeSegments(selectedForMerge);
                setSelectedForMerge([]);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-white font-mono-code text-xs font-bold"
            >
              <Combine className="w-3.5 h-3.5" /> Merge ({selectedForMerge.length})
            </button>
          )}

          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded border border-zinc-800 ml-1">
            <button
              onClick={() => wavesurferRef.current?.zoom((wavesurferRef.current?.options?.minPxPerSec || 50) * 1.25)}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => wavesurferRef.current?.zoom((wavesurferRef.current?.options?.minPxPerSec || 50) * 0.8)}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Waveform View */}
      <div className="relative w-full bg-[#09090b] rounded p-2 border border-zinc-800 overflow-hidden">
        <div ref={containerRef} className="w-full" />
      </div>

      {/* Swimlanes */}
      <div className="flex flex-col gap-2.5 pt-1">
        <div className="flex items-center justify-between text-[11px] font-mono-code uppercase text-zinc-500 tracking-wider">
          <span className="flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-zinc-400" /> Dialogue Swimlanes (SAM-Audio Segmented)
          </span>
          <span>Click to select • Shift-click to select multiple for merge</span>
        </div>

        <div className="flex flex-col gap-2">
          {speakers.map((speaker) => {
            const speakerSegments = segments.filter((s) => s.speaker_id === speaker.id);

            return (
              <div
                key={speaker.id}
                className="relative h-11 bg-zinc-900/80 rounded border border-zinc-800 flex items-center px-3 overflow-hidden"
              >
                {/* Speaker Badge */}
                <div className="z-10 flex items-center gap-2 bg-zinc-950 px-2.5 py-1 rounded border border-zinc-800 shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: speaker.color }} />
                  <span className="text-xs font-semibold text-zinc-200">{speaker.name}</span>
                </div>

                {/* Segment Blocks */}
                <div className="absolute left-28 right-2 top-1.5 bottom-1.5 pointer-events-auto">
                  {speakerSegments.map((seg) => {
                    const leftPct = (seg.start_time / maxTime) * 100;
                    const widthPct = ((seg.end_time - seg.start_time) / maxTime) * 100;
                    const isSelected = seg.id === selectedSegmentId;
                    const isMergeSelected = selectedForMerge.includes(seg.id);
                    const hasRecording = (seg.recordings?.length || 0) > 0;

                    return (
                      <button
                        key={seg.id}
                        onClick={(e) => {
                          if (e.shiftKey) {
                            toggleMergeSelect(seg.id);
                          } else {
                            onSelectSegment(seg.id);
                          }
                        }}
                        className={`absolute top-0 bottom-0 rounded px-2 flex items-center justify-between text-[11px] font-mono-code border cursor-pointer ${
                          isMergeSelected
                            ? 'bg-emerald-500 text-white font-bold border-emerald-300 z-30'
                            : isSelected
                            ? 'bg-zinc-100 text-zinc-950 font-bold border-white z-20 shadow'
                            : 'bg-zinc-800/90 text-zinc-300 border-zinc-700 hover:border-zinc-500 z-10'
                        }`}
                        style={{
                          left: `${leftPct}%`,
                          width: `${Math.max(widthPct, 4)}%`,
                        }}
                      >
                        <span className="truncate">{seg.start_time.toFixed(1)}s - {seg.end_time.toFixed(1)}s</span>
                        {hasRecording && (
                          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ml-1" title="Dubbed take attached" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
