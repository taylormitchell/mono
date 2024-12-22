module.exports = {
  // Tells Babel to transpile modern ESM syntax into CommonJS (or older JS),
  // letting Jest run it.
  presets: [
    [
      "@babel/preset-env",
      {
        // e.g. for Node 16, you might do:
        targets: { node: "16" },
      },
    ],
  ],

  // If you also want to handle JSX or TypeScript here, you’d add:
  // presets: ["@babel/preset-env", "@babel/preset-react", "@babel/preset-typescript"]
};
