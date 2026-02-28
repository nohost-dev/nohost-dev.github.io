/*

Client-Side PKCE Flow:

  1	Generate PKCE challenge/verifier
  2	Redirect user to Dropbox authorize page
  3	User returns with code
  4	Exchange code + code_verifier for tokens
  5	Use access token
  6	Refresh token as needed

Notes:
  The code_verifier is stored in sessionStorage as we need to retrieve it after a
  redirect. We have no option but to store the token in sessionStorage, which sucks.
*/

const APP_KEY = "f57qgf4puqhz5wi";

async function refreshAccessToken() {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: tokenData.refresh_token,
    client_id: APP_KEY,
  });

  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  return await res.json();
}

async function fetchFile(path) {
  const url = "https://content.dropboxapi.com/2/files/download";
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
      "Dropbox-API-Arg": JSON.stringify({
        path: path,
      }),
    },
    body: "{}",
  });
  // const data = await res.json();
  // console.log(data);
  // return data
  console.log(res);
}

async function generatePKCE() {
  const array = new Uint8Array(32);
  window.crypto.getRandomValues(array);

  const code_verifier = btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const encoder = new TextEncoder();
  const data = encoder.encode(code_verifier);

  const digest = await crypto.subtle.digest("SHA-256", data);
  const base64Digest = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  const code_challenge = base64Digest;

  return { code_verifier, code_challenge };
}

async function authorize() {
  const { code_verifier, code_challenge } = await generatePKCE();
  sessionStorage.setItem("code_verifier", code_verifier);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: "YOUR_APP_KEY",
    redirect_uri: "https://example.com/auth",
    code_challenge: code_challenge,
    code_challenge_method: "S256",
    token_access_type: "offline", // = get refresh tokens
    scope: "files.content.read",
    state: "xyz123",
  });

  window.location =
    "https://www.dropbox.com/oauth2/authorize?" + params.toString();
}

async function exchangeCodeForToken(code) {
  const code_verifier = sessionStorage.getItem("code_verifier");

  const body = new URLSearchParams({
    code: code,
    grant_type: "authorization_code",
    client_id: "YOUR_APP_KEY",
    redirect_uri: "https://example.com/auth",
    code_verifier: code_verifier,
  });

  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  return await res.json();
}

/*
  Returns token data:
  {
    "access_token": "sl.ABC...",
    "refresh_token": "Afg23...",
    "expires_in": 14400,
    "token_type": "bearer",
    "scope": "files.content.read"
  }
*/
async function getAccessToken() {
  // const urlParams = new URLSearchParams(window.location.search);
  // const code = urlParams.get("code");
  // tokenData = await exchangeCodeForToken(code);
  let tokenData = sessionStorage.getItem("tokenData");
  if (tokenData) {
    tokenData = JSON.parse(tokenData);
  } else {
    // tokenData = await refreshAccessToken();

    sessionStorage.setItem("tokenData", JSON.stringify(tokenData));
  }
  return tokenData.access_token;
}
