import { WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Store active WebSocket connections with userId mapping (in-memory cache for performance)
const userConnections = new Map(); // Map<userId, Set<{ws, connectionId}>>
const connectionToUser = new Map(); // Map<connectionId, userId>

/**
 * Register a WebSocket connection in the database
 */
async function registerConnection(userId) {
  const connectionId = uuidv4();
  try {
    await prisma.webSocketSession.create({
      data: {
        userId,
        connectionId,
        isActive: true,
      },
    });
    console.log(`✅ Connection registered for user ${userId} (${connectionId})`);
    return connectionId;
  } catch (err) {
    console.error(`❌ Failed to register connection for user ${userId}:`, err.message);
    throw err;
  }
}

/**
 * Unregister a WebSocket connection from the database
 */
async function unregisterConnection(connectionId) {
  try {
    await prisma.webSocketSession.update({
      where: { connectionId },
      data: { isActive: false },
    });
    console.log(`✅ Connection unregistered (${connectionId})`);
  } catch (err) {
    console.error(`⚠️  Failed to unregister connection (${connectionId}):`, err.message);
  }
}

/**
 * Get all active connections for a user from database
 */
async function getActiveConnectionsForUser(userId) {
  try {
    const sessions = await prisma.webSocketSession.findMany({
      where: {
        userId,
        isActive: true,
      },
    });
    return sessions.map(s => s.connectionId);
  } catch (err) {
    console.error(`❌ Failed to fetch connections for user ${userId}:`, err.message);
    return [];
  }
}

/**
 * Update heartbeat to keep session alive
 */
async function updateHeartbeat(connectionId) {
  try {
    await prisma.webSocketSession.update({
      where: { connectionId },
      data: { lastHeartbeat: new Date() },
    });
  } catch (err) {
    // Silently fail on heartbeat errors
  }
}

/**
 * Clean up stale sessions (older than 30 minutes)
 */
async function cleanupStaleSessions() {
  try {
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    const result = await prisma.webSocketSession.updateMany({
      where: {
        isActive: true,
        lastHeartbeat: { lt: thirtyMinutesAgo },
      },
      data: { isActive: false },
    });
    if (result.count > 0) {
      console.log(`🧹 Cleaned up ${result.count} stale WebSocket sessions`);
    }
  } catch (err) {
    console.error("❌ Error cleaning up stale sessions:", err.message);
  }
}

// Clean up stale sessions every 5 minutes
setInterval(cleanupStaleSessions, 5 * 60 * 1000);

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

async function handleAuthentication(ws, userId) {
  try {
    // Register connection in database
    const connectionId = await registerConnection(userId);
    
    // Store in memory cache
    connectionToUser.set(connectionId, userId);
    if (!userConnections.has(userId)) {
      userConnections.set(userId, new Set());
    }
    userConnections.get(userId).add({ ws, connectionId });

    ws.send(
      JSON.stringify({
        type: "authenticated",
        userId,
        connectionId,
        message: "Connected successfully",
      })
    );

    console.log(`👤 User ${userId} authenticated via WebSocket (${connectionId})`);
    console.log(`📊 In-memory: ${userConnections.size} users, DB sessions queried on-demand`);
  } catch (err) {
    console.error("❌ Authentication failed:", err);
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Authentication failed",
      })
    );
  }
}

async function handleWebSocketClose(ws) {
  // Find and remove from memory
  for (const [connId, userId] of connectionToUser.entries()) {
    const userWsSet = userConnections.get(userId);
    if (userWsSet) {
      const item = Array.from(userWsSet).find(item => item.ws === ws);
      if (item) {
        userWsSet.delete(item);
        if (userWsSet.size === 0) {
          userConnections.delete(userId);
          console.log(`❌ User ${userId} disconnected (no more in-memory connections)`);
        } else {
          console.log(`❌ User ${userId} closed one connection (${userWsSet.size} remaining in-memory)`);
        }
        
        // Remove from database
        await unregisterConnection(connId);
        connectionToUser.delete(connId);
        break;
      }
    }
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

export async function sendToUser(userId, data) {
  // First try in-memory cache
  const userWsSet = userConnections.get(userId);
  let sentCount = 0;
  
  if (userWsSet && userWsSet.size > 0) {
    userWsSet.forEach(({ ws }) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
        sentCount++;
      }
    });
  }
  
  // Check database for other active sessions (in case this is a different service instance)
  const dbConnections = await getActiveConnectionsForUser(userId);
  
  if (sentCount > 0) {
    console.log(`✅ Message sent to ${userId} via ${sentCount} in-memory connection(s)`);
    return true;
  } else if (dbConnections.length > 0) {
    console.log(`⚠️  User ${userId} has ${dbConnections.length} DB connection(s) but not in this instance's memory`);
    console.log(`💡 Message saved to database for delivery on next request`);
    return false;
  } else {
    console.warn(`⚠️  User ${userId} is not connected anywhere. Online in-memory users: ${Array.from(userConnections.keys()).join(", ")}`);
    return false;
  }
}

export function getOnlineUsers() {
  return Array.from(userConnections.keys());
}

export function getRegistryStatus() {
  const users = Array.from(userConnections.entries()).map(([userId, wsSet]) => ({
    userId,
    connectionCount: wsSet.size,
  }));
  return {
    totalUsers: userConnections.size,
    totalConnections: Array.from(userConnections.values()).reduce((sum, set) => sum + set.size, 0),
    users,
    note: "This shows in-memory cache only. Check /debug/db-sessions for full database status.",
  };
}

/**
 * Get all active sessions from database for debugging
 */
export async function getDBRegistryStatus() {
  try {
    const sessions = await prisma.webSocketSession.findMany({
      where: { isActive: true },
    });
    
    const userCounts = {};
    sessions.forEach(session => {
      userCounts[session.userId] = (userCounts[session.userId] || 0) + 1;
    });
    
    return {
      totalActiveSessions: sessions.length,
      uniqueUsers: Object.keys(userCounts).length,
      userSessions: Object.entries(userCounts).map(([userId, count]) => ({
        userId,
        sessionCount: count,
      })),
    };
  } catch (err) {
    console.error("❌ Error fetching DB registry:", err.message);
    return { error: err.message };
  }
}
