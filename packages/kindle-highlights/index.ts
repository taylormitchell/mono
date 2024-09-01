import puppeteer, { ElementHandle } from "puppeteer";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import readline from "readline";
import { execSync } from "child_process";

dotenv.config({ path: path.resolve(__dirname, ".env") });

interface Highlight {
  highlightId: string;
  bookId: string;
  bookTitle: string;
  text: string;
  createdAt: string;
}

async function getKindleHighlightsOfRecentlyAnnotatedBooks(
  email: string,
  password: string,
  cutoffDate: Date
): Promise<Highlight[]> {
  const now = new Date();
  const highlights: Highlight[] = [];
  const browser = await puppeteer.launch({ headless: false }); // Set to true for production
  const page = await browser.newPage();
  try {
    // Go to the Kindle highlights page
    await page.goto("https://read.amazon.com/notebook");
    try {
      await page.type("#ap_email", email);
      const continueButton = await page.$("#continue");
      if (continueButton) {
        await continueButton.click();
        await page.waitForNavigation();
      }
      await page.type("#ap_password", password);
      await page.click("#signInSubmit");
      await page.waitForSelector(".kp-notebook-library-each-book");
    } catch (error) {
      console.error("Error navigating to the highlights page");
      throw error;
    }

    // Get book sidebar elements with new annotations
    const bookSidebarElementsWithNewAnnotations: ElementHandle<Element>[] = [];
    try {
      const bookSidebarElements = await page.$$(".kp-notebook-library-each-book");
      for (const bookSidebarElement of bookSidebarElements) {
        const id = await bookSidebarElement.evaluate((el) => el.getAttribute("id"));
        const dateString = await bookSidebarElement.$eval(
          `#kp-notebook-annotated-date-${id}`,
          (el) => el.getAttribute("value") || ""
        );
        const lastAnnotationDate = new Date(dateString);
        if (lastAnnotationDate > cutoffDate) {
          bookSidebarElementsWithNewAnnotations.push(bookSidebarElement);
        }
      }
    } catch (error) {
      console.error("Error getting books");
      throw error;
    }

    // Get new annotations for each book
    for (const bookSidebarElement of bookSidebarElementsWithNewAnnotations) {
      // get book id attribute
      const bookId = await bookSidebarElement.evaluate((el) => {
        return el.getAttribute("id");
      });
      if (!bookId) {
        console.error("Error getting book id", { id: bookId });
        continue;
      }

      // Break once we get to a book that doesn't have any new annotations
      const dateString = await page.$eval(
        `#kp-notebook-annotated-date-${bookId}`,
        (el) => el.getAttribute("value") || ""
      );
      const lastAnnotationDate = new Date(dateString);
      if (isNaN(lastAnnotationDate.getTime())) {
        console.error("Error getting last annotation date", { id: bookId, dateString });
        continue;
      }
      if (lastAnnotationDate < cutoffDate) {
        console.log("Date is older than one day, stopping");
        break;
      }

      // Get the book title
      const title = await bookSidebarElement.$eval("h2", (el) => el.textContent || "");
      if (!title) {
        console.error("Error getting book title", { id: bookId });
        continue;
      }

      // Open the book's highlights page
      try {
        const link = await bookSidebarElement.$("a");
        if (!link) throw new Error("No link found");
        await link.click();
      } catch (error) {
        console.error("Error clicking book", { id: bookId });
        continue;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Get all annotations elements
      let annotationElements: ElementHandle<Element>[] = [];
      try {
        annotationElements = await page.$$("#kp-notebook-annotations > div");
      } catch (error) {
        console.error("Error getting highlight elements");
        throw error;
      }

      // Grab annotation
      for (const annotation of annotationElements) {
        let text = "";
        try {
          text = await annotation.$eval("#highlight", (el) => el.textContent || "");
          if (!text) throw new Error("No text found");
        } catch (error) {
          continue;
        }

        let highlightId = "";
        try {
          highlightId = await annotation.evaluate((el) => el.getAttribute("id") || "");
          if (!highlightId) throw new Error("No highlight id found");
        } catch (error) {
          console.error("Error getting highlight id", error);
          continue;
        }

        highlights.push({
          createdAt: now.toISOString(),
          bookTitle: title,
          text,
          highlightId,
          bookId,
        });
      }
    }
    return highlights;
  } finally {
    await browser.close();
  }
}

// Usage example
async function main() {
  const email = process.env.AMAZON_EMAIL;
  const password = process.env.AMAZON_PASSWORD;
  const highlightsFile = path.join(__dirname, "highlights.jsonl");
  const oneDayAgo = new Date(new Date().getTime() - 3 * 24 * 60 * 60 * 1000);

  if (!email || !password) {
    throw new Error("AMAZON_EMAIL and AMAZON_PASSWORD must be set");
  }

  // Get set of existing highlight ids
  const existingHighlightIds = new Set<string>();
  const fileStream = fs.createReadStream(highlightsFile, "utf8");
  const rl = readline.createInterface({ input: fileStream });
  for await (const line of rl) {
    if (!line || line.trim() === "") continue; // Skip empty lines
    const highlight = JSON.parse(line);
    existingHighlightIds.add(highlight.id);
  }
  rl.close();
  fileStream.close();

  try {
    const highlights = await getKindleHighlightsOfRecentlyAnnotatedBooks(
      email,
      password,
      oneDayAgo
    );
    const newHighlights = highlights.filter((h) => !existingHighlightIds.has(h.id));
    if (newHighlights.length > 0) {
      const highlightsData = newHighlights.map((h) => JSON.stringify(h)).join("\n") + "\n";
      try {
        fs.appendFileSync(highlightsFile, highlightsData);
        execSync(`git add ${highlightsFile}`);
        execSync(`git commit -m "Added ${newHighlights.length} new highlights"`);
        console.log(`${newHighlights.length} new highlight(s) appended to highlights.jsonl`);
      } catch (error) {
        console.error("Error appending highlights to file:", error);
      }
    } else {
      console.log("No new highlights found");
    }
  } catch (error) {
    console.error("Error extracting highlights:", error);
  }
}

main();
