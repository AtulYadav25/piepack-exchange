import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';

const app = express();
const port = 3000;

const httpServer = app.listen(port, () => {
    console.log("Connected on port 3000");
});

const wss = new WebSocketServer({ server: httpServer });

// Map to track active user connections: userId -> WebSocket
const userSockets = new Map<string, WebSocket>();

// Map of roomId -> Set of WebSocket clients in that room
const rooms = new Map<string, Set<WebSocket>>();

wss.on('connection', (ws) => {
    console.log('Client connected');

    let currentUserId: string | null = null;
    let currentRoomId: string | null = null;

    // Single message handler for ALL incoming client actions
    ws.on('message', (rawMessage) => {
        try {
            const data = JSON.parse(rawMessage.toString());

            switch (data.type) {
                // 1. User Registration / Login
                case 'register': {
                    currentUserId = data.userId;
                    if (currentUserId) userSockets.set(currentUserId, ws);
                    ws.send(JSON.stringify({ type: 'SUCCESS', message: `Registered as ${currentUserId}` }));
                    break;
                }

                // 2. Send Private Message to specific client
                case 'send_private': {
                    const targetWs = userSockets.get(data.targetUserId);
                    if (targetWs && targetWs.readyState === WebSocket.OPEN) {
                        targetWs.send(JSON.stringify({
                            type: 'PRIVATE_MESSAGE',
                            from: currentUserId,
                            message: data.message
                        }));
                    }
                    break;
                }

                // 3. Join a Room
                case 'join_room': {
                    currentRoomId = data.roomId;
                    if (currentRoomId) joinRoom(currentRoomId, ws);
                    break;
                }

                // 4. Leave a Room
                case 'leave_room': {
                    if (data.roomId) leaveRoom(data.roomId, ws);
                    currentRoomId = null;
                    break;
                }

                // 5. Broadcast to a Room
                case 'send_room': {
                    if (data.roomId) {
                        broadcastToRoom(data.roomId, JSON.stringify({
                            type: 'ROOM_MESSAGE',
                            from: currentUserId,
                            message: data.message
                        }), ws); // Option to pass 'ws' to exclude sender, or omit it to include sender
                    }
                    break;
                }

                // 6. Global Broadcast (Fallback/Default)
                case 'broadcast_all': {
                    wss.clients.forEach((client) => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify({ type: 'BROADCAST', message: data.message }));
                        }
                    });
                    break;
                }
            }
        } catch (err) {
            console.error('Invalid JSON message format', err);
        }
    });

    // Clean up on disconnect
    ws.on('close', () => {
        if (currentUserId) userSockets.delete(currentUserId);
        if (currentRoomId) leaveRoom(currentRoomId, ws);
        console.log(`Client ${currentUserId || ''} disconnected`);
    });
});

// Room Helper Functions

function joinRoom(roomId: string, ws: WebSocket) {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
    }
    rooms.get(roomId)!.add(ws);
}

function leaveRoom(roomId: string, ws: WebSocket) {
    if (rooms.has(roomId)) {
        rooms.get(roomId)!.delete(ws);
        if (rooms.get(roomId)!.size === 0) {
            rooms.delete(roomId); // Clean up empty room
        }
    }
}

function broadcastToRoom(roomId: string, message: string, senderWs?: WebSocket) {
    const clientsInRoom = rooms.get(roomId);
    if (!clientsInRoom) return;

    clientsInRoom.forEach((client) => {
        if (client !== senderWs && client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}




// In Client Side
/*

useEffect(()=>{
    const socket = new WebSocket('ws://localhost:3000');
    socket.onopen = ()=>{
        console.log("Connected!!")
        setSocket(socket);
    }

    socket.on('message',(messsage)=>{
        console.log('Message Received', message.data)
    })
    
},[])

*/