function flattenOptionalParams(optionalParams: any[]) {
  return optionalParams.map((param) => {
    if (typeof param === "object") {
      try {
        return JSON.stringify(param);
      } catch (e) {
        param = param.toString();
      }
    }
    if (typeof param === "string" && param.includes("\n")) {
      return param.replace(/\n/g, " ");
    }
    return param;
  });
}

export const log = {
  info: (message?: any, ...optionalParams: any[]) => {
    const flat = flattenOptionalParams(optionalParams);
    console.log(`[${new Date().toISOString()}] [INFO] `, message, ...flat);
  },
  warn: (message?: any, ...optionalParams: any[]) => {
    const flat = flattenOptionalParams(optionalParams);
    console.warn(`[${new Date().toISOString()}] [WARN] `, message, ...flat);
  },
  error: (message?: any, ...optionalParams: any[]) => {
    const flat = flattenOptionalParams(optionalParams);
    console.error(`[${new Date().toISOString()}] [ERROR] `, message, ...flat);
  },
};
