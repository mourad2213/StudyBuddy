import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import popupBg from "../assets/add-availability-bg.png";
import { GET_AVAILABILITY } from "../graphql/queries/availability";
import {
  CREATE_AVAILABILITY,
  UPDATE_AVAILABILITY,
  DELETE_AVAILABILITY,
} from "../graphql/mutations/availability";

const DAYS = [
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
];
const AVAILABILITY_GRAPHQL = import.meta.env.VITE_AVAILABILITY_URL || "http://localhost:4004/graphql";
// function addOneHour(time) {
//   const [hours, minutes] = time.split(":").map(Number);
//   const newHours = (hours + 1).toString().padStart(2, "0");
//   return `${newHours}:${minutes.toString().padStart(2, "0")}`;
// }

function formatTime(time) {
  const [hourStr, minute] = time.split(":");
  let hour = Number(hourStr);
  const ampm = hour >= 12 ? "pm" : "am";

  hour = hour % 12;
  if (hour === 0) hour = 12;

  return `${hour}:${minute} ${ampm}`;
}

export default function AvailabilityPage() {
  const currentUserId = localStorage.getItem("userId");

  const [showModal, setShowModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedStartTime, setSelectedStartTime] = useState("12:00");
  const [selectedEndTime, setSelectedEndTime] = useState("13:00");
  const [message, setMessage] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [editDay, setEditDay] = useState(1);
  const [editStartTime, setEditStartTime] = useState("12:00");
  const [editEndTime, setEditEndTime] = useState("13:00");

  const token = localStorage.getItem("token");

  const { data, loading, error, refetch } = useQuery(GET_AVAILABILITY, {
    variables: { userId: currentUserId },
    skip: !currentUserId,
    fetchPolicy: "cache-and-network",
    context: {
      uri: AVAILABILITY_GRAPHQL,
      headers: {
        authorization: token ? `Bearer ${token}` : "",
        Authorization: token ? `Bearer ${token}` : "",
      },
    },
  });

  const [createAvailability, { loading: creating }] = useMutation(
    CREATE_AVAILABILITY,
    {
      context: {
        uri: AVAILABILITY_GRAPHQL,
        headers: {
          authorization: token ? `Bearer ${token}` : "",
          Authorization: token ? `Bearer ${token}` : "",
        },
      },
    }
  );
  const [updateAvailability, { loading: updating }] = useMutation(
    UPDATE_AVAILABILITY,
    {
      context: {
        uri: AVAILABILITY_GRAPHQL,
        headers: {
          authorization: token ? `Bearer ${token}` : "",
          Authorization: token ? `Bearer ${token}` : "",
        },
      },
    }
  );
  const [deleteAvailability] = useMutation(DELETE_AVAILABILITY, {
    context: {
      uri: AVAILABILITY_GRAPHQL,
      headers: {
        authorization: token ? `Bearer ${token}` : "",
        Authorization: token ? `Bearer ${token}` : "",
      },
    },
  });
  const slots = data?.getAvailability || [];

  function formatTimeRange(timeRange) {
  const [startTime, endTime] = timeRange.split("-");
  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

  const uniqueTimeRanges = [
    ...new Set(slots.map((slot) => `${slot.startTime}-${slot.endTime}`)),
  ].sort();
  const slotExists = (dayOfWeek, timeRange) => {
    const [startTime, endTime] = timeRange.split("-");

    return slots.some(
      (slot) =>
        slot.dayOfWeek === Number(dayOfWeek) &&
        slot.startTime === startTime &&
        slot.endTime === endTime
    );
  };

  const getSlot = (dayOfWeek, timeRange) => {
    const [startTime, endTime] = timeRange.split("-");

    return slots.find(
      (slot) =>
        slot.dayOfWeek === Number(dayOfWeek) &&
        slot.startTime === startTime &&
        slot.endTime === endTime
    );
  };


  const handleAdd = async () => {
    setMessage("");

    if (!currentUserId) {
      setMessage("You must be logged in first.");
      return;
    }

    if (!selectedStartTime || !selectedEndTime) {
      setMessage("Please choose both start time and end time.");
      return;
    }

    if (selectedEndTime <= selectedStartTime) {
      setMessage("End time must be after start time.");
      return;
    }

    const overlaps = slots.some((slot) => {
      if (slot.dayOfWeek !== Number(selectedDay)) return false;

      return (
        selectedStartTime < slot.endTime &&
        selectedEndTime > slot.startTime
      );
    });

    if (overlaps) {
      setMessage("This time slot overlaps with existing availability.");
      return;
    }

    try {
      await createAvailability({
        variables: {
          userId: currentUserId,
          dayOfWeek: Number(selectedDay),
          startTime: selectedStartTime,
          endTime: selectedEndTime,
        },
      });

      await refetch();
      setShowModal(false);
    } catch (err) {
      setMessage(err.message || "Failed to add availability.");
    }
  };

  const handleDeleteCell = async (slot) => {
    if (!slot?.id) return;

    const confirmed = window.confirm("Delete this availability slot?");
    if (!confirmed) return;

    try {
      await deleteAvailability({
        variables: {
          id: slot.id,
          userId: currentUserId,
        },
      });

      await refetch();
    } catch (err) {
      alert(err.message || "Failed to delete availability.");
    }
  };
  const openEditModal = (slot) => {
    setEditingSlot(slot);
    setEditDay(slot.dayOfWeek);
    setEditStartTime(slot.startTime);
    setEditEndTime(slot.endTime);
    setMessage("");
    setShowEditModal(true);
  };

  const handleUpdateSlot = async () => {
    if (!editingSlot) return;

    setMessage("");

    if (!editStartTime || !editEndTime) {
      setMessage("Please choose both start time and end time.");
      return;
    }

    if (editEndTime <= editStartTime) {
      setMessage("End time must be after start time.");
      return;
    }

    const overlaps = slots.some((slot) => {
      if (slot.id === editingSlot.id) return false;
      if (slot.dayOfWeek !== Number(editDay)) return false;

      return editStartTime < slot.endTime && editEndTime > slot.startTime;
    });

    if (overlaps) {
      setMessage("This updated slot overlaps with another availability.");
      return;
    }

    try {
      await updateAvailability({
        variables: {
          id: editingSlot.id,
          userId: currentUserId,
          dayOfWeek: Number(editDay),
          startTime: editStartTime,
          endTime: editEndTime,
        },
      });

      await refetch();
      setShowEditModal(false);
      setEditingSlot(null);
    } catch (err) {
      setMessage(err.message || "Failed to update availability.");
    }
  };
  const handleResetAvailability = async () => {
    if (slots.length === 0) return;

    const confirmed = window.confirm(
      "Are you sure you want to delete all availability slots?"
    );

    if (!confirmed) return;

    try {
      await Promise.all(
        slots.map((slot) =>
          deleteAvailability({
            variables: {
              id: slot.id,
              userId: currentUserId,
            },
          })
        )
      );

      await refetch();
    } catch (err) {
      alert(err.message || "Failed to reset availability.");
    }
  };

  if (!currentUserId) {
    return (
      <main className="availability-figma-page">
        <p className="availability-error">
          You must be logged in to manage availability.
        </p>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="availability-figma-page">
        <p>Loading availability...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="availability-figma-page">
        <p className="availability-error">{error.message}</p>
      </main>
    );
  }

  return (
    <main className="availability-figma-page">
      <section className="availability-title-section">
        <h1>My study Availability</h1>
        <p>set the time slots when you are available to study</p>

        <button
          className="add-availability-main-btn"
          onClick={() => {
            setMessage("");
            setShowModal(true);
          }}
        >
          + Add availability
        </button>
        <button
          className="reset-availability-btn"
          onClick={handleResetAvailability}
          disabled={slots.length === 0}
        >
          Reset availability
        </button>
      </section>

      <section className="schedule-section">
        <h2>my weekly schedule:</h2>

        <div className="availability-table">
          <div className="table-header time-header">time:</div>

          {DAYS.map((day) => (
            <div className="table-header" key={day.value}>
              {day.label}
            </div>
          ))}

          {uniqueTimeRanges.length === 0 ? (
            <>
              <div className="time-cell empty-time-cell"></div>
              {DAYS.map((day) => (
                <div className="day-cell" key={day.value}></div>
              ))}
            </>
          ) : (
            uniqueTimeRanges.map((timeRange) => (
              <div className="availability-row-fragment" key={timeRange}>
                <div className="time-cell">{formatTimeRange(timeRange)}</div>

                {DAYS.map((day) => {
                  const active = slotExists(day.value, timeRange);

                  return (
                    <div
                      className="day-cell"
                      key={`${day.value}-${timeRange}`}
                      onClick={() => {
                        if (!active) return;
                        const slot = getSlot(day.value, timeRange);
                        openEditModal(slot);
                      }}
                    >
                      {active && <div className="available-block"></div>}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </section>

      {showModal && (
        <div className="availability-modal-backdrop" >
          
          <div className="availability-modal" style={{ backgroundImage: `url(${popupBg})` }}>
            <h2>Add Availability</h2>

            <div className="modal-line">
              <label>Choose day:</label>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(Number(e.target.value))}
              >
                {DAYS.map((day) => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="modal-line">
              <label>Start time:</label>
              <input
                type="time"
                value={selectedStartTime}
                onChange={(e) => setSelectedStartTime(e.target.value)}
              />
            </div>

            <div className="modal-line">
              <label>End time:</label>
              <input
                type="time"
                value={selectedEndTime}
                onChange={(e) => setSelectedEndTime(e.target.value)}
              />
            </div>

            {message && <p className="availability-error">{message}</p>}

            <div className="modal-actions">
              <button
                className="cancel-modal-btn"
                onClick={() => setShowModal(false)}
              >
                Cancel
              </button>

              <button
                className="confirm-modal-btn"
                onClick={handleAdd}
                disabled={creating}
              >
                {creating ? "Adding..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
      {showEditModal && editingSlot && (
  <div className="availability-modal-backdrop">
    <div
      className="availability-modal"
      style={{ backgroundImage: `url(${popupBg})` }}
    >
      <h2>Edit Availability</h2>

      <div className="modal-line">
        <label>Choose day:</label>
        <select
          value={editDay}
          onChange={(e) => setEditDay(Number(e.target.value))}
        >
          {DAYS.map((day) => (
            <option key={day.value} value={day.value}>
              {day.label}
            </option>
          ))}
        </select>
      </div>

      <div className="modal-line">
        <label>Start time:</label>
        <input
          type="time"
          value={editStartTime}
          onChange={(e) => setEditStartTime(e.target.value)}
        />
      </div>

      <div className="modal-line">
        <label>End time:</label>
        <input
          type="time"
          value={editEndTime}
          onChange={(e) => setEditEndTime(e.target.value)}
        />
      </div>

      {message && <p className="availability-error">{message}</p>}

      <div className="modal-actions edit-modal-actions">
        <button
          className="cancel-modal-btn"
          onClick={() => {
            setShowEditModal(false);
            setEditingSlot(null);
          }}
        >
          Cancel
        </button>

        <button
          className="delete-slot-btn"
          onClick={() => handleDeleteCell(editingSlot)}
        >
          Delete
        </button>

        <button
          className="confirm-modal-btn"
          onClick={handleUpdateSlot}
          disabled={updating}
        >
          {updating ? "Saving..." : "Save"}
        </button>
      </div>
    </div>
  </div>
)}
    </main>
  );
}