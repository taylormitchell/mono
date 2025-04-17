import { google, calendar_v3, tasks_v1 } from "googleapis";
import { getAuth } from "./auth";

export async function getClients(account: string = "default") {
  const auth = await getAuth(account);
  return {
    cal: google.calendar({ version: "v3", auth }),
    tasks: google.tasks({ version: "v1", auth }),
  };
}

export async function listEvents(
  cal: calendar_v3.Calendar,
  calendarId: string,
  timeMin: string,
  timeMax: string
) {
  const res = await cal.events.list({
    calendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
  });
  return res.data.items ?? [];
}

export async function listTasks(t: tasks_v1.Tasks, tasklistId: string, timeMax: string) {
  const res = await t.tasks.list({
    tasklist: tasklistId,
    dueMax: timeMax,
    showCompleted: false,
  });
  return res.data.items ?? [];
}
