import asyncio
import traceback
from sqlalchemy import select
from app.core.database import AsyncSessionLocal
from app.models.project import Project
from app.services.audio_processor import create_project_segments_and_speakers

async def debug_resegment():
    print("\n=== DEBUGGING RESEGMENTATION FAILURE ===")
    async with AsyncSessionLocal() as db:
        stmt = select(Project).where(Project.title.ilike("%DEATH NOTE%"))
        res = await db.execute(stmt)
        projects = list(res.scalars().all())

        if not projects:
            stmt_all = select(Project)
            res_all = await db.execute(stmt_all)
            projects = list(res_all.scalars().all())

        print(f"Found {len(projects)} projects:")
        for p in projects:
            print(f"  - Project ID: {p.id} | Title: '{p.title}' | Status: '{p.status}' | Audio URL: '{p.audio_url}'")

        if not projects:
            print("No projects found in database!")
            return

        target_project = projects[-1]
        print(f"\n--- Running Resegmentation on Target Project {target_project.id} ---")
        try:
            audio_url = target_project.audio_url or f"/storage/{target_project.id}/original_audio.wav"
            await create_project_segments_and_speakers(
                db,
                target_project.id,
                audio_url,
                num_speakers=2,
                provider_id="gcp_gpu"
            )
            print("SUCCESS: create_project_segments_and_speakers completed without error!")
        except Exception as e:
            print("\n!!! CAUGHT EXACT ERROR TRACEBACK !!!")
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(debug_resegment())
