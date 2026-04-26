import { WebSocketServer } from "ws";

// Store active WebSocket connections with userId mapping
const userConnections = new Map(); // Map<userId, Set<WebSocket>>
const connectionToUser = new Map(); // Map<WebSocket, userId>

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    console.log("🔗 New WebSocket connection");

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data);
        handleWebSocketMessage(message, ws, wss);
      } catch (err) {
        console.error("Error parsing WebSocket message:", err);
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Invalid message format",
          })
        );
      }
    });

    ws.on("close", () => {
      handleWebSocketClose(ws);
      console.log("❌ WebSocket connection closed");
    });

    ws.on("error", (err) => {
      console.error("WebSocket error:", err);
    });
  });

  return wss;
}

function handleWebSocketMessage(message, ws, wss) {
  const { type, userId, conversationId, content, senderName } = message;

  switch (type) {
    case "authenticate":
      handleAuthentication(ws, userId);
      break;
    case "send_message":
      broadcastMessage(wss, conversationId, {
        type: "new_message",
        conversationId,
        senderId: userId,
        senderName,
        content,
        timestamp: new Date().toISOString(),
      });
      break;
    case "typing":
      broadcastToConversation(wss, conversationId, {
        type: "user_typing",
        conversationId,
        userId,
        senderName,
      });
      break;
    case "stop_typing":
      broadcastToConversation(wss, conversationId, {
        type: "user_stop_typing",
        conversationId,
        userId,
      });
      break;
    default:
      console.log("Unknown message type:", type);
  }
}

function handleAuthentication(ws, userId) {
  connectionToUser.set(ws, userId);

  if (!userConnections.has(userId)) {
    userConnections.set(userId, new Set());
  }
  userConnections.get(userId).add(ws);

  ws.send(
    JSON.stringify({
      type: "authenticated",
      userId,
      message: "Connected successfully",
    })
  );

  console.log(`👤 User ${userId} authenticated via WebSocket`);
}

function handleWebSocketClose(ws) {
  const userId = connectionToUser.get(ws);
  if (userId) {
    const userWsSet = userConnections.get(userId);
    if (userWsSet) {
      userWsSet.delete(ws);
      if (userWsSet.size === 0) {
        userConnections.delete(userId);
      }
    }
    connectionToUser.delete(ws);
  }
}

export function broadcastMessage(wss, conversationId, data) {
  wss.clients.forEach((client) => {
    // Send to all connected users (they filter by conversation on client side)
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

export function broadcastToConversation(wss, conversationId, data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

export function sendToUser(userId, data) {
  const userWsSet = userConnections.get(userId);
  if (userWsSet) {
    userWsSet.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    });
  }
}

export function isUserOnline(userId) {
  return userConnections.has(userId) && userConnections.get(userId).size > 0;
}

export function getOnlineUsers() {
  return Array.from(userConnections.keys());
}
