'use client';

import { useState } from 'react';
import { UserCheck, Edit2, Palette } from 'lucide-react';

interface Speaker {
  id: string;
  name: string;
  color: string;
}

interface SpeakerPanelProps {
  speakers: Speaker[];
  onUpdateSpeaker: (speakerId: string, name: string, color: string) => void;
  selectedSegmentId: string | null;
  selectedSegmentSpeakerId?: string | null;
  onAssignSpeakerToSegment: (speakerId: string) => void;
}

const PRESET_COLORS = ['#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];

export function SpeakerPanel({
  speakers,
  onUpdateSpeaker,
  selectedSegmentId,
  selectedSegmentSpeakerId,
  onAssignSpeakerToSegment,
}: SpeakerPanelProps) {
  const [editingSpeakerId, setEditingSpeakerId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const handleStartEdit = (speaker: Speaker) => {
    setEditingSpeakerId(speaker.id);
    setEditName(speaker.name);
    setEditColor(speaker.color);
  };

  const handleSaveEdit = (speakerId: string) => {
    onUpdateSpeaker(speakerId, editName, editColor);
    setEditingSpeakerId(null);
  };

  return (
    <div className="minimal-card p-4 flex flex-col gap-4">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2 font-mono-code">
          <UserCheck className="w-3.5 h-3.5 text-zinc-400" />
          Speaker Roster
        </h3>
        <span className="text-xs font-mono-code text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
          {speakers.length} Cast
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {speakers.map((speaker) => {
          const isEditing = editingSpeakerId === speaker.id;
          const isAssigned = selectedSegmentSpeakerId === speaker.id;

          return (
            <div
              key={speaker.id}
              className={`p-3 rounded border transition-colors ${
                isAssigned
                  ? 'bg-zinc-900 border-zinc-700'
                  : 'bg-zinc-900/50 border-zinc-800/80 hover:border-zinc-700'
              }`}
            >
              {isEditing ? (
                <div className="flex flex-col gap-2.5">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-black border border-zinc-700 rounded px-2.5 py-1 text-xs text-zinc-100 font-medium focus:outline-none focus:border-zinc-500"
                    placeholder="Speaker Name"
                  />
                  <div className="flex items-center gap-1.5 pt-1">
                    <Palette className="w-3 h-3 text-zinc-500 mr-1" />
                    {PRESET_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setEditColor(c)}
                        className={`w-4 h-4 rounded-full border ${
                          editColor === c ? 'border-white scale-110' : 'border-transparent opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      onClick={() => setEditingSpeakerId(null)}
                      className="text-xs text-zinc-500 hover:text-zinc-300 px-2 py-1 font-mono-code"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleSaveEdit(speaker.id)}
                      className="text-xs bg-zinc-100 text-zinc-950 font-bold px-3 py-1 rounded hover:bg-white"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: speaker.color }} />
                    <span className="text-xs font-semibold text-zinc-200">{speaker.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedSegmentId && (
                      <button
                        onClick={() => onAssignSpeakerToSegment(speaker.id)}
                        className={`text-[11px] font-mono-code px-2 py-0.5 rounded border transition-colors ${
                          isAssigned
                            ? 'bg-zinc-100 text-zinc-950 font-bold border-white'
                            : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:border-zinc-600'
                        }`}
                      >
                        {isAssigned ? 'Assigned' : 'Assign'}
                      </button>
                    )}
                    <button
                      onClick={() => handleStartEdit(speaker)}
                      className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800"
                      title="Edit Speaker"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
