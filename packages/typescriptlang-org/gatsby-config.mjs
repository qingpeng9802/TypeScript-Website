import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { createRequire } from 'module'
import rehypeShiki from '@shikijs/rehype'
import { transformerTwoslash } from '@shikijs/twoslash'

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))

if (process.env.BOOTSTRAPPING) {
  const chalk = require("chalk")
  const readline = require("readline")
  const blank = "\n".repeat(process.stdout.rows)
  console.log(blank)
  readline.cursorTo(process.stdout, 0, 0)
  readline.clearScreenDown(process.stdout)

  // prettier-ignore
  console.log(`
  Bootstrapped. You can now run the site with ${chalk.greenBright.bold("pnpm start")}.`)
  process.exit(0)
}

require("./scripts/ensureDepsAreBuilt")

// https://github.com/gatsbyjs/gatsby/issues/1457
require("ts-node").register({ files: true })

export default {
  siteMetadata: {
    siteUrl: `https://www.typescriptlang.org/`,
  },
  graphqlTypegen: {
    // Ensure it works in a monorepo
    typesOutputPath: `${__dirname}/src/__generated__/gatsby-types.ts`,
  },
  flags: {
    DEV_SSR: false,
  },
  plugins: [
    // SCSS provides inheritance for CSS and which pays the price for the dep
    {
      resolve: `gatsby-plugin-sass`,
      options: {
        implementation: require("sass"),
      },
    },
    // PWA metadata
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `TypeScript Documentation`,
        short_name: `TS Docs`,
        start_url: `/`,
        background_color: `white`,
        theme_color: `#3178C6`,
        display: `standalone`,
        icon: `static/icons/ts-logo-512.png`,
      },
    },

    // Support for downloading or pre-caching pages, needed for PWAs
    // "gatsby-plugin-offline",

    // SEO
    {
      resolve: `gatsby-plugin-sitemap`,
      options: {
        // Skip handbook v2 from appearing in search
        excludes: [`*/glossary`, `*/vo/*`],
      },
    },
    // Lets you edit the head from inside a react tree
    "gatsby-plugin-react-helmet",
    // Grabs the old handbook markdown files
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/../documentation/copy`,
        name: `documentation`,
      },
    },
    // Grabs file from the tsconfig reference
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/../tsconfig-reference/output`,
        name: `tsconfig-reference`,
      },
    },
    // Grabs file from the tsconfig reference
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/../glossary/output`,
        name: `glossary`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/../playground-examples/generated`,
        name: `playground-examples`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/../playground-examples/copy`,
        name: `all-playground-examples`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/../tsconfig-reference/copy/en/options`,
        name: `tsconfig-en`,
      },
    },
    {
      resolve: `gatsby-source-filesystem`,
      options: {
        path: `${__dirname}/../playground-handbook/copy`,
        name: `playground-handbook`,
      },
    },
    {
      resolve: "gatsby-plugin-i18n",
      options: {
        langKeyDefault: "en",
        useLangKeyLayout: true,
      },
    },

    // Markdown support, and markdown + react
    {
      resolve: `gatsby-plugin-mdx`,
      options: {
        extensions: [`.md`, `.mdx`],
        gatsbyRemarkPlugins: [
          {
            resolve: `gatsby-remark-images`,
            options: {
              maxWidth: 590,
            },
          },
          {
            resolve: `gatsby-remark-responsive-iframe`,
            options: {
              wrapperStyle: `margin-bottom: 1.0725rem`,
            },
          },
          "gatsby-remark-autolink-headers",
          "gatsby-remark-copy-linked-files",
          "gatsby-remark-smartypants",
        ],
        mdxOptions: {
          format: 'md',
          rehypePlugins: [
            [
              rehypeShiki,
              {
                themes: {
                  light: 'light-plus',
                  dark: 'dark-plus',
                },
                transformers: [transformerTwoslash({explicitTrigger: true})],
              },
            ],
          ],
        },
      },
    },
    // avoid mdx trying to create pages for `/src/pages/README.md`
    {
      resolve: `gatsby-plugin-page-creator`,
      options: {
        path: `${__dirname}/src/pages`,
        ignore: [`**/README.md`], 
      },
    },
    // Finds auto-generated <a>s and converts them
    // into Gatsby Links at build time, speeding up
    // linking between pages.
    {
      resolve: `gatsby-plugin-catch-links`,
      options: {
        excludePattern: /(sandbox|play|dev)/,
      },
    },
    "gatsby-plugin-client-side-redirect",
  ],
}
