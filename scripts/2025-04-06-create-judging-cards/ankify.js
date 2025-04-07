import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Constants
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillsJsonPath = path.join(__dirname, "skills.json");
const deckName = "5-National Judging Course";
const modelName = "Gymnastics skill 2025-04-06";
const imageDir = path.join(__dirname, "images");
if (!fs.existsSync(imageDir)) {
  throw new Error("Images directory does not exist");
}

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

async function main() {
  let skills = JSON.parse(fs.readFileSync(skillsJsonPath, "utf8"));

  // Shuffle skills array using Fisher-Yates algorithm
  for (let i = skills.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [skills[i], skills[j]] = [skills[j], skills[i]];
  }

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
    let updateCount = 0;

    for (const skill of skills) {
      try {
        // Generate the sameBoxList content
        let sameBoxList = "";
        if (boxIdToSkills[skill.boxId] && boxIdToSkills[skill.boxId].length > 1) {
          sameBoxList = `<ul>${boxIdToSkills[skill.boxId]
            .map((s) => `<li>${s.desc}</li>`)
            .join("")}</ul>`;
        }

        // Create the note with the image
        const filename = `${skill.skillId}.svg`;
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
          tags: [skill.event, `Group${skill.group}`],
          picture: [
            {
              path: path.join(imageDir, filename),
              filename,
              fields: ["image"],
            },
          ],
        };

        // Check if note already exists
        const existingNotes = await invokeAnki("findNotes", { query: `skillId:${skill.skillId}` });

        if (existingNotes.length > 0) {
          // Update existing note
          const noteId = existingNotes[0];
          delete note.fields.image;
          await invokeAnki("updateNoteFields", {
            note: {
              id: noteId,
              fields: note.fields,
              tags: note.tags,
            },
          });
          console.log(`Updated note for ${skill.skillId} with ID: ${noteId}`);
          updateCount++;
        } else {
          // Add new note
          const noteId = await invokeAnki("addNote", { note });
          console.log(`Added note for ${skill.skillId} with ID: ${noteId}`);
          successCount++;
        }

        // Add a small delay to avoid overwhelming the server
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`Error processing ${skill.skillId}:`, error.message);
      }
    }

    console.log(
      `Finished processing ${skills.length} skills: ${successCount} added, ${updateCount} updated in Anki deck: ${deckName}`
    );
  } catch (error) {
    console.error("Error:", error.message);
  }
}

await main();
