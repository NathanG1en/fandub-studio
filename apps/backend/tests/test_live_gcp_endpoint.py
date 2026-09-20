import wave
import numpy as np
from pathlib import Path
import httpx

def test_live_gcp_cloud_run_endpoint():
    url = "https://fandub-diarizer-api-674778260833.us-central1.run.app/diarize"
    
    # Generate a temporary 3-second 16kHz WAV test file
    sample_rate = 16000
    duration = 3.0
    t = np.linspace(0, duration, int(sample_rate * duration))
    audio_signal = (np.sin(2 * np.pi * 440 * t) * 32767).astype(np.int16)
    
    test_wav_path = Path("/tmp/live_gcp_test_audio.wav")
    with wave.open(str(test_wav_path), "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(audio_signal.tobytes())

    print(f"\n[Testing Live GCP Cloud Run Endpoint]: {url}")
    with open(test_wav_path, "rb") as f:
        files = {"file": ("test_audio.wav", f, "audio/wav")}
        data = {"num_speakers": "2", "provider": "pyannote"}
        
        # Set 90.0s timeout for Cloud Run cold starts
        response = httpx.post(url, files=files, data=data, timeout=90.0)

    print(f"Status Code: {response.status_code}")
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    segments = response.json()
    print(f"Returned {len(segments)} Diarization Segments:")
    for seg in segments:
        print(f"  - {seg['speaker_id']}: {seg['start_time']}s -> {seg['end_time']}s")
    
    assert isinstance(segments, list)
    assert len(segments) >= 1

if __name__ == "__main__":
    test_live_gcp_cloud_run_endpoint()
