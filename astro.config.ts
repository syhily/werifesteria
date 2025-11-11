import type { Plugin } from 'vite'
import process from 'node:process'
import mdx from '@astrojs/mdx'
import node from '@astrojs/node'
import rehypeMathML from '@daiji256/rehype-mathml'
import {
  transformerNotationDiff,
  transformerNotationErrorLevel,
  transformerNotationFocus,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from '@shikijs/transformers'
import uploader from 'astro-uploader'
import { defineConfig, envField } from 'astro/config'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import rehypeExternalLinks from 'rehype-external-links'
import rehypeSlug from 'rehype-slug'
import rehypeTitleFigure from 'rehype-title-figure'
import remarkMath from 'remark-math'
import { loadEnv } from 'vite'
import vitePluginBinary from 'vite-plugin-binary'
import config from './src/blog.config.js'

const {
  UPLOAD_STATIC_FILES,
  S3_ENDPOINT,
  S3_BUCKET,
  S3_ACCESS_KEY,
  S3_SECRET_ACCESS_KEY,
  REDIS_URL,
  NODE_ENV,
} = loadEnv(process.env.NODE_ENV!, process.cwd(), '')

// Plugin to exclude TTF files from being included in build assets
function excludeNotoSansSC(): Plugin {
  return {
    name: 'exclude-noto-sans-sc',
    generateBundle(_, bundle) {
    // Remove TTF files from the bundle to prevent them from being included in build assets
      for (const fileName in bundle) {
        if (fileName.endsWith('.ttf') && fileName.includes('NotoSansSC')) {
          delete bundle[fileName]
        }
      }
    },
  }
}

// https://astro.build/config
export default defineConfig({
  site: NODE_ENV === 'production' ? 'https://yufan.me' : 'http://localhost:4321',
  output: 'server',
  security: {
    checkOrigin: true,
  },
  experimental: {
    preserveScriptOrder: true,
    staticImportMetaEnv: true,
  },
  trailingSlash: 'never',
  image: {
    domains: [config.settings.asset.host, 'localhost', '127.0.0.1'],
    service: { entrypoint: './src/helpers/content/image/qiniu' },
    layout: 'constrained',
    responsiveStyles: true,
  },
  session: {
    driver: 'redis',
    ttl: 60 * 60,
    options: {
      url: REDIS_URL,
    },
    cookie: {
      name: 'yufan-me-session',
      sameSite: 'lax',
      secure: true,
    },
  },
  env: {
    schema: {
      // SMTP Service
      SMTP_HOST: envField.string({ context: 'server', access: 'secret', optional: true }),
      SMTP_PORT: envField.number({ context: 'server', access: 'secret', optional: true }),
      SMTP_SECURE: envField.boolean({ context: 'server', access: 'secret', optional: true, default: true }),
      SMTP_USER: envField.string({ context: 'server', access: 'secret', optional: true }),
      SMTP_PASSWORD: envField.string({ context: 'server', access: 'secret', optional: true }),
      SMTP_SENDER: envField.string({ context: 'server', access: 'secret', optional: true }),
      // Database
      DATABASE_URL: envField.string({ context: 'server', access: 'secret', url: true }),
      REDIS_URL: envField.string({ context: 'server', access: 'secret', url: true }),
    },
    validateSecrets: true,
  },
  integrations: [
    mdx({
      remarkPlugins: [remarkMath],
      rehypePlugins: [
        [rehypeTitleFigure],
        [rehypeExternalLinks, { rel: 'nofollow', target: '_blank' }],
        rehypeSlug,
        [rehypeAutolinkHeadings, { behavior: 'append', properties: {} }],
        rehypeMathML,
      ],
    }),
    uploader({
      enable: UPLOAD_STATIC_FILES === 'true',
      paths: ['assets'],
      endpoint: S3_ENDPOINT,
      bucket: S3_BUCKET,
      accessKey: S3_ACCESS_KEY,
      secretAccessKey: S3_SECRET_ACCESS_KEY,
    }),
  ],
  adapter: node({
    mode: 'standalone',
  }),
  markdown: {
    gfm: true,
    shikiConfig: {
      theme: 'solarized-light',
      wrap: false,
      transformers: [
        transformerNotationDiff({
          matchAlgorithm: 'v3',
        }),
        transformerNotationHighlight({
          matchAlgorithm: 'v3',
        }),
        transformerNotationWordHighlight({
          matchAlgorithm: 'v3',
        }),
        transformerNotationFocus({
          matchAlgorithm: 'v3',
        }),
        transformerNotationErrorLevel({
          matchAlgorithm: 'v3',
        }),
      ],
    },
  },
  server: {
    port: 4321,
  },
  devToolbar: {
    enabled: false,
  },
  vite: {
    optimizeDeps: {
      exclude: [
        '@napi-rs/canvas',
        'sharp',
      ],
    },
    plugins: [
      vitePluginBinary({ gzip: true }),
      excludeNotoSansSC(),
    ],
    assetsInclude: ['images/**/*'],
  },
  build: {
    assets: 'assets',
    assetsPrefix: `${config.settings.asset.scheme}://${config.settings.asset.host}`,
  },
})
