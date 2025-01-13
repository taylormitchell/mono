const startTime = new Date("2024-01-01 08:00");
const endTime = new Date("2024-01-01 20:00");
const dayLength = endTime.getTime() - startTime.getTime();

type Meeting = {
  title: string;
  start: Date;
  end: Date;
  canExpand?: boolean;
};

const meetings: Meeting[] = [
  {
    title: "Meeting 2",
    start: new Date("2024-01-01 08:00"),
    end: new Date("2024-01-01 08:30"),
  },
  {
    title: "Meeting 3",
    start: new Date("2024-01-01 09:00"),
    end: new Date("2024-01-01 18:30"),
  },
  {
    title: "Meeting 4",
    start: new Date("2024-01-01 11:00"),
    end: new Date("2024-01-01 13:00"),
  },
  {
    title: "Meeting 2",
    start: new Date("2024-01-01 10:20"),
    end: new Date("2024-01-01 19:40"),
  },
  {
    title: "Meeting 5",
    start: new Date("2024-01-01 18:30"),
    end: new Date("2024-01-01 19:40"),
  },
];

const sortedMeetings = meetings.sort((a, b) => {
  return a.start.getTime() - b.start.getTime();
});

const meetingColumns: Meeting[][] = [[]];

let prevMeeting: Meeting | null = null;
for (const meeting of sortedMeetings) {
  let placed = false;

  // Try to place meeting in existing columns

  for (let columnIndex = 0; columnIndex < meetingColumns.length; columnIndex++) {
    const column = meetingColumns[columnIndex];
    let canPlace = true;

    // Check if meeting overlaps with any meeting in this column
    for (const existingMeeting of column) {
      const meetingStart = meeting.start;
      const meetingEnd = meeting.end;
      const existingStart = existingMeeting.start;
      const existingEnd = existingMeeting.end;

      if (
        (meetingStart >= existingStart && meetingStart < existingEnd) ||
        (meetingEnd > existingStart && meetingEnd <= existingEnd) ||
        (meetingStart <= existingStart && meetingEnd >= existingEnd)
      ) {
        canPlace = false;
        break;
      }
    }

    // If we can place in this column, do so
    if (canPlace) {
      column.push(meeting);
      placed = true;
      if (prevMeeting) {
        prevMeeting.canExpand = true;
      }
      break;
    }
  }

  // If we couldn't place in any existing column, create a new one
  if (!placed) {
    meetingColumns.push([meeting]);
  }

  prevMeeting = meeting;
}

function App() {
  const getTimeLabels = () => {
    const labels = [];
    for (let hour = 8; hour <= 20; hour++) {
      labels.push(new Date(`2024-01-01 ${hour.toString().padStart(2, "0")}:00`));
    }
    return labels;
  };
  return (
    <>
      <div className="flex flex-row h-full w-full">
        <div className="flex flex-col pl-2 pr-6">
          {getTimeLabels().map((time, index) => (
            <div className="grow" key={index}>
              {time.toLocaleTimeString([], { hour: "numeric" })}
            </div>
          ))}
        </div>
        <div className="relative grow">
          {meetingColumns.flatMap((column, columnIndex) =>
            column.map((meeting, meetingIndex) => {
              const top = ((meeting.start.getTime() - startTime.getTime()) / dayLength) * 100;
              const height = ((meeting.end.getTime() - meeting.start.getTime()) / dayLength) * 100;
              const left = (columnIndex / meetingColumns.length) * 100;
              const width = meeting.canExpand ? 100 : 100 / meetingColumns.length;
              return (
                <div
                  key={meetingIndex}
                  className="absolute border overflow-scroll"
                  style={{
                    top: `${top}%`,
                    height: `${height}%`,
                    width: `${width}%`,
                    left: `${left}%`,
                  }}
                >
                  <h3>{meeting.title}</h3>
                  <p>
                    {meeting.start.toLocaleTimeString()} - {meeting.end.toLocaleTimeString()}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

export default App;
