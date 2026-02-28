const path = require("path");
const fs = require("fs");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const RemoveEmptyScriptsPlugin = require("webpack-remove-empty-scripts");

const COPY_PATTERNS = [];
const API_BASE = "/api/dbx/";
const DATA_DIR = path.resolve(__dirname, "data") + "/nohost.dev/";

const getDropboxPath = (path) => DATA_DIR + path.substring(API_BASE.length);

const config = {
  entry: {
    "oauth-callback": "./lib/oauth-callback.js",
  },
  devServer: {
    static: {
      directory: path.join(__dirname, "docs"),
    },
    hot: true,
    setupMiddlewares: (middlewares, devServer) => {
      // Accesses JSON files in data dir like it would with Dropbox.
      const genericRoute = `${API_BASE}*`;

      devServer.app.get(genericRoute, (req, res) => {
        const filePath = getDropboxPath(req.url);
        if (!fs.existsSync(filePath)) return res.json({ success: false });
        const contents = fs.readFileSync(filePath, "utf8");
        res.json({ success: true, data: contents });
      });

      devServer.app.post(genericRoute, (req, res) => {
        let body = "";
        req.on("data", (chunk) => (body += chunk));
        req.on("end", () => {
          const filePath = getDropboxPath(req.url);
          fs.writeFileSync(filePath, body);
          res.json({ success: true });
        });
      });

      return middlewares;
    },
  },
  output: {
    path: path.resolve(__dirname, "dist/"),
  },
  module: {
    rules: [
      {
        test: /\.(js|mjs|jsx|ts|tsx)$/,
        exclude: /node_modules\/(?!(wallace)\/).*/,
        use: [
          {
            loader: "babel-loader",
          },
        ],
      },
      {
        test: /\.(css|scss)$/,
        use: [
          MiniCssExtractPlugin.loader, // extracts CSS into file
          "css-loader", // resolves @import and url()
          "sass-loader", // compiles SCSS → CSS
        ],
      },
    ],
  },
  resolve: {
    fallback: { crypto: false },
  },
  plugins: [
    // This is necessary are we're creating entries for CSS, but that emits empty JS
    // files, so we delete those.
    new RemoveEmptyScriptsPlugin(),
    new MiniCssExtractPlugin({
      filename: ({ chunk }) => `${chunk.name}.css`,
    }),
  ],
};

const addCopyPattern = (src, dest) => {
  COPY_PATTERNS.push({
    from: src,
    to: dest,
  });
};

/*
This collects all manifest files from apps dir and loads them as webpack
entries.
TODO: should we load from settings instead?
*/
const loadApps = (config) => {
  entries = [];
  fs.readdirSync("./apps").forEach((app) => {
    const manifestPath = `./apps/${app}/manifest.json`;
    if (fs.existsSync(manifestPath)) {
      addCopyPattern(manifestPath, `${app}/manifest.json`);
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
      manifest.entries.forEach(([src, out]) => {
        // Needed as we're loading CSS as entries.
        const entryName = `${app}/${out.replace(/\.(css|js)$/, "")}`;
        entries.push({
          import: `./apps/${app}/${src}`,
          name: entryName,
        });
      });
    }
  });
  Object.assign(
    config.entry,
    Object.fromEntries(entries.map((e) => [e.name, e.import]))
  );
};

const configureForEnv = (config) => {
  config.mode = process.env.NODE_ENV || "development";
  if (config.mode === "production") {
    config.optimization = {
      minimize: true,
    };
  } else {
    // Copies settings so it can be reached by /your/settings.json
    // TODO: change this to fake API call.
    addCopyPattern("./apps/settings.json", "your/settings.json");
    config.devtool = "eval-source-map";
    // config.devtool = "inline-source-map";
  }
};

module.exports = function () {
  loadApps(config);
  configureForEnv(config);
  if (COPY_PATTERNS.length > 0) {
    config.plugins.push(
      new CopyWebpackPlugin({
        patterns: COPY_PATTERNS,
      })
    );
  }
  console.log(config.entry);
  return config;
};
