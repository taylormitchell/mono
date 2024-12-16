/**
 *
 * brute force:
 * set i j to size of window
 * start on left side
 * count vowels in window
 * move i++, j++
 * count vowels
 * etc
 * kee track of max vowels
 *
 * optimized:
 * have current count of vowels
 * when move left, decrement count if first is vowel
 * increment count if next is vowel
 * (this only does one less vowel check. we _could_ keep track of the each index is vowel or not, then we only need to check a boolean instead of a vowel array check)
 */

function main(s: string, k: number): number {
  if (s.length === 0) {
    return 0;
  }
  let maxVowels = 0;
  let currentVowels = 0;
  let start = 0;
  let end = Math.min(s.length - 1, k);
  while (end < s.length) {}
}
