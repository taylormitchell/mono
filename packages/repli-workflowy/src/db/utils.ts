import { v4 as uuidv4 } from "uuid";

export function generateId() {
  return uuidv4();
}

export function generateNodeId() {
  return `nod-${generateId()}`;
}

export function generateRelationId() {
  return `rel-${generateId()}`;
}
