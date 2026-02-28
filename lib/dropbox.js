const APP_KEY = "f57qgf4puqhz5wi";
const REDIRECT_URI = window.location.origin + "/oauth-callback.html";

/* ===============================
   STATE
================================ */
let accessToken = null;
let refreshToken = localStorage.getItem("refresh_token") || null;

/* ===============================
   PKCE HELPERS
================================ */
function base64url(bytes) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function generatePKCE() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);

  const codeVerifier = base64url(array);
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier)
  );
  const codeChallenge = base64url(new Uint8Array(hash));

  sessionStorage.setItem("code_verifier", codeVerifier);
  return codeChallenge;
}

/* ===============================
   AUTH FLOW
================================ */
async function startAuth() {
  const codeChallenge = await generatePKCE();

  const state = JSON.stringify({
    returnTo: window.location.pathname + window.location.search,
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: APP_KEY,
    redirect_uri: REDIRECT_URI,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    token_access_type: "offline",
    state: btoa(state),
  });

  window.location =
    "https://www.dropbox.com/oauth2/authorize?" + params.toString();
}

export async function exchangeCode(code) {
  const codeVerifier = sessionStorage.getItem("code_verifier");

  const body = new URLSearchParams({
    code,
    grant_type: "authorization_code",
    client_id: APP_KEY,
    redirect_uri: REDIRECT_URI,
    code_verifier: codeVerifier,
  });

  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json();

  accessToken = data.access_token;
  refreshToken = data.refresh_token;

  console.log("Token exchange result:", data);
  if (refreshToken) {
    localStorage.setItem("refresh_token", refreshToken);
  }
}

async function refreshAccessToken() {
  if (!refreshToken) return;

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: APP_KEY,
  });

  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await res.json();
  accessToken = data.access_token;
}

async function ensureAccessToken(pathIfAuthNeeded) {
  if (accessToken) return;

  if (refreshToken) {
    await refreshAccessToken();
    if (accessToken) return;
  }

  // No usable token → begin OAuth
  if (pathIfAuthNeeded) {
    sessionStorage.setItem("pending_file", pathIfAuthNeeded);
  }

  startAuth();
}

/* ===============================
   FETCH FILE
================================ */
export async function fetchFile(path) {
  await ensureAccessToken(path);

  // If startAuth() triggered redirect,
  // execution stops here.

  console.log("Fetching", path);
  const res = await fetch("https://content.dropboxapi.com/2/files/download", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Dropbox-API-Arg": JSON.stringify({ path }),
    },
  });

  if (res.status === 401) {
    await refreshAccessToken();
    return fetchFile(path);
  }

  if (!res.ok) {
    throw new Error("Dropbox error: " + res.status);
  }

  return await res.text();
}

/* ===============================
   LOGOUT
================================ */
function logout() {
  accessToken = null;
  refreshToken = null;
  localStorage.removeItem("refresh_token");
  alert("Logged out");
}

/* ===============================
   INIT (Handles OAuth Redirect)
================================ */
(async function init() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");

  if (code) {
    await exchangeCode(code);

    // Clean URL
    window.history.replaceState({}, document.title, REDIRECT_URI);

    // Resume pending file request
    const pending = sessionStorage.getItem("pending_file");
    if (pending) {
      sessionStorage.removeItem("pending_file");
      const content = await fetchFile(pending);
      document.getElementById("output").textContent = content;
    }
  }
})();
