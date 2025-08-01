import { c as collectBodyString } from "../index.js";
const _json = (obj) => {
  if (obj == null) {
    return {};
  }
  if (Array.isArray(obj)) {
    return obj.filter((_) => _ != null).map(_json);
  }
  if (typeof obj === "object") {
    const target = {};
    for (const key of Object.keys(obj)) {
      if (obj[key] == null) {
        continue;
      }
      target[key] = _json(obj[key]);
    }
    return target;
  }
  return obj;
};
const parseJsonBody = (streamBody, context) => collectBodyString(streamBody, context).then((encoded) => {
  if (encoded.length) {
    try {
      return JSON.parse(encoded);
    } catch (e) {
      if (e?.name === "SyntaxError") {
        Object.defineProperty(e, "$responseBodyText", {
          value: encoded
        });
      }
      throw e;
    }
  }
  return {};
});
const parseJsonErrorBody = async (errorBody, context) => {
  const value = await parseJsonBody(errorBody, context);
  value.message = value.message ?? value.Message;
  return value;
};
const loadRestJsonErrorCode = (output, data) => {
  const findKey = (object, key) => Object.keys(object).find((k) => k.toLowerCase() === key.toLowerCase());
  const sanitizeErrorCode = (rawValue) => {
    let cleanValue = rawValue;
    if (typeof cleanValue === "number") {
      cleanValue = cleanValue.toString();
    }
    if (cleanValue.indexOf(",") >= 0) {
      cleanValue = cleanValue.split(",")[0];
    }
    if (cleanValue.indexOf(":") >= 0) {
      cleanValue = cleanValue.split(":")[0];
    }
    if (cleanValue.indexOf("#") >= 0) {
      cleanValue = cleanValue.split("#")[1];
    }
    return cleanValue;
  };
  const headerKey = findKey(output.headers, "x-amzn-errortype");
  if (headerKey !== void 0) {
    return sanitizeErrorCode(output.headers[headerKey]);
  }
  if (data && typeof data === "object") {
    const codeKey = findKey(data, "code");
    if (codeKey && data[codeKey] !== void 0) {
      return sanitizeErrorCode(data[codeKey]);
    }
    if (data["__type"] !== void 0) {
      return sanitizeErrorCode(data["__type"]);
    }
  }
};
export {
  _json as _,
  parseJsonErrorBody as a,
  loadRestJsonErrorCode as l,
  parseJsonBody as p
};
