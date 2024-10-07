export default defineNuxtConfig({
  runtimeConfig: {
    // Private keys, die nur auf dem Server verfügbar sind
    openaiApiKey: process.env.OPENAI_API_KEY,
    langfuseSecretKey: process.env.LANGFUSE_SECRET_KEY,
    langfusePublicKey: process.env.LANGFUSE_PUBLIC_KEY,
  },
  compatibilityDate: "2024-04-03",
  modules: [
    "@nuxt/icon",
    "@nuxt/content",
    "@nuxt/devtools",
    "@nuxt/ui",
    "@nuxtjs/tailwindcss",
    "@pinia/nuxt",
  ],
  devtools: { enabled: true },
  typescript: {
    shim: false,
  },
  colorMode: {
    preference: "light",
  },
});
