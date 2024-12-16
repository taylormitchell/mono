/**
 *
 *
 * - if they don't contain the same set of letters, they aren't close
 * - not same count -> false
 * - not same distribution of letter counts { 1, 4, 5}
 *
 * ^ once you satisfy the above
 *
 * - swap positions until you have same run counts
 * - swap letters to make the run letters the same
 *
 * example 1
 * word1 = "abc", word2 = "bca"
 *
 * "cba", "bca"
 * "bca", "bca"
 *
 * example 2
 * word1 = "cabbba", word2 = "abbccc"
 * a,b,c
 *
 *  c a b a    a b c
 * [1,1,3,1], [1,2,3]
 * word1 = "caabbb", word2 = "abbccc"
 * word1 = "cbbaaa", word2 = "abbccc"
 * word1 = "abbccc", word2 = "abbccc"
 *
 * Swap letters to get distribution:
 *
 * maybe do the swapping of letters first to get
 * the distributions the same
 *
 * a b c     a b c
 * 1 2 3     1 2 3
 *
 * Brute force swap:
 * walk along
 * whenever it's not the letter you need
 * go find it to right and do a swap
 * "abbccc"  "abbccc"
 *
 *
 *
 */

function main(s1: string, s2: string) {
  // Must have same size
  if (s1.length !== s2.length) return false;

  // Must have same letters
  const m1 = new Map();
  const m2 = new Map();
  for (const c of s1) {
    m1[c] = (m1.get(c) || 0) + 1;
  }
  for (const c of s2) {
    m2[c] = (m2.get(c) || 0) + 1;
  }
  for (const k of m1.keys()) {
    if (!m2.has(k)) {
      return false;
    }
  }

  // Must have same distributions of letters
  const v1 = sort(m1.values(), (a, b) => b - a);
  const v2 = sort(m2.values(), (a, b) => b - a);
  for (let i = 0; i < v1.length; i++) {
    if (v1 !== v2) {
      return false;
    }
  }
}

console.log(main("abc", "bca"));
