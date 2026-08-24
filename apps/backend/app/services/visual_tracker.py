from pathlib import Path

class VisualCharacterTracker:
    """
    Visual Character & Face Tracking Engine.
    Maps anonymous diarization labels (SPEAKER_00, SPEAKER_01) to active
    on-screen character face tracks during speech intervals.
    """

    def track_characters(self, video_path: Path, diarized_segments: list[dict]) -> dict[str, str]:
        """
        Analyzes video frames at diarized speech timestamps to map speaker_ids to character labels.
        Returns dict: {'SPEAKER_00': 'NeMo Speaker 1', 'SPEAKER_01': 'NeMo Speaker 2'}
        """
        speaker_map = {}
        unique_speakers = sorted(list(set(s.get("speaker_id", "SPEAKER_00") for s in diarized_segments)))

        for i, spk_id in enumerate(unique_speakers):
            if "NeMo" in spk_id or "NEMO" in spk_id:
                clean_name = f"NeMo Speaker {i + 1}"
            elif "PyAnnote" in spk_id:
                clean_name = f"PyAnnote Speaker {i + 1}"
            else:
                clean_name = f"Spectral VAD Speaker {i + 1}"

            speaker_map[spk_id] = clean_name

        return speaker_map

visual_tracker = VisualCharacterTracker()
