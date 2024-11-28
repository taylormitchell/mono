function main(word1: string, word2: string) {
  let result = "";
  for (let i = 0; i < Math.max(word1.length, word2.length); i++) {
    result += word1[i] || "";
    result += word2[i] || "";
  }
  return result;
}

console.log(main("test", "something"));
