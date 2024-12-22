export default {
  preset: "ts-jest",
  testEnvironment: "node",
  transform: {
    "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.test.json" }],
    "^.+\\.js$": "babel-jest",
    // "^.+\\.js$": "./babel-transform.js",
  },
  transformIgnorePatterns: ["node_modules/(?!(fractional-indexing)/)"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
};
