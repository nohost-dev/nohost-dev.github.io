// import { exchangeCode } from "./dropbox";

// (async function () {
//   const params = new URLSearchParams(window.location.search);

//   const code = params.get("code");
//   const state = params.get("state");

//   const decodedState = JSON.parse(atob(state));
//   const returnTo = decodedState.returnTo || "/";

//   await exchangeCode(code);

//   window.location.replace(returnTo);
// })();

import { exchangeCode } from "./dropbox";

(async function () {
  const params = new URLSearchParams(window.location.search);

  const code = params.get("code");
  const state = params.get("state");

  if (!code) return;

  // Prevent double execution
  if (sessionStorage.getItem("oauth_code_used") === code) {
    console.warn("Code already processed. Skipping.");
    return;
  }

  sessionStorage.setItem("oauth_code_used", code);

  try {
    await exchangeCode(code);
  } catch (e) {
    console.error("Token exchange failed:", e);
    return;
  }

  // IMPORTANT: Clear query string immediately
  window.history.replaceState({}, document.title, window.location.pathname);

  const decodedState = state ? JSON.parse(atob(state)) : {};
  const returnTo = decodedState.returnTo || "/";
  console.log("returnTo", returnTo);
  window.location.replace(returnTo);
})();
