const getEl = (id) => {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error("Could not find element with id " + id);
  }
  return element;
};

const fetchJson = (path) =>
  fetch(path, {
    method: "get",
  }).then((response) => response.json());

function Menu() {
  this.wrapperDiv = getEl("menu-wrapper");
  this.overlayDiv = getEl("menu-overlay");
  this.mainMenuTab = getEl("main-menu-tab");
  this.appMenuTab = getEl("app-menu-tab");
  this.appMenuEntries = getEl("app-menu-entries");
  this.mainMenuApps = getEl("main-menu-apps");
  this.showAppTab();
}

Menu.prototype = {
  show: function () {
    this.showAppTab();
    this.wrapperDiv.classList.add("visible");
    this.overlayDiv.classList.add("visible");
  },
  hide: function () {
    this.wrapperDiv.classList.remove("visible");
    this.overlayDiv.classList.remove("visible");
  },
  buildMenuEntry: function (entry) {
    const element = document.createElement("a");
    element.href = entry[0];
    element.innerHTML = entry[1];
    return element;
  },
  noop: function (event) {
    event.stopPropagation();
  },
  showAppTab: function () {
    this.mainMenuTab.hidden = true;
    this.appMenuTab.hidden = false;
  },
  showMainTab: function () {
    this.mainMenuTab.hidden = false;
    this.appMenuTab.hidden = true;
  },
  addApps: function (apps) {
    apps.forEach((entry) => {
      this.mainMenuApps.appendChild(this.buildMenuEntry(entry));
    });
  },
};

window.com = {
  init: function () {
    this.appDiv = getEl("app");
    this.menu = new Menu();
    this.loadSettings();
    this.startLoadingTimeOut();
  },
  loadSettings: function () {
    fetchJson("/your/settings.json").then((data) => {
      this.settings = data;
      this.menu.addApps(
        data.apps.map((app) => [`/your/apps/${app.path}`, app.menu])
      );
    });
  },
  startLoadingTimeOut: function () {
    com._timeout = setTimeout(com.showOfflineMessage, 25000);
  },
  clearLoadingTimeOut: function () {
    clearTimeout(com._timeout);
  },
  deadClick: function (event) {
    event.stopPropagation();
  },
  showOfflineMessage: function () {
    com.appDiv.innerHTML = "<h3>Page timed out</h3>";
  },
  buildMenuEntry: function (entry) {
    return '<a href="' + entry[0] + '">' + entry[1] + "</a>";
  },
  goto: function (route) {
    window.location.href = route;
  },
};

window.onload = function () {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => console.log("Service worker registered."));
  }
  com.init();
};
