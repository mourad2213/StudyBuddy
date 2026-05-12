import { useState } from "react";

function getRelativeTime(dateString) {
  const created = new Date(dateString);
  const now = new Date();

  const diffMs = now - created;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);

  if (diffMinutes < 1) return "now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  return `${diffWeeks} week${diffWeeks > 1 ? "s" : ""} ago`;
}

function getIcon(type) {
  if (type?.includes("MESSAGE")) return "✉";
  if (type?.includes("SESSION")) return "✉";
  if (type?.includes("RECOMMENDATION")) return "✉";
  if (type?.includes("BUDDY")) return "✉";
  return "✉";
}

export default function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
}) {
  const [showActions, setShowActions] = useState(false);

  const handleClick = () => {
    setShowActions((prev) => !prev);

    if (!notification.isRead) {
      onMarkAsRead(notification.id);
    }
  };

  const handleDelete = (e) => {
    e.stopPropagation();

    const confirmed = window.confirm(
      "Are you sure you want to delete this notification?"
    );

    if (confirmed) {
      onDelete(notification.id);
    }
  };

  return (
    <div
      className={`notification-item ${
        notification.isRead ? "read" : "unread"
      }`}
      onClick={handleClick}
      role="button"
      tabIndex={0}
    >
      <div className="notification-icon">{getIcon(notification.type)}</div>

      <p className="notification-message">{notification.message}</p>

      <span className="notification-time">
        {getRelativeTime(notification.createdAt)}
      </span>

      {showActions && (
        <button className="notification-delete-btn" onClick={handleDelete}>
          ×
        </button>
      )}
    </div>
  );
}