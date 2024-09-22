import * as htmlparser2 from "htmlparser2";
import { parseFromString } from "dom-parser";

export function getAsins(html: string) {
  const asins: string[] = [];
  const parser = new htmlparser2.Parser({
    onopentag: (name, attribs) => {
      if (attribs["data-get-annotations-for-asin"]) {
        try {
          const json = JSON.parse(attribs["data-get-annotations-for-asin"]);
          asins.push(json["asin"]);
        } catch (e) {
          console.error(e);
        }
      }
    },
  });

  parser.write(html);
  parser.end();

  return asins;
}

// export function getHighlights(html: string) {
//   const highlights: any[] = [];

//   let current: null | {
//     name: string;
//     attributes: Record<string, string>;
//     text: string;
//   } = null;

//   const parser = new htmlparser2.Parser({
//     onopentag: (name, attribs) => {
//       if (name === "div" && attribs.class?.includes("kp-notebook-highlight")) {
//         current = {
//           name,
//           attributes: attribs,
//           text: "",
//         };
//       }
//     },
//     ontext: (text) => {
//       if (current !== null) {
//         current.text = text;
//       }
//     },
//     onclosetag: (name) => {
//       if (name === "div" && current !== null) {
//         highlights.push(current);
//         current = null;
//       }
//     },
//   });

//   parser.write(html);
//   parser.end();
//   return highlights;
// }

export function getAnnotations(html: string) {
  // lib doesn't handle doctype so we remove it
  const dom = parseFromString(html.replace("<!doctype html>", ""));
  const annotations = [];
  console.log(dom);

  // Find the annotations container
  const annotationsContainer = dom.getElementById("kp-notebook-annotations");

  if (annotationsContainer) {
    // get children of annotationsContainer
    const annotationElements = annotationsContainer.childNodes;

    for (const annotationElement of annotationElements) {
      const id = annotationElement.getAttribute("id");
      if (!id) {
        continue;
      }

      // Find highlight text
      let highlight = "";
      try {
        const highlightSpan = annotationElement.getElementById("highlight");
        highlight = highlightSpan ? highlightSpan.textContent.trim() : "";
      } catch (e) {
        console.error(e);
      }

      // Find note text
      let note = "";
      try {
        const noteSpan = annotationElement.getElementById("note");
        note = noteSpan ? noteSpan.textContent.trim() : "";
      } catch (e) {
        console.error(e);
      }

      if (id && (highlight || note)) {
        annotations.push({ id, highlight, note });
      }
    }
  }

  return annotations;
}
