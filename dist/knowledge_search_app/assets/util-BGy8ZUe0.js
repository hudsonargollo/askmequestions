import { n as notImplemented } from "../index.js";
const isRegExp = (val) => val instanceof RegExp;
const isDate = (val) => val instanceof Date;
const isBoolean = (val) => typeof val === "boolean";
const isNull = (val) => val === null;
const isNullOrUndefined = (val) => val === null || val === void 0;
const isNumber = (val) => typeof val === "number";
const isString = (val) => typeof val === "string";
const isSymbol = (val) => typeof val === "symbol";
const isUndefined = (val) => val === void 0;
const isFunction = (val) => typeof val === "function";
const isBuffer = (val) => {
  return val && typeof val === "object" && typeof val.copy === "function" && typeof val.fill === "function" && typeof val.readUInt8 === "function";
};
const isObject = (val) => val !== null && typeof val === "object" && Object.getPrototypeOf(val).isPrototypeOf(Object);
const isError = (val) => val instanceof Error;
const isPrimitive = (val) => {
  if (typeof val === "object") {
    return val === null;
  }
  return typeof val !== "function";
};
const _errnoException = /* @__PURE__ */ notImplemented("util._errnoException");
const _exceptionWithHostPort = /* @__PURE__ */ notImplemented("util._exceptionWithHostPort");
const getSystemErrorMap = /* @__PURE__ */ notImplemented("util.getSystemErrorMap");
const getSystemErrorName = /* @__PURE__ */ notImplemented("util.getSystemErrorName");
const parseEnv = /* @__PURE__ */ notImplemented("util.parseEnv");
const styleText = /* @__PURE__ */ notImplemented("util.styleText");
const workerdUtil = process.getBuiltinModule("node:util");
const {
  MIMEParams,
  MIMEType,
  TextDecoder,
  TextEncoder,
  // @ts-expect-error missing types?
  _extend,
  aborted,
  callbackify,
  debug,
  debuglog,
  deprecate,
  format,
  formatWithOptions,
  // @ts-expect-error unknown type
  getCallSite,
  inherits,
  inspect,
  isArray,
  isDeepStrictEqual,
  log,
  parseArgs,
  promisify,
  stripVTControlCharacters,
  toUSVString,
  transferableAbortController,
  transferableAbortSignal
} = workerdUtil;
const types = workerdUtil.types;
const util = {
  /**
   * manually unroll unenv-polyfilled-symbols to make it tree-shakeable
   */
  _errnoException,
  _exceptionWithHostPort,
  // @ts-expect-error unenv has unknown type
  getSystemErrorMap,
  // @ts-expect-error unenv has unknown type
  getSystemErrorName,
  isBoolean,
  isBuffer,
  isDate,
  isError,
  isFunction,
  isNull,
  isNullOrUndefined,
  isNumber,
  isObject,
  isPrimitive,
  isRegExp,
  isString,
  isSymbol,
  isUndefined,
  // @ts-expect-error unenv has unknown type
  parseEnv,
  // @ts-expect-error unenv has unknown type
  styleText,
  /**
   * manually unroll workerd-polyfilled-symbols to make it tree-shakeable
   */
  _extend,
  aborted,
  callbackify,
  debug,
  debuglog,
  deprecate,
  format,
  formatWithOptions,
  getCallSite,
  inherits,
  inspect,
  isArray,
  isDeepStrictEqual,
  log,
  MIMEParams,
  MIMEType,
  parseArgs,
  promisify,
  stripVTControlCharacters,
  TextDecoder,
  TextEncoder,
  toUSVString,
  transferableAbortController,
  transferableAbortSignal,
  // special-cased deep merged symbols
  types
};
const util$1 = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  MIMEParams,
  MIMEType,
  TextDecoder,
  TextEncoder,
  _errnoException,
  _exceptionWithHostPort,
  _extend,
  aborted,
  callbackify,
  debug,
  debuglog,
  default: util,
  deprecate,
  format,
  formatWithOptions,
  getCallSite,
  getSystemErrorMap,
  getSystemErrorName,
  inherits,
  inspect,
  isArray,
  isBoolean,
  isBuffer,
  isDate,
  isDeepStrictEqual,
  isError,
  isFunction,
  isNull,
  isNullOrUndefined,
  isNumber,
  isObject,
  isPrimitive,
  isRegExp,
  isString,
  isSymbol,
  isUndefined,
  log,
  parseArgs,
  parseEnv,
  promisify,
  stripVTControlCharacters,
  styleText,
  toUSVString,
  transferableAbortController,
  transferableAbortSignal,
  types
}, Symbol.toStringTag, { value: "Module" }));
export {
  promisify as p,
  util$1 as u
};
