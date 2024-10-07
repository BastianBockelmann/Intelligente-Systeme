import { Langfuse } from 'langfuse';

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig();

  // Langfuse initialisieren mit Werten aus der Runtime-Konfiguration
  const langfuse = new Langfuse({
    secretKey: config.langfuseSecretKey,
    publicKey: config.langfusePublicKey,
    baseUrl: 'https://cloud.langfuse.com',
  });

  // Langfuse in Nuxt App zur Verfügung stellen
  nuxtApp.provide('langfuse', langfuse);
});