import { useState, useEffect } from "react";
import { AnkiModel, loadModel, getAvailableModels } from "./loadModel";

function App() {
  const [model, setModel] = useState<AnkiModel | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const availableModels = getAvailableModels();
  const [selectedModel, setSelectedModel] = useState<string>("conversion");
  const [renderCount, setRenderCount] = useState(0);

  useEffect(() => {
    // Load the selected model
    if (selectedModel) {
      loadModel(selectedModel).then((loadedModel) => {
        setModel(loadedModel);
        // Initialize fields with empty strings
        const initialFields = Object.fromEntries(loadedModel.fields.map((field) => [field, ""]));
        if (selectedModel === "conversion") {
          initialFields["Equation"] = "10 + 10";
        }
        setFields(initialFields);
      });
    }
  }, [selectedModel]);

  const handleFieldChange = (fieldName: string, value: string) => {
    setFields((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  if (!model) {
    return <div>Loading...</div>;
  }

  function renderFrontSide(frontTemplate: string) {
    let html = frontTemplate;
    Object.entries(fields).forEach(([field, value]) => {
      html = html.replace(new RegExp(`{{${field}}}`, "g"), value);
    });
    return html;
  }

  function executeTemplate(html: string) {
    try {
      const scripts = html.match(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi);
      if (scripts) {
        scripts.forEach((script) => {
          const match = script.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
          if (match) {
            const scriptContent = match[1];
            eval(scriptContent);
          }
        });
      }
    } catch (error) {
      if (!(error instanceof SyntaxError)) {
        console.error("Error executing template", error);
      }
    }
  }

  function renderBackSide(backTemplate: string, frontTemplate: string) {
    let html = backTemplate;
    Object.entries(fields).forEach(([field, value]) => {
      html = html.replace(new RegExp(`{{${field}}}`, "g"), value);
    });
    html = html.replace(new RegExp("{{FrontSide}}", "g"), renderFrontSide(frontTemplate));
    return html;
  }

  return (
    <div className="container">
      <h1>Anki Model Test Page</h1>

      <div className="model-selector">
        <label htmlFor="modelSelect">Select Model: </label>
        <select
          id="modelSelect"
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
        >
          {availableModels.map((modelName) => (
            <option key={modelName} value={modelName}>
              {modelName}
            </option>
          ))}
        </select>
      </div>

      <div className="editor-section">
        <h2>Fields</h2>
        {model.fields.map((fieldName) => (
          <div key={fieldName} className="field-input">
            <label htmlFor={fieldName}>{fieldName}:</label>
            <textarea
              id={fieldName}
              value={fields[fieldName]}
              onChange={(e) => handleFieldChange(fieldName, e.target.value)}
            />
          </div>
        ))}
        <button onClick={() => setRenderCount(renderCount + 1)}>Render</button>
      </div>

      <div className="preview-section">
        <div className="preview-card">
          <h2>Front</h2>
          <div
            className="card-content"
            ref={(el) => {
              if (el) {
                el.innerHTML = renderFrontSide(model.frontTemplate);
                executeTemplate(el.innerHTML);
              }
            }}
          />
        </div>

        <div className="preview-card">
          <h2>Back</h2>
          <div
            className="card-content"
            ref={(el) => {
              if (el) {
                el.innerHTML = renderBackSide(model.backTemplate, model.frontTemplate);
                executeTemplate(el.innerHTML);
              }
            }}
          />
        </div>
      </div>

      <style>{model.styling}</style>
    </div>
  );
}

export default App;
