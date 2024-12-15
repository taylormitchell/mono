import { getNotesDir } from "./data";
import path from "path";
import fs from "fs";
import { glob } from "glob";

/**
 * Generates a reverse-sortable, filename-safe identifier based on current timestamp.
 * Uses base36 (0-9, a-z) for maximum compactness while remaining filename-safe.
 * The ID is reverse-sortable, meaning newer IDs will come first in alphabetical sorting.
 * Supports dates up to year 2100 with consistent length padding.
 */
const generatePrefixId = (): string => {
  // Calculate ceiling based on 2100-01-01 timestamp
  const YEAR_2100_SECONDS = 4102444800; // Jan 1, 2100 UTC in seconds
  const CEILING = YEAR_2100_SECONDS + 86400; // Add a day for safety margin

  // Get current time in seconds
  const currentTimeSeconds = Math.floor(Date.now() / 1000);

  // Subtract from ceiling to make it reverse sortable
  const reverseTime = CEILING - currentTimeSeconds;

  // Convert to base36 and pad to ensure consistent length
  return reverseTime.toString(36).padStart(7, "0");
};

function runTestGeneratePrefixId() {
  // Test current date
  const currentId = generatePrefixId();
  console.log("Current date ID:", currentId, `(length: ${currentId.length})`);

  // Test future dates
  function generateIdForDate(date: Date): string {
    const originalNow = Date.now;
    Date.now = () => date.getTime();
    const id = generatePrefixId();
    Date.now = originalNow;
    return id;
  }

  // Test various dates
  const testDates = [
    new Date("2024-12-15T23:59:59Z"),
    new Date("2038-01-01T03:17:42Z"),
    new Date("2050-01-01T19:45:23Z"),
    new Date("2075-01-01T11:38:56Z"),
    new Date("2099-12-31T16:22:09Z"),
  ];

  console.log("\nTesting different dates:");
  const ids = testDates.map((date) => {
    const id = generateIdForDate(date);
    console.log(`${date.toISOString()}: ${id} (length: ${id.length})`);
    return id;
  });

  // Verify sorting
  const sortedIds = [...ids].sort();
  console.log("\nVerifying reverse chronological sort:");
  sortedIds.forEach((id, index) => {
    const originalIndex = ids.indexOf(id);
    console.log(`${testDates[originalIndex].toISOString()}: ${id}`);
  });

  // Verify all IDs are the same length
  const allSameLength = ids.every((id) => id.length === ids[0].length);
  console.log("\nAll IDs same length:", allSameLength);

  // Example filename usage
  console.log("\nExample filename:", `${currentId}_myfile.txt`);
}

function renameJournalFiles() {
  const rootDir = getNotesDir();
  const journalDir = path.join(rootDir, "journals");
  const journalFiles = glob.sync(`${journalDir}/**/*.md`);

  for (const journalFile of journalFiles) {
    // Extract date components from path
    const dayMatch = journalFile.match(/journals\/(\d{4})\/(\d{1,2})\/(\d{1,2})\.md$/);
    const weekMatch = journalFile.match(/journals\/(\d{4})\/(\d{1,2})\/week-of-(\d{1,2})\.md$/);

    let newFilename;
    if (dayMatch) {
      const [_, year, month, day] = dayMatch;
      const paddedMonth = month.padStart(2, "0");
      const paddedDay = day.padStart(2, "0");
      newFilename = `${year}-${paddedMonth}-${paddedDay}.md`;
    } else if (weekMatch) {
      const [_, year, month, weekDay] = weekMatch;
      const paddedMonth = month.padStart(2, "0");
      newFilename = `${year}-${paddedMonth}-week-of-${weekDay}.md`;
    } else {
      continue;
    }

    // Construct new path
    const newPath = path.join(rootDir, newFilename);

    // Move file
    try {
      fs.renameSync(journalFile, newPath);
      console.log(`Moved ${journalFile} to ${newPath}`);
    } catch (err) {
      console.error(`Error moving ${journalFile}:`, err);
    }
  }
}

renameJournalFiles();
