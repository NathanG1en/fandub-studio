export type ProjectStatus = 'pending' | 'processing' | 'ready' | 'error';

export interface Speaker {
  id: string;
  project_id: string;
  name: string;
  color: string;
}

export interface Recording {
  id: string;
  segment_id: string;
  uploaded_by: string;
  audio_url: string;
  created_at: string;
}

export interface DialogueSegment {
  id: string;
  project_id: string;
  speaker_id: string;
  start_time: number;
  end_time: number;
  recordings?: Recording[];
}

export interface Project {
  id: string;
  title: string;
  youtube_url: string;
  status: ProjectStatus;
  video_url?: string;
  audio_url?: string;
  created_at: string;
  speakers: Speaker[];
  segments: DialogueSegment[];
}

export interface Export {
  id: string;
  project_id: string;
  export_url: string;
  status: 'processing' | 'completed' | 'failed';
  created_at: string;
}

export type WSEventType =
  | 'speaker_renamed'
  | 'segment_updated'
  | 'recording_uploaded'
  | 'recording_deleted'
  | 'export_started'
  | 'export_completed';

export interface WSEvent {
  type: WSEventType;
  project_id: string;
  payload: any;
}
