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
  const vowels = new Set(["a", "e", "i", "o", "u"]);
  if (s.length === 0) {
    return 0;
  }

  let maxVowels = 0;
  let currentVowels = 0;
  let start = 0;
  let end = Math.min(s.length - 1, k - 1);

  // Count first window
  for (let i = start; i <= end; i++) {
    currentVowels += vowels.has(s[i]) ? 1 : 0;
  }
  if (currentVowels === k) {
    return k;
  }

  // Count the rest of the windows
  while (end < s.length) {
    if (vowels.has(s[start - 1])) {
      currentVowels--;
    }
    if (vowels.has(s[end])) {
      currentVowels++;
    }
    maxVowels = currentVowels > maxVowels ? currentVowels : maxVowels;
    if (maxVowels === k) {
      return k;
    }
    start++;
    end++;
  }

  return maxVowels;
}

function test() {
  main("abciiidef", 3);
}

test();
