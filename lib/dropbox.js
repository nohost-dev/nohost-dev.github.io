const API_BASE = "https://cf-worker.andyhasit.workers.dev";

function login() {
  window.location.href =
    `${API_BASE}/login?returnTo=` + encodeURIComponent(window.location.href);
}

async function isLoggedIn() {
  const res = await fetch(`${API_BASE}/me`, {
    credentials: "include",
  });

  return res.ok;
}

async function uploadFile(path, blob) {
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    credentials: "include",
    headers: {
      "x-dropbox-path": path,
    },
    body: blob,
  });

  if (res.status === 401) {
    login();
    return;
  }

  if (!res.ok) {
    throw new Error(await res.text());
  }

  return await res.json();
}

async function downloadFile(path) {
  const res = await fetch(
    `${API_BASE}/download?path=${encodeURIComponent(path)}`,
    {
      credentials: "include",
    }
  );

  if (res.status === 401) {
    login();
    return;
  }

  return res; //.blob();
}

export const dbx = {
  // getText: async function (path) {
  //   return fileCall("download", path).then((res) => res.text());
  // },
  // putText: async function (path, data) {
  //   return fileCall("upload", path, data);
  // },
  getJson: async function (path) {
    return downloadFile(path).then((res) => res.json());
  },
  putJson: async function (path, data) {
    const blob = new Blob([JSON.stringify(data)], { type: "text/plain" });
    return uploadFile(path, blob);
  },
};
