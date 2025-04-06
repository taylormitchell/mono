async function main() {
  const events = [
    { event: "FX", value: "FX" },
    { event: "PH", value: "PH" },
    { event: "SR", value: "R" },
    { event: "PB", value: "PB" },
    { event: "HB", value: "HB" },
  ];
  const skills = [];
  for (const { event, value } of events) {
    console.log("Clicking event:", event);
    const el = document.querySelector(`#divSearchArea [value="${value}"]`);
    if (!el) {
      throw new Error(`Event ${event} not found`);
    }
    el.click();
    await new Promise((resolve) => setTimeout(resolve, 2000));
    skills.push(
      ...getSkills(event).map((skill) => {
        const boxId = `${event}-${skill.group}-${skill.boxNumber}`.toLowerCase();
        const skillId = `${event}-${skill.group}-${skill.skillNumber.replace(
          ".",
          "-"
        )}`.toLowerCase();
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
  if (!VALID_VALUES.includes(value)) {
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

const VALID_VALUES = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

main();
