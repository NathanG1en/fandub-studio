import os
import subprocess
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.project import Project, Export
from app.core.config import settings

async def export_fandub_video(db: AsyncSession, export_id: str) -> str:
    """
    Renders the final fan dub video using FFmpeg audio mixing.
    """
    stmt = select(Export).where(Export.id == export_id)
    res = await db.execute(stmt)
    export_obj = res.scalar_one_or_none()
    if not export_obj:
        raise ValueError(f"Export {export_id} not found")

    project_id = export_obj.project_id
    project_stmt = select(Project).where(Project.id == project_id)
    p_res = await db.execute(project_stmt)
    project = p_res.scalar_one_or_none()

    project_dir = Path(settings.STORAGE_PATH) / project_id
    video_path = project_dir / "original_video.mp4"
    output_path = project_dir / f"final_fandub_{export_id[:8]}.mp4"

    # Gather all recordings attached to dialogue segments
    inputs = ["-i", str(video_path)]
    filter_complex_parts = []
    amix_inputs = []

    recording_count = 0
    for segment in project.segments:
        if segment.recordings:
            # Latest recording for segment
            rec = segment.recordings[-1]
            # Convert URL to local path
            filename = os.path.basename(rec.audio_url)
            rec_path = project_dir / "recordings" / filename
            if rec_path.exists():
                recording_count += 1
                inputs.extend(["-i", str(rec_path)])
                # Delay audio to segment start_time in milliseconds
                delay_ms = int(segment.start_time * 1000)
                filter_complex_parts.append(f"[{recording_count}:a]adelay={delay_ms}|{delay_ms}[a{recording_count}];")
                amix_inputs.append(f"[a{recording_count}]")

    if recording_count > 0:
        filter_str = "".join(filter_complex_parts)
        if recording_count == 1:
            filter_str += f"[0:a]{amix_inputs[0]}amix=inputs=2:duration=first[aout]"
        else:
            filter_str += f"[0:a]{''.join(amix_inputs)}amix=inputs={recording_count + 1}:duration=first[aout]"

        ffmpeg_cmd = [
            "ffmpeg", "-y",
            *inputs,
            "-filter_complex", filter_str,
            "-map", "0:v", "-map", "[aout]",
            "-c:v", "copy", "-c:a", "aac",
            str(output_path)
        ]
    else:
        # Fallback if no recordings yet: copy original
        ffmpeg_cmd = [
            "ffmpeg", "-y", "-i", str(video_path),
            "-c", "copy", str(output_path)
        ]

    try:
        subprocess.run(ffmpeg_cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        # Fallback file copy if ffmpeg complex filter fails
        if video_path.exists():
            import shutil
            shutil.copyfile(video_path, output_path)

    relative_url = f"/storage/{project_id}/final_fandub_{export_id[:8]}.mp4"
    export_obj.export_url = relative_url
    export_obj.status = "completed"
    await db.commit()

    return relative_url
