import { useState } from "react";
import { useQuery, useMutation } from "@apollo/client/react";

import { GET_AVAILABILITY } from "../graphql/queries/availability";
import {
  CREATE_AVAILABILITY,
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

function addOneHour(time) {
  const [hours, minutes] = time.split(":").map(Number);
  const newHours = (hours + 1).toString().padStart(2, "0");
  return `${newHours}:${minutes.toString().padStart(2, "0")}`;
}

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
  const [selectedTime, setSelectedTime] = useState("12:00");
  const [message, setMessage] = useState("");

  const { data, loading, error, refetch } = useQuery(GET_AVAILABILITY, {
    variables: { userId: currentUserId },
    skip: !currentUserId,
    fetchPolicy: "cache-and-network",
  });

  const [createAvailability, { loading: creating }] =
    useMutation(CREATE_AVAILABILITY);

  const [deleteAvailability] = useMutation(DELETE_AVAILABILITY);

  const slots = data?.getAvailability || [];

  const uniqueTimes = [...new Set(slots.map((slot) => slot.startTime))].sort();

  const slotExists = (dayOfWeek, startTime) => {
    return slots.some(
      (slot) =>
        slot.dayOfWeek === Number(dayOfWeek) && slot.startTime === startTime
    );
  };

  const getSlotId = (dayOfWeek, startTime) => {
    const found = slots.find(
      (slot) =>
        slot.dayOfWeek === Number(dayOfWeek) && slot.startTime === startTime
    );

    return found?.id;
  };

  const handleAdd = async () => {
    setMessage("");

    if (!currentUserId) {
      setMessage("You must be logged in first.");
      return;
    }

    if (!selectedTime) {
      setMessage("Please choose a time.");
      return;
    }

    if (slotExists(selectedDay, selectedTime)) {
      setMessage("This availability already exists.");
      return;
    }

    try {
      await createAvailability({
        variables: {
          userId: currentUserId,
          dayOfWeek: Number(selectedDay),
          startTime: selectedTime,
          endTime: addOneHour(selectedTime),
        },
      });

      await refetch();
      setShowModal(false);
    } catch (err) {
      setMessage(err.message || "Failed to add availability.");
    }
  };

  const handleDeleteCell = async (dayOfWeek, startTime) => {
    const id = getSlotId(dayOfWeek, startTime);
    if (!id) return;

    const confirmed = window.confirm("Delete this availability slot?");
    if (!confirmed) return;

    await deleteAvailability({
      variables: { id },
    });

    await refetch();
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

          {uniqueTimes.length === 0 ? (
            <>
              <div className="time-cell empty-time-cell"></div>
              {DAYS.map((day) => (
                <div className="day-cell" key={day.value}></div>
              ))}
            </>
          ) : (
            uniqueTimes.map((time) => (
              <div className="availability-row-fragment" key={time}>
                <div className="time-cell">{formatTime(time)}</div>

                {DAYS.map((day) => {
                  const active = slotExists(day.value, time);

                  return (
                    <div
                      className="day-cell"
                      key={`${day.value}-${time}`}
                      onClick={() =>
                        active && handleDeleteCell(day.value, time)
                      }
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
        <div className="availability-modal-backdrop">
          <div className="availability-modal">
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
              <label>pick time :</label>
              <input
                type="time"
                value={selectedTime}
                onChange={(e) => setSelectedTime(e.target.value)}
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
    </main>
  );
}