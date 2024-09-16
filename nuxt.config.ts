export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  modules: [
    '@nuxt/icon',
    '@nuxt/content',
    '@nuxt/image',
    '@nuxt/devtools',
    '@nuxt/ui'
  ],
  devtools: { enabled: true },
  typescript: {
    shim: false
  },
})
