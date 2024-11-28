/**
 * brute force
 * 1 + 2 + 3 + ... + n = n(n+1)/2 = O(n^2)
 *
 * outside in?
 * missed some options
 *
 *
 * area = Math.min(h1, h2) * x
 *
 *
 * somehow keep track of the heights
 *
 * when you get to a pillar, you ask whats the biggest
 * container that can be created to the left of the pillar
 *
 * you want to know what pillar is equal to or bigger than
 * the current one which is furthest away
 *
 * you could keep a map where for each height you keep
 * Map<height, xPos[]>
 * {
 *   1: []
 * }
 * but you'd still need to iterate over all the heights equal
 * to or bigger than. if every pillar height is different height,
 *
 * [null, [0], ... [2], [1, 6]]
 *
 *
 *
 *
 *
 */

function main(height: number[]): number {
  let maxArea = 0;
  let l = 0;
  let r = height.length - 1;
  while (r > l) {
    const area = (r - l) * Math.min(height[l], height[r]);
    if (area > maxArea) {
      maxArea = area;
    }
    if (height[l] < height[r]) {
      l += 1;
    } else {
      r -= 1;
    }
  }
  return maxArea;
}
