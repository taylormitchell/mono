import { google, calendar_v3, tasks_v1 } from "googleapis";
import { OAuth2Client } from "googleapis-common";
import fs from "fs";
import path from "path";
import open from "open";
import readline from "readline/promises";
import { getConfig } from "../lib/config";
import chalk from "chalk";
import os from "os";
import { z } from "zod";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/tasks",
];

// Google API scopes required for our application

const clientSchema = z.object({
  installed: z.object({
    client_id: z.string(),
    project_id: z.string(),
    auth_uri: z.string(),
    token_uri: z.string(),
    auth_provider_x509_cert_url: z.string(),
    client_secret: z.string(),
    redirect_uris: z.array(z.string()),
  }),
});

const tokenSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  scope: z.string(),
  token_type: z.string(),
  expiry_date: z.number(),
});

/**
 * Get OAuth2 client for Google API
 * Uses stored tokens or initiates auth flow if needed
 */
export async function getAuth(): Promise<OAuth2Client> {
  try {
    const clientPath = path.join(os.homedir(), ".config", "my", "google", "client.json");
    const {
      installed: { client_id, client_secret },
    } = clientSchema.parse(JSON.parse(fs.readFileSync(clientPath, "utf8")));
    const oAuth2Client = new OAuth2Client(client_id, client_secret, "urn:ietf:wg:oauth:2.0:oob");

    const tokenPath = path.join(os.homedir(), ".config", "my", "google", "token.json");

    // If we have tokens for this account, use them
    if (fs.existsSync(tokenPath)) {
      const token = tokenSchema.parse(JSON.parse(fs.readFileSync(tokenPath, "utf8")));
      oAuth2Client.setCredentials(token);

      // Check if token is expired or close to expiry (within 5 minutes)
      const now = Date.now();
      const expiryTime = token.expiry_date;
      if (expiryTime && expiryTime - now < 5 * 60 * 1000) {
        // Force token refresh
        await oAuth2Client.getAccessToken();
      }

      return oAuth2Client;
    }

    // Otherwise, start authorization flow
    console.log(chalk.blue("🔑 First-time authentication required for Google APIs"));

    // Generate auth URL and open in browser
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: "offline",
      scope: SCOPES.join(" "),
      prompt: "consent", // Force consent screen to always get refresh token
    });

    console.log(chalk.yellow("Opening browser for authorization..."));
    await open(authUrl);

    // Get authorization code from user
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const code = await rl.question("Paste the authorization code here: ");
    rl.close();

    // Exchange code for tokens
    const { tokens: newTokens } = await oAuth2Client.getToken(code.trim());
    oAuth2Client.setCredentials(newTokens);

    // Save tokens for future use
    fs.writeFileSync(tokenPath, JSON.stringify(newTokens, null, 2));
    console.log(chalk.green("✅ Authentication successful. Tokens stored."));

    return oAuth2Client;
  } catch (error) {
    console.error(
      chalk.red(`Authentication error: ${error instanceof Error ? error.message : String(error)}`)
    );
    throw error;
  }
}

/**
 * Google API client type definition
 */
export interface GoogleClients {
  calendar: calendar_v3.Calendar;
  tasks: tasks_v1.Tasks;
}

/**
 * Get Google API clients for calendar and tasks
 */
export async function getGoogleClients(): Promise<GoogleClients> {
  try {
    const auth = await getAuth();
    return {
      calendar: google.calendar({ version: "v3", auth }),
      tasks: google.tasks({ version: "v1", auth }),
    };
  } catch (error) {
    console.error(
      chalk.red(
        `Error initializing Google clients: ${
          error instanceof Error ? error.message : String(error)
        }`
      )
    );
    throw error;
  }
}

/**
 * List calendar events in a specific time range
 */
export async function listEvents(
  calendar: calendar_v3.Calendar,
  calendarId: string = "primary",
  timeMin: string,
  timeMax: string,
  maxResults: number = 10
): Promise<calendar_v3.Schema$Event[]> {
  try {
    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      maxResults,
      singleEvents: true,
      orderBy: "startTime",
    });

    return response.data.items || [];
  } catch (error) {
    console.error(
      chalk.red(`Error listing events: ${error instanceof Error ? error.message : String(error)}`)
    );
    throw error;
  }
}

