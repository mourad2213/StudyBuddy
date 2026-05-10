import { useState } from "react";

const DAYS = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

function hasOverlap(slots, dayOfWeek, startTime, endTime) {
  return slots.some((slot) => {
    if (slot.dayOfWeek !== Number(dayOfWeek)) return false;

    return startTime < slot.endTime && endTime > slot.startTime;
  });
}

export default function AddAvailabilityForm({
  existingSlots,
  onAdd,
  loading,
}) {
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!startTime || !endTime) {
      setError("Please choose both start time and end time.");
      return;
    }

    if (endTime <= startTime) {
      setError("End time must be after start time.");
      return;
    }

    if (hasOverlap(existingSlots, dayOfWeek, startTime, endTime)) {
      setError("This time slot overlaps with an existing slot.");
      return;
    }

    await onAdd({
      dayOfWeek: Number(dayOfWeek),
      startTime,
      endTime,
    });

    setStartTime("");
    setEndTime("");
  };

  return (
    <form className="availability-form" onSubmit={handleSubmit}>
      <h3>Add Availability</h3>

      {error && <p className="form-error">{error}</p>}

      <div className="form-row">
        <label>
          Day
          <select
            value={dayOfWeek}
            onChange={(e) => setDayOfWeek(e.target.value)}
          >
            {DAYS.map((day) => (
              <option key={day.value} value={day.value}>
                {day.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Start Time
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </label>

        <label>
          End Time
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Adding..." : "+ Add"}
        </button>
      </div>
    </form>
  );
}