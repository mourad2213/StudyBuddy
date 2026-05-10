import TimeSlotCard from "./TimeSlotCard";

const DAYS = [
  { value: 0, label: "Monday" },
  { value: 1, label: "Tuesday" },
  { value: 2, label: "Wednesday" },
  { value: 3, label: "Thursday" },
  { value: 4, label: "Friday" },
  { value: 5, label: "Saturday" },
  { value: 6, label: "Sunday" },
];

export default function WeeklyCalendar({
  slots,
  onUpdate,
  onDelete,
  updating,
  deleting,
}) {
  const getSlotsByDay = (dayOfWeek) => {
    return slots
      .filter((slot) => slot.dayOfWeek === dayOfWeek)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  return (
    <section className="weekly-calendar">
      <h2>My Weekly Schedule</h2>

      <div className="week-grid">
        {DAYS.map((day) => {
          const daySlots = getSlotsByDay(day.value);

          return (
            <div className="day-column" key={day.value}>
              <h3>{day.label}</h3>

              {daySlots.length === 0 ? (
                <p className="empty-day">No availability</p>
              ) : (
                daySlots.map((slot) => (
                  <TimeSlotCard
                    key={slot.id}
                    slot={slot}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    updating={updating}
                    deleting={deleting}
                  />
                ))
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}