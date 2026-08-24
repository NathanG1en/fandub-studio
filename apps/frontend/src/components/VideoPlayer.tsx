'use client';

import { useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, FastForward } from 'lucide-react';

interface VideoPlayerProps {
  videoUrl?: string;
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (time: number) => void;
  onPlayPauseToggle?: () => void;
  onSeekRelative?: (delta: number) => void;
}

export function VideoPlayer({
  videoUrl,
  currentTime,
  isPlaying,
  onTimeUpdate,
  onPlayPauseToggle,
  onSeekRelative,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isPlaying && videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else if (!isPlaying && !videoRef.current.paused) {
      videoRef.current.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!videoRef.current) return;
    if (Math.abs(videoRef.current.currentTime - currentTime) > 0.3) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  const formatTimecode = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-zinc-800 flex flex-col group">
      {/* Studio Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 p-3 bg-zinc-950/80 border-b border-zinc-800/60 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-red-500' : 'bg-zinc-600'}`} />
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-300 font-mono-code">
            {isPlaying ? 'PLAYING' : 'PAUSED'}
          </span>
        </div>

        <div className="px-2.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono-code text-zinc-300">
          {formatTimecode(currentTime)}
        </div>
      </div>

      {/* Video Content */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black">
        {videoUrl ? (
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-contain cursor-pointer"
            onClick={onPlayPauseToggle}
            onTimeUpdate={() => {
              if (videoRef.current) {
                onTimeUpdate(videoRef.current.currentTime);
              }
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-zinc-600 gap-2">
            <span className="text-xs font-mono-code">MONITOR LOADING...</span>
          </div>
        )}

        {/* Minimal Control Bar */}
        {videoUrl && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 px-3 py-1.5 rounded-md bg-zinc-900/90 border border-zinc-800 shadow-xl">
            {onSeekRelative && (
              <button
                onClick={() => onSeekRelative(-5)}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
                title="-5 Seconds"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {onPlayPauseToggle && (
              <button
                onClick={onPlayPauseToggle}
                className="p-1.5 rounded bg-zinc-100 text-zinc-950 hover:bg-white"
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
              </button>
            )}

            {onSeekRelative && (
              <button
                onClick={() => onSeekRelative(5)}
                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100"
                title="+5 Seconds"
              >
                <FastForward className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
