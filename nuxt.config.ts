export default defineNuxtConfig({
  runtimeConfig: {
    public: {
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    },
  },
  compatibilityDate: '2024-04-03',
  modules: [
    '@nuxt/icon',
    '@nuxt/content',
    '@nuxt/devtools',
    '@nuxt/ui'
  ],
  devtools: { enabled: true },
  typescript: {
    shim: false
  },
  colorMode: {
    preference: 'light'
  }
})
