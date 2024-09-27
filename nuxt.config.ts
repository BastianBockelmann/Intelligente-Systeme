export default defineNuxtConfig({
  runtimeConfig: {
    openaiApiKey: 'test',
  },
  compatibilityDate: '2024-04-03',
  modules: [
    '@nuxt/icon',
    '@nuxt/content',
    '@nuxt/devtools',
    '@nuxt/ui',
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt'
  ],
  devtools: { enabled: true },
  typescript: {
    shim: false
  },
  colorMode: {
    preference: 'light'
  }
})
