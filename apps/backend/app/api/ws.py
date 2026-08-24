from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        # Map project_id -> list of active WebSocket connections
        self.active_connections: dict[str, list[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, project_id: str):
        await websocket.accept()
        if project_id not in self.active_connections:
            self.active_connections[project_id] = []
        self.active_connections[project_id].append(websocket)

    def disconnect(self, websocket: WebSocket, project_id: str):
        if project_id in self.active_connections:
            if websocket in self.active_connections[project_id]:
                self.active_connections[project_id].remove(websocket)

    async def broadcast(self, project_id: str, message: dict):
        if project_id in self.active_connections:
            for connection in list(self.active_connections[project_id]):
                try:
                    await connection.send_json(message)
                except Exception:
                    self.disconnect(connection, project_id)

manager = ConnectionManager()

@router.websocket("/ws/projects/{project_id}")
async def websocket_endpoint(websocket: WebSocket, project_id: str):
    await manager.connect(websocket, project_id)
    try:
        while True:
            data = await websocket.receive_json()
            # Broadcast received real-time edits to all connected project collaborators
            await manager.broadcast(project_id, data)
    except WebSocketDisconnect:
        manager.disconnect(websocket, project_id)
