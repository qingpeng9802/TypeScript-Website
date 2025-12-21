const NodePolyfillPlugin = require("node-polyfill-webpack-plugin");
const { createPages } = require("./lib/bootup/createPages");
const {
  addPathToSite,
  writeAllPathsToFixture,
} = require("./lib/bootup/pathsOnSiteTracker");
const path = require('path');
const fs = require('fs')
const threadLoader = require('thread-loader');

/** @type { import("gatsby").GatsbyNode } */
const config = {};
exports.config = config;

config.createPages = createPages;

// So we don't need to query for all pages
config.onCreatePage = p => addPathToSite(p.page.path);
config.onPostBootstrap = () => writeAllPathsToFixture();
/*
const mdxPool = {
  workers: 2,
  workerParallelJobs: 15,
  poolTimeout: 2000,
  workerNodeArgs: ['--max-old-space-size=256'], 
};

const babelLoaderPath = require.resolve('babel-loader');
const mdxLoaderPath = require.resolve('gatsby-plugin-mdx/dist/gatsby-mdx-loader');
const layoutLoaderPath = require.resolve('gatsby-plugin-mdx/dist/gatsby-layout-loader');

threadLoader.warmup(mdxPool, [
  babelLoaderPath, 
  mdxLoaderPath, 
  layoutLoaderPath
]);*/
// To ensure canvas (used by JSDom) doesn't break builds during SSR
// see: https://github.com/gatsbyjs/gatsby/issues/17661

config.onCreateWebpackConfig = ({ loaders, actions, getConfig, plugins, stage }) => {
  actions.setWebpackConfig({

    devtool: false,
    cache: {
      type: 'filesystem',
      cacheDirectory: path.resolve(__dirname, '.custom_webpack_cache'),
      allowCollectingMemory: true,
      maxMemoryGenerations: 0,
      buildDependencies: {
        config: [__filename],
      },
    },
    module: {
      rules: [
        {
          test: /canvas/,
          use: loaders.null(),
        },
      ],
    },
    externals: {
      pnpapi: "commonjs pnpapi",
      fs: "commonjs fs",
      module: "commonjs module",
    },
    resolve: {
      fallback: {
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        inspector: false,
        jsdom: false,
      },
    },

    
  });
};

module.exports = config;
