function largestAltitude(gain: number[]): number {
  let max = 0;
  let sum = 0;
  for (const diff of gain) {
    sum += diff;
    max = sum > max ? sum : max;
  }
  return max;
}

console.log(largestAltitude([-4, -3, -2, -1, 4, 3, 2]));
