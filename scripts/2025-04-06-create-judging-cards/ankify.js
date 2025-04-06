import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Constants
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillsJsonPath = path.join(__dirname, "skills.json");
const deckName = "5-National Judging Course";
const modelName = "Gymnastics skill 2025-04-06";

// Function to send requests to Anki Connect
async function invokeAnki(action, params = {}) {
  try {
    const response = await fetch("http://localhost:8765", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        version: 6,
        params,
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error);
    }
    return data.result;
  } catch (error) {
    console.error(`Anki Connect error (${action}):`, error.message);
    throw error;
  }
}

// Function to download an image from URL
async function downloadImage(imageUrl) {
  try {
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer).toString("base64");
  } catch (error) {
    console.error(`Error downloading image: ${imageUrl}`, error.message);
    return null;
  }
}

async function main() {
  const skills = JSON.parse(fs.readFileSync(skillsJsonPath, "utf8")).slice(0, 2);
  try {
    // Check if Anki is running
    const version = await invokeAnki("version");
    console.log(`Connected to Anki. AnkiConnect API version: ${version}`);

    // Check if deck exists
    const decks = await invokeAnki("deckNames");
    if (!decks.includes(deckName)) {
      await invokeAnki("createDeck", { deck: deckName });
      console.log(`Created deck: ${deckName}`);
    }

    // Check if model exists
    const models = await invokeAnki("modelNames");
    if (!models.includes(modelName)) {
      console.error(`Error: ${modelName} model not found in Anki`);
      return;
    }

    // Preprocess skills to build a map of boxIds to skills
    const boxIdToSkills = {};
    for (const skill of skills) {
      if (!boxIdToSkills[skill.boxId]) {
        boxIdToSkills[skill.boxId] = [];
      }
      boxIdToSkills[skill.boxId].push(skill);
    }

    // Process each skill
    console.log(`Processing ${skills.length} gymnastics skills...`);
    let successCount = 0;

    for (const skill of skills) {
      try {
        // Download the image
        const imageBase64 = await downloadImage(skill.imgSrc);
        if (!imageBase64) {
          console.warn(`Skipping ${skill.skillId} due to image download failure`);
          continue;
        }

        // Generate a filename for the image in Anki
        const safeSkillId = skill.skillId.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_-]/g, "");
        const ankiImageFilename = `gymnastics_${safeSkillId}.svg`;

        // Generate the sameBoxList content
        let sameBoxList = "";
        if (boxIdToSkills[skill.boxId] && boxIdToSkills[skill.boxId].length > 1) {
          sameBoxList = boxIdToSkills[skill.boxId]
            .map((s) => `${s.skillNumber}: ${s.desc}`)
            .join("<br>");
        }

        // Create the note with the image
        const note = {
          deckName: deckName,
          modelName: modelName,
          fields: {
            skillId: skill.skillId,
            image: "", // Will be filled by the picture data
            desc: skill.desc,
            group: skill.group,
            value: skill.value,
            sameBoxList: sameBoxList,
          },
          tags: ["gymnastics", skill.event, `Group${skill.group}`, `Value${skill.value}`],
          picture: [
            {
              data: imageBase64,
              filename: ankiImageFilename,
              fields: ["image"],
            },
          ],
        };

        // Add the note to Anki
        const noteId = await invokeAnki("addNote", { note });
        console.log(`Added note for ${skill.skillId} with ID: ${noteId}`);
        successCount++;

        // Add a small delay to avoid overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error adding note for ${skill.skillId}:`, error.message);
      }
    }

    console.log(
      `Finished adding ${successCount} out of ${skills.length} skills to Anki deck: ${deckName}`
    );
  } catch (error) {
    console.error("Error:", error.message);
  }
}

await main();
