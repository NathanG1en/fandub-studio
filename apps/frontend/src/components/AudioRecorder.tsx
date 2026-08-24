'use client';

import { useState, useRef } from 'react';
import { Mic, Square, Upload, CheckCircle2, RotateCcw, Volume2 } from 'lucide-react';

interface AudioRecorderProps {
  segmentId: string | null;
  onUploadRecording: (segmentId: string, audioBlob: Blob) => Promise<void>;
  existingRecordings?: any[];
}

export function AudioRecorder({ segmentId, onUploadRecording, existingRecordings = [] }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        setPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      alert('Microphone access denied.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleUpload = async () => {
    if (!segmentId || !recordedBlob) return;
    setIsUploading(true);
    try {
      await onUploadRecording(segmentId, recordedBlob);
      setRecordedBlob(null);
      setPreviewUrl(null);
    } catch (err) {
      alert('Failed to upload recording take.');
    } finally {
      setIsUploading(false);
    }
  };

  if (!segmentId) {
    return (
      <div className="minimal-card p-6 flex flex-col items-center justify-center text-zinc-500 py-8 text-center gap-2">
        <Mic className="w-5 h-5 text-zinc-600 mb-1" />
        <p className="text-xs font-mono-code text-zinc-400">
          Select a dialogue segment to record a replacement take.
        </p>
      </div>
    );
  }

  return (
    <div className="minimal-card p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2 font-mono-code">
          <Mic className="w-3.5 h-3.5 text-red-500" />
          Mic Studio
        </h3>
        <span className="text-[10px] font-mono-code text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded">
          Active Segment
        </span>
      </div>

      <div className="flex flex-col gap-4 items-center justify-center py-5 bg-black/60 rounded border border-zinc-800 relative">
        {!recordedBlob ? (
          <div className="flex flex-col items-center gap-3">
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isRecording
                  ? 'bg-red-600 text-white animate-pulse'
                  : 'bg-red-600 hover:bg-red-500 text-white'
              }`}
            >
              {isRecording ? <Square className="w-5 h-5 fill-current" /> : <Mic className="w-6 h-6" />}
            </button>

            <span className="text-xs font-mono-code text-zinc-400">
              {isRecording ? 'Recording Live... Click Stop' : 'Click Mic to Record Take'}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 w-full px-4">
            <div className="flex items-center gap-2 w-full bg-zinc-900 p-2.5 rounded border border-zinc-800">
              <Volume2 className="w-4 h-4 text-zinc-400 shrink-0" />
              <audio src={previewUrl || undefined} controls className="w-full h-7" />
            </div>

            <div className="flex items-center gap-2 w-full justify-end">
              <button
                onClick={() => {
                  setRecordedBlob(null);
                  setPreviewUrl(null);
                }}
                className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 px-2.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 font-mono-code"
              >
                <RotateCcw className="w-3 h-3" /> Retry
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex items-center gap-1.5 text-xs font-bold bg-zinc-100 hover:bg-white text-zinc-950 px-3.5 py-1.5 rounded disabled:opacity-50"
              >
                {isUploading ? (
                  'Saving...'
                ) : (
                  <>
                    <Upload className="w-3 h-3" /> Save Take
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded Takes List */}
      {existingRecordings.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1">
          <h4 className="text-[10px] font-mono-code uppercase text-zinc-500 tracking-wider">Saved Takes</h4>
          {existingRecordings.map((rec, i) => (
            <div key={rec.id || i} className="flex items-center justify-between bg-zinc-900/80 p-2.5 rounded border border-zinc-800 text-xs text-zinc-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-mono-code">{rec.uploaded_by || 'Take ' + (i + 1)}</span>
              </div>
              <audio src={rec.audio_url} controls className="h-6 w-40" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
