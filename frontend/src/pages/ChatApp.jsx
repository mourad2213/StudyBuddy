import { useState, useRef, useEffect, useCallback } from "react";
import "./ChatApp.css";

const messagingServiceUrl =
  import.meta.env.VITE_MESSAGING_SERVICE_URL || "http://localhost:4008/graphql";

const GET_CONVERSATIONS_QUERY = `
  query GetConversations($userId: String!) {
    getConversations(userId: $userId) {
      id
      participant1Id
      participant2Id
      updatedAt
      unreadCount
      lastMessage {
        id
        content
        createdAt
      }
      messages {
        id
        conversationId
        senderId
        senderName
        content
        createdAt
        isRead
        readAt
      }
    }
  }
`;

const SEND_MESSAGE_MUTATION = `
  mutation SendMessage(
    $conversationId: String!
    $senderId: String!
    $senderName: String
    $content: String!
  ) {
    sendMessage(
      conversationId: $conversationId
      senderId: $senderId
      senderName: $senderName
      content: $content
    ) {
      id
      conversationId
      senderId
      senderName
      content
      createdAt
      isRead
      readAt
    }
  }
`;

const MARK_AS_READ_MUTATION = `
  mutation MarkMessagesAsRead($conversationId: String!, $userId: String!) {
    markMessagesAsRead(conversationId: $conversationId, userId: $userId) {
      id
    }
  }
`;

