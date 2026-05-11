import { useState } from "react";

export default function TimeSlotCard({
  slot,
  onUpdate,
  onDelete,
  updating,
  deleting,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [startTime, setStartTime] = useState(slot.startTime);
  const [endTime, setEndTime] = useState(slot.endTime);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setError("");

    if (!startTime || !endTime) {
      setError("Both times are required.");
      return;
    }

    if (endTime <= startTime) {
      setError("End time must be after start time.");
      return;
    }

    await onUpdate(slot.id, startTime, endTime);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this availability slot?"
    );

    if (!confirmed) return;

    await onDelete(slot.id);
  };

  if (isEditing) {
    return (
      <div className="slot-card editing">
        {error && <p className="form-error">{error}</p>}

        <input
          type="time"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
        />

        <input
          type="time"
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
        />

        <div className="slot-actions">
          <button onClick={handleSave} disabled={updating}>
            {updating ? "Saving..." : "Save"}
          </button>

          <button
            type="button"
            className="secondary-btn"
            onClick={() => setIsEditing(false)}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="slot-card">
      <span className="slot-time">
        {slot.startTime} - {slot.endTime}
      </span>

      <div className="slot-actions">
        <button onClick={() => setIsEditing(true)}>Edit</button>

        <button
          className="danger-btn"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </div>
  );
}