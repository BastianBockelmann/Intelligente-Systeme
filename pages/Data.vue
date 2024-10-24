<script lang="ts">
import { defineComponent, ref } from 'vue';
// import { useFetch } from '@nuxt/http';
import { useFetch } from '#app';

const loading = ref(false);
const message = ref('');

export default defineComponent({
  methods: {
    async updateAuswaertigesAmt() {
      console.log('Daten Auswärtiges Amt aktualisieren Button wurde geklickt!');
      // Ladezustand auf true setzen
      loading.value = true;
      try {
        // API-Aufruf an die Route /api/fetch-AuswaertigsAmt
        const response = await $fetch('/api/fetch-AuswaertigsAmt');
        // Erfolgsnachricht setzen
        message.value = response.message;
      } catch (error) {
        // Fehlernachricht setzen, falls etwas schiefgeht
        console.error(error);
        message.value = 'Fehler beim Aktualisieren der Daten';
      } finally {
        // Ladezustand wieder auf false setzen, wenn der Aufruf abgeschlossen ist
        loading.value = false;
      }
    },
    async updateDataTest() {
        console.log('Test Button wurde geklickt!');
      },
    async testPinecone() {
        console.log('Pinecone prüfen und ggf. initalisieren Button wurde geklickt!');
      },
    async writePinecone() {
        console.log('Pinecone Daten aktualisieren/hochladen Button wurde geklickt!');
        try {
          const { data, error } = await useFetch('/api/storeData'); // Stelle eine Anfrage an deine API-Route

          if (error.value) {
            throw new Error(error.value);
          }

          message.value = data.value.message; // Setze die Erfolgs- oder Fehlermeldung
        } catch (err) {
          message.value = `Error: ${err.message}`; // Setze die Fehlermeldung
        }
    }
    }
});
</script>

<template>
  <div class="h-screen flex flex-col justify-between">
    <div class="flex justify-center items-center px-2">
      <!-- Header Area -->
      <span class="w-full text-gray-700 dark:text-gray-100 text-center text-xl font-semibold py-3">
        Datengrundlage - Testseite für die Datenabfragen
      </span>
    </div>

    <!-- Content Area -->
    <div ref="chatContainer" class="h-full text-gray-800 flex flex-col space-y-4 overflow-y-auto p-4 relative">
        <!-- Buttons für die verschiedenen Daten -->
        <UButton @click="updateAuswaertigesAmt" size="lg" :disabled="loading">
        <!-- Text des Buttons ändert sich je nach Ladezustand -->
        {{ loading ? 'Wird geladen...' : 'API Auswärtiges Amt aktualisieren' }}
      </UButton>
      <!-- Anzeige einer Nachricht nach Abschluss des API-Aufrufs -->
      <p v-if="message">{{ message }}</p>
      <UButton @click="updateDataTest" size="lg">
        Test aktualisieren Button
      </UButton>
      <UButton @click="testPinecone" size="lg">
        VektorDB / Pinecone prüfen und ggf. initialisieren
      </UButton>
      <UButton @click="writePinecone" size="lg">
        Daten in VektorDB / Pinecone hochladen
      </UButton>
    </div>
  </div>
</template>

<style scoped>
/* Optional: Styling für den Button im Ladezustand */
UButton:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>
