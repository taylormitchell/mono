async function main() {
  // const events = ["FX", "PH", "SR", "PB", "HB"];
  const events = ["FX"];

  // constants
  const EVENT_TO_SHORT = { FX: "fx", PH: "ph", SR: "s", VT: "v", PB: "pb", HB: "hb" };
  const GROUP_TO_INT = { I: 1, II: 2, III: 3, IV: 4 };

  const skills = [];
  for (const event of events) {
    console.log("Clicking event:", event);
    const eventShort = EVENT_TO_SHORT[event].toUpperCase();
    const el = document.querySelector(`#divSearchArea [value="${eventShort}"]`);
    if (!el) {
      throw new Error(`Event ${event} not found`);
    }
    el.click();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    skills.push(
      ...getSkills(event).map((skill) => {
        const parts = skill.skillNumber.split(".");
        const boxNumber = parts[0].padStart(2, "0");
        const skillIndex = (parts[1] || "0").padStart(2, "0");
        if (boxNumber.length !== 2 || skillIndex.length !== 2) {
          throw new Error(`Unexpected skill number: ${skill.skillNumber}`);
        }
        const groupNum = GROUP_TO_INT[skill.group];
        if (groupNum === undefined) {
          throw new Error(`Unexpected group: ${skill.group}`);
        }
        const boxId = `${eventShort}${groupNum}${boxNumber}`.toLowerCase();
        const skillId = `${eventShort}${groupNum}${boxNumber}${skillIndex}`.toLowerCase();
        const filename = skill.imgSrc.split("/").pop().split(".")[0];
        if (filename !== skillId) {
          console.log("Issue with filename or skillId:", {
            filename,
            skillId,
            skill,
          });
          return null;
        }
        return { ...skill, event, boxId, skillId };
      })
    );
  }
  console.log(skills);
}

function getSkills() {
  const els = document.querySelectorAll("#divElementList > div > .row > div");
  const skills = [];
  for (const el of els) {
    const skill = parseSkill(el);
    if (skill === false) {
      continue;
    }
    if (Object.values(skill).some((v) => !v)) {
      console.log("Unexpected value object:", skill);
      return;
    }
    skills.push(skill);
  }
  return skills;
}

function parseSkill(el) {
  const text = el.innerText;
  let lines = text.split("\n");
  if (lines.length === 4) {
    lines = lines.slice(1);
  }
  if (lines.length !== 3) {
    console.log("Unexpected number of lines:", { text, lines });
    return;
  }
  const desc = lines[0].trim();
  const imgSrc = el.querySelector("img").src;
  const value = lines[2][0].trim();
  if (!["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"].includes(value)) {
    console.log("Unexpected value:", { text, value });
    return;
  }
  const groupAndSkillNumber = lines[1].trim();
  if (groupAndSkillNumber.includes("Var")) {
    console.debug("Skipping variation:", { text });
    return false;
  }
  const parts = groupAndSkillNumber.split(/\s*-\s*/);
  if (parts.length !== 2) {
    console.log("Unexpected number of parts:", { text, parts });
    return;
  }
  const [group, skillNumber] = parts;
  const boxNumber = skillNumber.split(".")[0];

  return {
    boxNumber,
    skillNumber,
    group,
    desc,
    imgSrc,
    value,
  };
}

main();
