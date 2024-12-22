export default {
  process(src, filename, config, transformOptions) {
    console.log(`Transforming file: ${filename}`);
    // Optionally dump some of the source code or partial code if you'd like
    // console.log('--- Source code start ---');
    // console.log(src.substr(0, 200));  // or however much you feel comfortable logging
    // console.log('--- Source code end ---\n');

    // Then pass it through the usual babel-jest:
    // return babelJest.process(src, filename, config, transformOptions);
    return src;
  },
};