/**
 * List tasks from a task list
 */
export async function listTasks(
  tasksClient: tasks_v1.Tasks,
  taskListId: string = "@default",
  showCompleted: boolean = false,
  maxResults: number = 100
): Promise<tasks_v1.Schema$Task[]> {
  try {
    const response = await tasksClient.tasks.list({
      tasklist: taskListId,
      showCompleted,
      maxResults,
    });

    return response.data.items || [];
  } catch (error) {
    console.error(
      chalk.red(`Error listing tasks: ${error instanceof Error ? error.message : String(error)}`)
    );
    throw error;
  }
}

/**
 * Get all task lists for the authenticated user
 */
export async function getTaskLists(
  tasksClient: tasks_v1.Tasks
): Promise<tasks_v1.Schema$TaskList[]> {
  try {
    const response = await tasksClient.tasklists.list();
    return response.data.items || [];
  } catch (error) {
    console.error(
      chalk.red(
        `Error getting task lists: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    throw error;
  }
}

/**
 * Create a new calendar event
 */
export async function createEvent(
  calendar: calendar_v3.Calendar,
  event: calendar_v3.Schema$Event,
  calendarId: string = "primary"
): Promise<calendar_v3.Schema$Event> {
  try {
    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
    });

    return response.data;
  } catch (error) {
    console.error(
      chalk.red(`Error creating event: ${error instanceof Error ? error.message : String(error)}`)
    );
    throw error;
  }
}

/**
 * Create a new task
 */
export async function createTask(
  tasksClient: tasks_v1.Tasks,
  task: tasks_v1.Schema$Task,
  taskListId: string = "@default"
): Promise<tasks_v1.Schema$Task> {
  try {
    const response = await tasksClient.tasks.insert({
      tasklist: taskListId,
      requestBody: task,
    });

    return response.data;
  } catch (error) {
    console.error(
      chalk.red(`Error creating task: ${error instanceof Error ? error.message : String(error)}`)
    );
    throw error;
  }
}

/**
 * Update an existing calendar event
 */
export async function updateEvent(
  calendar: calendar_v3.Calendar,
  eventId: string,
  updates: calendar_v3.Schema$Event,
  calendarId: string = "primary"
): Promise<calendar_v3.Schema$Event> {
  try {
    const response = await calendar.events.patch({
      calendarId,
      eventId,
      requestBody: updates,
    });

    return response.data;
  } catch (error) {
    console.error(
      chalk.red(`Error updating event: ${error instanceof Error ? error.message : String(error)}`)
    );
    throw error;
  }
}

/**
 * Update an existing task
 */
export async function updateTask(
  tasksClient: tasks_v1.Tasks,
  taskId: string,
  updates: tasks_v1.Schema$Task,
  taskListId: string = "@default"
): Promise<tasks_v1.Schema$Task> {
  try {
    const response = await tasksClient.tasks.patch({
      tasklist: taskListId,
      task: taskId,
      requestBody: updates,
    });

    return response.data;
  } catch (error) {
    console.error(
      chalk.red(`Error updating task: ${error instanceof Error ? error.message : String(error)}`)
    );
    throw error;
  }
}

/**
 * Delete a calendar event
 */
export async function deleteEvent(
  calendar: calendar_v3.Calendar,
  eventId: string,
  calendarId: string = "primary"
): Promise<void> {
  try {
    await calendar.events.delete({
      calendarId,
      eventId,
    });
  } catch (error) {
    console.error(
      chalk.red(`Error deleting event: ${error instanceof Error ? error.message : String(error)}`)
    );
    throw error;
  }
}

/**
 * Delete a task
 */
export async function deleteTask(
  tasksClient: tasks_v1.Tasks,
  taskId: string,
  taskListId: string = "@default"
): Promise<void> {
  try {
    await tasksClient.tasks.delete({
      tasklist: taskListId,
      task: taskId,
    });
  } catch (error) {
    console.error(
      chalk.red(`Error deleting task: ${error instanceof Error ? error.message : String(error)}`)
    );
    throw error;
  }
}
