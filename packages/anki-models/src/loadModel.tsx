export interface AnkiModel {
  name: string;
  frontTemplate: string;
  backTemplate: string;
  fields: string[];
  styling: string;
}

export function getAvailableModels(): string[] {
  return Object.keys(frontTemplates)
    .map((path) => {
      const match = path.match(/\/models\/(.+)\/front\.template\.html/);
      return match ? match[1] : null;
    })
    .filter((name): name is string => name !== null);
}

const frontTemplates = import.meta.glob("/models/*/front.template.html", {
  as: "raw",
  eager: true,
});
const backTemplates = import.meta.glob("/models/*/back.template.html", { as: "raw", eager: true });
const fieldsFiles = import.meta.glob("/models/*/fields.txt", { as: "raw", eager: true });
const stylingFiles = import.meta.glob("/models/*/styling.css", { as: "raw", eager: true });

console.log(frontTemplates);

export async function loadModel(modelName: string): Promise<AnkiModel> {
  const frontTemplatePath = `/models/${modelName}/front.template.html`;
  const backTemplatePath = `/models/${modelName}/back.template.html`;
  const fieldsPath = `/models/${modelName}/fields.txt`;
  const stylingPath = `/models/${modelName}/styling.css`;

  return {
    name: modelName,
    frontTemplate: frontTemplates[frontTemplatePath] ?? "",
    backTemplate: backTemplates[backTemplatePath] ?? "",
    fields: (fieldsFiles[fieldsPath] ?? "").trim().split("\n"),
    styling: stylingFiles[stylingPath] ?? "",
  };
}
