import { createPosition, createPositionBetween } from "../position";

describe("position utilities", () => {
  describe("createPositionBetween", () => {
    it("should create position between two existing positions", () => {
      const pos1 = createPosition(2000);
      const pos2 = createPosition(1000);
      const between = createPositionBetween(pos1, pos2);

      expect(between > pos1).toBe(true);
      expect(between < pos2).toBe(true);
    });

    it("should handle moving to start of list", () => {
      const firstPos = createPosition(1000);
      const newFirst = createPositionBetween(null, firstPos);

      expect(newFirst < firstPos).toBe(true);
    });

    it("should handle moving to end of list", () => {
      const lastPos = createPosition(1000);
      const newLast = createPositionBetween(lastPos, null);

      expect(newLast > lastPos).toBe(true);
    });

    it("should handle empty list", () => {
      const position = createPositionBetween(null, null);
      expect(position).toBeTruthy();
    });
  });

  describe("list reordering scenarios", () => {
    it("should correctly reorder items in a list", () => {
      // Create a list of 4 items
      const positions = [
        createPosition(4000),
        createPosition(3000),
        createPosition(2000),
        createPosition(1000),
      ];

      // Move item up (from index 2 to between 0 and 1)
      const moveUp = createPositionBetween(positions[0], positions[1]);
      expect(moveUp > positions[0]).toBe(true);
      expect(moveUp < positions[1]).toBe(true);

      // Move item down (from index 1 to between 2 and 3)
      const moveDown = createPositionBetween(positions[2], positions[3]);
      expect(moveDown > positions[2]).toBe(true);
      expect(moveDown < positions[3]).toBe(true);
    });
  });
});
