import puppeteer, { ElementHandle } from "puppeteer";
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, ".env") });

interface Highlight {
  book: string;
  text: string;
}

async function extractKindleHighlights(email: string, password: string): Promise<Highlight[]> {
  const browser = await puppeteer.launch({ headless: false }); // Set to true for production
  const page = await browser.newPage();

  try {
    // Navigate to the Amazon sign-in page
    await page.goto("https://read.amazon.com/notebook");

    try {
      // Fill in the email and password
      await page.type("#ap_email", email);
      // Check if there's a continue button and click it if present
      const continueButton = await page.$("#continue");
      if (continueButton) {
        await continueButton.click();
        await page.waitForNavigation();
      }
      await page.type("#ap_password", password);
      await page.click("#signInSubmit");

      // Wait for the highlights page to load
      await page.waitForSelector(".kp-notebook-library-each-book");
    } catch (error) {
      console.error("Error navigating to the highlights page");
      throw error;
    }

    // Extract highlights

    // to access the highlight of a book, you need to click the book line under <div id="kp-notebook-library" class="a-row">
    // so we can just grab all the .kp-notebook-library-each-book inside of it, click each one
    // and then once the date is available, we can start grabbing the highlights
    // check if the date at <span id="kp-notebook-annotated-date">Wednesday August 28, 2024</span> is within the last 24 hours
    // if it is, then we can start grabbing the highlights
    // if not, we can end the script
    const highlights: Highlight[] = [];
    let books: any[] = [];
    try {
      books = await page.$$(".kp-notebook-library-each-book a");
    } catch (error) {
      console.error("Error getting books");
      throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
    for (const book of books) {
      try {
        await book.click();
      } catch (error) {
        console.error("Error clicking book");
        throw error;
      }
      try {
        await page.waitForSelector("#kp-notebook-annotated-date");
        const dateString = await page.$eval(
          "#kp-notebook-annotated-date",
          (el) => el.textContent || ""
        );
        const date = new Date(dateString);
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        if (date < oneDayAgo) {
          console.log("Date is older than one day, stopping");
          break;
        }
      } catch (error) {
        console.error("Error getting date");
        throw error;
      }
      const bookTitle = await page.$eval("h3.kp-notebook-metadata", (el) => el.textContent || "");
      if (!bookTitle) {
        console.error("Error getting book title");
        continue;
      }
      // const texts = await page.$$eval("#kp-notebook-annotations div", (divs) =>
      //   divs.map((div) => div.textContent)
      // );
      // console.log(texts);
      let highlightElements: ElementHandle<Element>[] = [];
      try {
        highlightElements = await page.$$("#kp-notebook-annotations div");
      } catch (error) {
        console.error("Error getting highlight elements");
        throw error;
      }
      console.log(bookTitle, highlightElements.length);

      //   if (highlightElements.length === 0) {
      //     console.log("No highlights found for", bookTitle);
      //     continue;
      //   }
      //   for (const highlight of highlightElements) {
      //     // get text from highlight element
      //     const text = await highlight.$eval("span", (el) => el.textContent);
      //     // const text = await highlight.$eval("#highlight", (el) => el.textContent);
      //     if (text && bookTitle) {
      //       highlights.push({ book: bookTitle, text });
      //     } else {
      //       console.log("Failed to get highlight data", { text, bookTitle });
      //     }
      // }
    }
    // return highlights;
  } finally {
    await browser.close();
  }
}

// Usage example
async function main() {
  const email = process.env.AMAZON_EMAIL;
  const password = process.env.AMAZON_PASSWORD;

  if (!email || !password) {
    throw new Error("AMAZON_EMAIL and AMAZON_PASSWORD must be set");
  }

  try {
    const highlights = await extractKindleHighlights(email, password);
    console.log("Extracted highlights:", highlights);
    // You can now process or store the highlights as needed
  } catch (error) {
    console.error("Error extracting highlights:", error);
  }
}

main();