function avatarFor(seed) {
  const normalized = seed || "user";
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(normalized)}&backgroundColor=b6e3f4,c0aede,ffd5dc,d1f4cc,ffe4b5`;
}

function formatTime(timestamp) {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }).toLowerCase();
}

async function runGraphQL(query, variables = {}) {
  const response = await fetch(messagingServiceUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });

  const result = await response.json();
  console.log("[GraphQL]", { variables, errors: result.errors, data: result.data });
  
  if (!response.ok || result.errors) {
    const message = result.errors?.[0]?.message || "Request failed";
    throw new Error(message);
  }

  return result.data;
}

function getMessagingWebSocketUrl(serviceUrl) {
  return serviceUrl
    .replace(/^http:/i, "ws:")
    .replace(/^https:/i, "wss:")
    .replace(/\/graphql\/?$/i, "");
}

function normalizeIncomingMessage(payload) {
  return {
    id: payload.messageId || `${payload.conversationId}-${payload.timestamp || Date.now()}`,
    conversationId: payload.conversationId,
    senderId: payload.senderId,
    senderName: payload.senderName,
    content: payload.content,
    createdAt: payload.timestamp || new Date().toISOString(),
    isRead: false,
    readAt: null,
  };
}

function updateConversationsWithIncomingMessage(conversations, incomingMessage, activeConversationId) {
  const alreadyExists = (conv) =>
    Array.isArray(conv.messages) &&
    conv.messages.some((message) => String(message.id) === String(incomingMessage.id));

  return conversations
    .map((conv) => {
      if (String(conv.id) !== String(incomingMessage.conversationId)) {
        return conv;
      }

      const nextMessages = alreadyExists(conv)
        ? conv.messages
        : [...(conv.messages || []), incomingMessage];

      return {
        ...conv,
        messages: nextMessages,
        updatedAt: incomingMessage.createdAt,
        unreadCount:
          String(conv.id) === String(activeConversationId)
            ? 0
            : (conv.unreadCount || 0) + 1,
        lastMessage: {
          id: incomingMessage.id,
          content: incomingMessage.content,
          createdAt: incomingMessage.createdAt,
        },
      };
    })
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

export default function ChatApp() {
  const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
  
  // Determine the actual username to use for API queries
  // The login system stores the username as a key in localStorage (e.g., 'finalTest2' as key)
  let currentUserName = "Me";
  
  // Strategy 1: direct "username" key
  const directUsername = localStorage.getItem("username");
  if (directUsername) {
    currentUserName = directUsername;
  } else {
    // Strategy 2: storedUser fields (fallback from old login systems)
    currentUserName = 
      storedUser.loginUsername ||
      storedUser.actual_username ||
      storedUser.username ||
      "Me";
  }

  // Strategy 3: if still "Me", find the username by excluding system keys
  if (currentUserName === "Me") {
    const systemKeys = new Set(["token", "userId", "user", "cart", "favoriteColor"]);
    const userIdUuid = localStorage.getItem("userId") || "";
    const possibleUsernameKey = Object.keys(localStorage).find(key => 
      !systemKeys.has(key) && key !== userIdUuid && !key.match(/^[0-9a-f\-]{36}$/) // exclude UUID format
    );
    if (possibleUsernameKey) {
      currentUserName = possibleUsernameKey;
    }
  }

  // Debug: log all localStorage keys and the extracted username
  useEffect(() => {
    const allKeys = Object.keys(localStorage);
    console.log("[ChatApp] localStorage keys:", allKeys);
    console.log("[ChatApp] currentUserName resolved to:", currentUserName);
    console.log("[ChatApp] storedUser from 'user' key:", storedUser);
    console.log("[ChatApp] About to fetch conversations for userId:", currentUserName);
  }, [currentUserName]);
  
  // Keep UUID for UI display
  const currentUserIdRaw =
    storedUser.userId ||
    storedUser.id ||
    localStorage.getItem("userId") ||
    "";
  const currentUserId = String(currentUserIdRaw || "");

  const [conversations, setConversations] = useState([]);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [error, setError] = useState("");
  const [headerOffset, setHeaderOffset] = useState(0);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    document.body.classList.add("chatapp-fullscreen");

    const updateHeaderOffset = () => {
      const header = document.querySelector(".header");
      if (!header) {
        setHeaderOffset(0);
        return;
      }
      const rect = header.getBoundingClientRect();
      setHeaderOffset(Math.max(0, Math.round(rect.bottom)));
    };

    updateHeaderOffset();
    window.addEventListener("resize", updateHeaderOffset);

    return () => {
      document.body.classList.remove("chatapp-fullscreen");
      window.removeEventListener("resize", updateHeaderOffset);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadConversations = useCallback(async () => {
    if (!currentUserName) return;

    setLoadingConversations(true);
    setError("");

    try {
      console.log("[ChatApp] Loading conversations for username:", currentUserName);
      const data = await runGraphQL(GET_CONVERSATIONS_QUERY, { userId: currentUserName });
      console.log("[ChatApp] Raw response data:", JSON.stringify(data, null, 2));
      
      const loaded = Array.isArray(data?.getConversations)
        ? data.getConversations
        : [];

      console.log("[ChatApp] Setting conversations, count:", loaded.length);
      loaded.forEach((conv, idx) => {
        const otherUserId = conv.participant1Id === currentUserName ? conv.participant2Id : conv.participant1Id;
        console.log(`  [${idx}] conversation id: ${conv.id}, with user: ${otherUserId}`);
      });
      
      setConversations(loaded);
      setActiveConversationId((prev) => {
        if (prev && loaded.some((conv) => conv.id === prev)) return prev;
        return loaded[0]?.id || null;
      });
    } catch (err) {
      console.error("[ChatApp] Error loading conversations:", err);
      setError(`Failed to load conversations: ${err.message}`);
    } finally {
      setLoadingConversations(false);
    }
  }, [currentUserName]);

  useEffect(() => {
    if (!currentUserName) {
      setError("No username found. Please log in first.");
      return;
    }

    loadConversations();
  }, [currentUserName, loadConversations]);

  useEffect(() => {
    if (!activeConversationId || !currentUserName) {
      setMessages([]);
      return;
    }

    // Find the active conversation and extract messages from it
    const activeConv = conversations.find((conv) => conv.id === activeConversationId);
    if (activeConv) {
      setMessages(activeConv.messages || []);
      setLoadingMessages(false);

      // Mark as read (non-blocking)
      runGraphQL(MARK_AS_READ_MUTATION, {
        conversationId: activeConversationId,
        userId: currentUserName,
      }).catch(() => {
        // Silent fail
      });
    } else {
      setMessages([]);
    }
  }, [activeConversationId, conversations, currentUserName]);

  useEffect(() => {
    if (!currentUserName) return;

    const socket = new WebSocket(getMessagingWebSocketUrl(messagingServiceUrl));

    socket.addEventListener("open", () => {
      socket.send(
        JSON.stringify({
          type: "authenticate",
          userId: currentUserName,
        })
      );
    });

    socket.addEventListener("message", (event) => {
      let payload;

      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }

      if (payload.type !== "new_message" || payload.senderId === currentUserName) {
        return;
      }

      const incomingMessage = normalizeIncomingMessage(payload);

      setConversations((prev) =>
        updateConversationsWithIncomingMessage(prev, incomingMessage, activeConversationId)
      );

      // Refetch conversations to ensure sidebar is fresh with latest metadata
      loadConversations();
    });

    socket.addEventListener("error", () => {
      // Ignore socket errors; the chat still works with manual reloads.
    });

    return () => {
      socket.close();
    };
  }, [activeConversationId, currentUserName, loadConversations]);

  const contacts = conversations
    .map((conv) => {
      const participant1Id = String(conv?.participant1Id || "");
      const participant2Id = String(conv?.participant2Id || "");
      let otherUserId = "Unknown user";

      if (participant1Id === currentUserName) {
        otherUserId = participant2Id || "Unknown user";
      } else if (participant2Id === currentUserName) {
        otherUserId = participant1Id || "Unknown user";
      } else {
        otherUserId = participant2Id || participant1Id || "Unknown user";
      }

      return {
        id: conv.id,
        conversationId: conv.id,
        name: otherUserId,
        avatar: avatarFor(otherUserId),
        lastMessage: conv.lastMessage?.content || "No messages yet",
      };
    })
    .filter((contact) =>
      String(contact.name || "").toLowerCase().includes(search.toLowerCase())
    );

  const activeContact =
    conversations
      .map((conv) => {
        const participant1Id = String(conv?.participant1Id || "");
        const participant2Id = String(conv?.participant2Id || "");
        const otherUserId =
          participant1Id === currentUserName
            ? participant2Id
            : participant2Id === currentUserName
              ? participant1Id
              : participant2Id || participant1Id || "Unknown user";

        return {
          conversationId: conv.id,
          name: otherUserId || "Unknown user",
          avatar: avatarFor(otherUserId || "user"),
        };
      })
      .find((contact) => contact.conversationId === activeConversationId) ||
    null;

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed || !activeConversationId || !currentUserName) return;

    const submitMessage = async () => {
      try {
        const data = await runGraphQL(SEND_MESSAGE_MUTATION, {
          conversationId: activeConversationId,
          senderId: currentUserName,
          senderName: currentUserName,
          content: trimmed,
        });

        const newMessage = data.sendMessage;
        setMessages((prev) => [...prev, newMessage]);
        setConversations((prev) =>
          prev
            .map((conv) =>
              conv.id === activeConversationId
                ? {
                    ...conv,
                    messages: [...(conv.messages || []), newMessage],
                    updatedAt: newMessage.createdAt,
                    lastMessage: {
                      id: newMessage.id,
                      content: newMessage.content,
                      createdAt: newMessage.createdAt,
                    },
                  }
                : conv
            )
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
        );

        setInput("");
      } catch (err) {
        setError(err.message || "Failed to send message");
      }
    };

    submitMessage();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const uiMessages = messages.map((msg) => {
    const isMe = msg.senderId === currentUserName;
    const senderSeed = isMe ? currentUserName : msg.senderId;
    return {
      id: msg.id,
      sender: isMe ? "me" : "other",
      text: msg.content,
      time: formatTime(msg.createdAt),
      avatar: avatarFor(senderSeed),
      senderName: msg.senderName || (isMe ? currentUserName : msg.senderId),
    };
  });

  const grouped = uiMessages.reduce((acc, msg) => {
    const last = acc[acc.length - 1];
    if (last && last.sender === msg.sender) {
      last.messages.push(msg);
    } else {
      acc.push({ sender: msg.sender, messages: [msg] });
    }
    return acc;
  }, []);

  return (
    <div className="chat-root" style={{ "--chat-header-offset": `${headerOffset}px` }}>
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <span className="sidebar-title">Chats</span>
        </div>
        <div className="search-wrapper">
          <input
            className="search-input"
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <div style={{ color: "#fff", fontSize: "12px", padding: "8px" }}>
        </div>
        {error && <div style={{ color: "#ffcccc", fontSize: "11px", padding: "8px", whiteSpace: "pre-wrap" }}>{error}</div>}
        <ul className="contact-list">
          {contacts.map((contact) => (
            <li
              key={contact.id}
              className={`contact-item ${activeConversationId === contact.conversationId ? "active" : ""}`}
              onClick={() => setActiveConversationId(contact.conversationId)}
            >
              <div className="avatar-wrap">
                <img src={contact.avatar} alt={contact.name} className="avatar" />
                <span className="online-dot" />
              </div>
              <div className="contact-info">
                <span className="contact-name">{contact.name}</span>
                {contact.lastMessage && (
                  <span className="contact-preview">{contact.lastMessage}</span>
                )}
              </div>
            </li>
          ))}
          {!loadingConversations && contacts.length === 0 && (
            <li className="contact-item">
              <div className="contact-info">
                <span className="contact-name">No conversations yet</span>
              </div>
            </li>
          )}
        </ul>
        <div className="sidebar-footer">
          <img src={avatarFor(currentUserName || "me")} alt="Me" className="avatar avatar-sm" />
          <span className="my-name">{currentUserName}</span>
        </div>
      </aside>

      {/* Main Chat */}
      <main className="chat-main">
        {/* Top Bar */}
        <header className="chat-header">
          <div className="chat-header-left">
            <div className="avatar-wrap">
              <img src={activeContact?.avatar || avatarFor("unknown")} alt={activeContact?.name || "No contact"} className="avatar" />
              <span className="online-dot" />
            </div>
            <div>
              <p className="chat-contact-name">{activeContact?.name || "Select a conversation"}</p>
            </div>
          </div>
          <div className="chat-header-right">
            <span className="active-status">Active </span>
           
          </div>
        </header>

        {/* Messages */}
        <div className="messages-area">
          <div className="messages-inner">
            {error && <p>{error}</p>}
            {loadingMessages && activeConversationId && <p>Loading messages...</p>}
            {grouped.map((group, gi) => (
              <div key={gi} className={`message-group ${group.sender}`}>
                {group.sender === "me" ? (
                  <>
                    <div className="bubble-stack">
                      {group.messages.map((msg, mi) => (
                        <div key={msg.id} className="bubble-row me">
                          <div className="bubble me">
                            {mi === 0 && <span className="bubble-meta">{msg.senderName}, {msg.time}</span>}
                            <p>{msg.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <img src={group.messages[0].avatar} alt="me" className="avatar avatar-msg" />
                  </>
                ) : (
                  <>
                    <img src={group.messages[0].avatar} alt="other" className="avatar avatar-msg" />
                    <div className="bubble-stack">
                      {group.messages.map((msg, mi) => (
                        <div key={msg.id} className="bubble-row other">
                          <div className="bubble other">
                            {mi === 0 && <span className="bubble-meta">{msg.senderName}, {msg.time}</span>}
                            <p>{msg.text}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
            {!loadingMessages && activeConversationId && grouped.length === 0 && (
              <p>No messages yet. Say hello!</p>
            )}
            {!activeConversationId && !loadingConversations && (
              <p>Select a conversation to start chatting.</p>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input */}
        <div className="input-bar">
          <input
            className="message-input"
            type="text"
            placeholder="Enter your message"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
          />
          <button className="send-btn" onClick={sendMessage} disabled={!input.trim()} title="Send">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="20" height="20">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </main>
    </div>
  );
}
