// import { config } from "dotenv";

// Load environment variables
// config();

const accessToken = process.env.ACCESS_TOKEN;
const refreshToken = process.env.REFRESH_TOKEN;
const clientId = process.env.CLIENT_ID || "";
const clientSecret = process.env.CLIENT_SECRET || "";

// Function to exchange authorization code for tokens
async function exchangeCodeForTokens(authorizationCode: string) {
  try {
    console.log("Exchanging authorization code for tokens...");
    const response = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code: authorizationCode,
        grant_type: "authorization_code",
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to exchange code for tokens");

    console.log("Tokens received. Add these to your .env file:");
    console.log(`ACCESS_TOKEN=${data.access_token}`);
    console.log(`REFRESH_TOKEN=${data.refresh_token}`);

    return data;
  } catch (error) {
    console.error("Error exchanging code for tokens:", error);
    throw error;
  }
}

// Uncomment and use this function with your authorization code
// Usage: await exchangeCodeForTokens('YOUR_AUTHORIZATION_CODE');

if (!accessToken || !refreshToken || !clientId || !clientSecret) {
  console.log("Missing environment variables", {
    accessToken,
    refreshToken,
    clientId,
    clientSecret,
  });
  process.exit(1);
}

const STRAVA_API_BASE = "https://www.strava.com/api/v3";

// Define types for API responses
interface Athlete {
  id: number;
  username: string;
  firstname: string;
  lastname: string;
  city: string;
  state: string;
  country: string;
  profile: string;
  follower_count: number;
  friend_count: number;
  weight: number;
}

interface Activity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  start_date: string;
  average_speed: number;
  max_speed: number;
  average_heartrate?: number;
  max_heartrate?: number;
}

// Function to refresh the token if it's expired
async function refreshAccessToken(): Promise<string> {
  try {
    console.log("Refreshing access token...");
    const response = await fetch("https://www.strava.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to refresh token");

    console.log("Token refreshed successfully");
    return data.access_token;
  } catch (error) {
    console.error("Error refreshing token:", error);
    throw error;
  }
}

// Function to get athlete profile
async function getAthleteProfile(token: string, retryCount = 0): Promise<Athlete> {
  try {
    const response = await fetch(`${STRAVA_API_BASE}/athlete`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 401 && retryCount < 1) {
      console.log(`${response.status} ${response.statusText} - Attempting to refresh token...`);
      // Token expired, refresh and retry (only once)
      const newToken = await refreshAccessToken();
      return getAthleteProfile(newToken, retryCount + 1);
    } else if (response.status === 401) {
      throw new Error(`Authentication failed after token refresh. Your tokens may not have the correct scopes.
Try running: bun run index.ts --help
to get instructions on obtaining proper OAuth tokens.`);
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to fetch athlete data");

    return data;
  } catch (error) {
    console.error("Error fetching athlete profile:", error);
    throw error;
  }
}

// Function to get recent activities
async function getRecentActivities(
  token: string,
  page = 1,
  perPage = 10,
  retryCount = 0
): Promise<Activity[]> {
  try {
    const response = await fetch(
      `${STRAVA_API_BASE}/athlete/activities?page=${page}&per_page=${perPage}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (response.status === 401 && retryCount < 1) {
      console.log(`${response.status} ${response.statusText} - Attempting to refresh token...`);
      // Token expired, refresh and retry (only once)
      const newToken = await refreshAccessToken();
      return getRecentActivities(newToken, page, perPage, retryCount + 1);
    } else if (response.status === 401) {
      throw new Error(`Authentication failed after token refresh. Your tokens may not have the correct scopes.
To get tokens with activity:read_all scope, run: bun run index.ts --help`);
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Failed to fetch activities");

    return data;
  } catch (error) {
    console.error("Error fetching activities:", error);
    throw error;
  }
}

// Function to convert meters to miles
function metersToMiles(meters: number): number {
  return parseFloat((meters / 1609.34).toFixed(2));
}

// Function to format seconds into HH:MM:SS
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
}

// Main function to run the script
async function main() {
  try {
    if (!accessToken) {
      throw new Error("Access token is required. Please check your .env file.");
    }

    console.log("Fetching athlete profile...");
    const athlete = await getAthleteProfile(accessToken);

    console.log("\n--- ATHLETE PROFILE ---");
    console.log(`Name: ${athlete.firstname} ${athlete.lastname}`);
    console.log(`Username: ${athlete.username}`);
    console.log(`Location: ${athlete.city}, ${athlete.state}, ${athlete.country}`);
    console.log(`Followers: ${athlete.follower_count}`);
    console.log(`Following: ${athlete.friend_count}`);
    console.log(`Weight: ${athlete.weight}kg`);

    console.log("\nFetching recent activities...");
    const activities = await getRecentActivities(accessToken);

    console.log("\n--- RECENT ACTIVITIES ---");
    activities.forEach((activity, index) => {
      console.log(`\nActivity #${index + 1}: ${activity.name}`);
      console.log(`Type: ${activity.type}`);
      console.log(`Date: ${new Date(activity.start_date).toLocaleString()}`);
      console.log(`Distance: ${activity.distance / 1000} km`);
      console.log(`Duration: ${formatTime(activity.moving_time)}`);
      console.log(`Elevation Gain: ${activity.total_elevation_gain} meters`);

      if (activity.average_heartrate) {
        console.log(`Average Heart Rate: ${activity.average_heartrate} bpm`);
      }

      if (activity.max_heartrate) {
        console.log(`Max Heart Rate: ${activity.max_heartrate} bpm`);
      }
    });
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

// Add an alternative main function that can be used to get tokens
async function getTokens() {
  const authCode = process.argv[2];

  if (authCode === "--help") {
    console.log(`
To get tokens with proper scopes, follow these steps:

1. Register your app at https://www.strava.com/settings/api
   - Set the callback domain to: localhost

2. Add your client_id and client_secret to your .env file:
   CLIENT_ID=your_client_id
   CLIENT_SECRET=your_client_secret

3. Visit this URL in your browser (replace YOUR_CLIENT_ID with your actual client ID):
   https://www.strava.com/oauth/authorize?client_id=${clientId}&redirect_uri=http://localhost&response_type=code&scope=activity:read_all,profile:read_all

4. After authorization, you'll be redirected to a URL containing a code parameter like:
   http://localhost/?state=&code=YOUR_CODE&scope=read,activity:read_all,profile:read_all

5. Copy the code parameter and run this script again with:
   bun run index.ts YOUR_CODE
`);
    process.exit(0);
  }

  if (!authCode) {
    console.log(`For instructions on how to get proper tokens, run:
bun run index.ts --help`);
    process.exit(1);
  }

  try {
    await exchangeCodeForTokens(authCode);
  } catch (error) {
    console.error("Failed to get tokens:", error);
    process.exit(1);
  }
}

// Check if this script is being run to get tokens
if (process.argv.length > 2) {
  getTokens();
} else {
  // Otherwise run the original main function
  main();
}
