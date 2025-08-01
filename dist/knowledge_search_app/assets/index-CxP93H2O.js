import { cb as loadSharedConfigFiles, cc as ENV_KEY, cd as ENV_SECRET, ce as ENV_SESSION, cf as ENV_EXPIRATION, cg as ENV_CREDENTIAL_SCOPE, ch as ENV_ACCOUNT_ID, ci as fromEnv } from "../index.js";
const mergeConfigFiles = (...files) => {
  const merged = {};
  for (const file of files) {
    for (const [key, values] of Object.entries(file)) {
      if (merged[key] !== void 0) {
        Object.assign(merged[key], values);
      } else {
        merged[key] = values;
      }
    }
  }
  return merged;
};
const parseKnownFiles = async (init) => {
  const parsedFiles = await loadSharedConfigFiles(init);
  return mergeConfigFiles(parsedFiles.configFile, parsedFiles.credentialsFile);
};
const index = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  ENV_ACCOUNT_ID,
  ENV_CREDENTIAL_SCOPE,
  ENV_EXPIRATION,
  ENV_KEY,
  ENV_SECRET,
  ENV_SESSION,
  fromEnv
}, Symbol.toStringTag, { value: "Module" }));
export {
  index as i,
  parseKnownFiles as p
};
