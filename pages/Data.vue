<script lang="ts">
import { defineComponent, ref } from 'vue';
import { useFetch } from '#app';

const loading = ref(false);
const message = ref('');
const searchQuery = ref(''); // Für das Suchfeld
const searchResults = ref([]); // Für die Suchergebnisse
const isSearching = ref(false); // Separater Ladezustand für die Suche

export default defineComponent({
  data() {
    return {
      loading,
      message,
      searchQuery,
      searchResults,
      isSearching
    };
  },
  methods: {
    async updateAuswaertigesAmt() {
      console.log('Daten Auswärtiges Amt aktualisieren Button wurde geklickt!');
      loading.value = true;
      try {
        const response = await $fetch('/api/fetch-AuswaertigsAmt');
        message.value = response.message;
      } catch (error) {
        console.error(error);
        message.value = 'Fehler beim Aktualisieren der Daten';
      } finally {
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
        const { data, error } = await useFetch('/api/storeData');
        if (error.value) {
          throw new Error(error.value);
        }
        message.value = data.value.message;
      } catch (err) {
        message.value = `Error: ${err.message}`;
      }
    },

    async searchPinecone() {
      if (!searchQuery.value.trim()) {
        message.value = 'Bitte geben Sie einen Suchbegriff ein';
        return;
      }

      isSearching.value = true;
      message.value = '';
      
      try {
        const { data, error } = await useFetch('/api/queryData', {
          method: 'POST',
          body: {
            queryText: searchQuery.value,
            topK: 5
          }
        });

        if (error.value) {
          throw new Error(error.value);
        }

        searchResults.value = data.value.results;
        if (searchResults.value.length === 0) {
          message.value = 'Keine Ergebnisse gefunden';
        }
      } catch (err) {
        message.value = `Fehler bei der Suche: ${err.message}`;
        searchResults.value = [];
      } finally {
        isSearching.value = false;
      }
    }
  }
});
</script>

<template>
  <div class="h-screen flex flex-col justify-between">
    <div class="flex justify-center items-center px-2">
      <span class="w-full text-gray-700 dark:text-gray-100 text-center text-xl font-semibold py-3">
        Datengrundlage - Testseite für die Datenabfragen
      </span>
    </div>

    <div ref="chatContainer" class="h-full text-gray-800 flex flex-col space-y-4 overflow-y-auto p-4 relative">
      <UButton @click="updateAuswaertigesAmt" size="lg" :disabled="loading">
        {{ loading ? 'Wird geladen...' : 'API Auswärtiges Amt aktualisieren' }}
      </UButton>
      <UButton @click="updateDataTest" size="lg">
        Test aktualisieren Button
      </UButton>
      <UButton @click="testPinecone" size="lg">
        VektorDB / Pinecone prüfen und ggf. initialisieren
      </UButton>
      <UButton @click="writePinecone" size="lg">
        Daten in VektorDB / Pinecone hochladen
      </UButton>

      <div class="mt-8 space-y-4">
        <h2 class="text-lg font-semibold">Pinecone Datenabfrage</h2>
        
        <div class="flex space-x-2">
          <UInput
            v-model="searchQuery"
            placeholder="Geben Sie Ihren Suchbegriff ein..."
            class="flex-grow"
            @keyup.enter="searchPinecone"
          />
          <UButton 
            @click="searchPinecone" 
            :disabled="isSearching"
            class="w-24"
          >
            {{ isSearching ? 'Suche...' : 'Suchen' }}
          </UButton>
        </div>

        <!-- Suchergebnisse -->
        <div v-if="message" class="text-red-500">
          {{ message }}
        </div>

        <div v-if="searchResults.length > 0" class="space-y-4">
          <div v-for="(result, index) in searchResults" :key="index" class="p-4 border rounded-lg">
            <h3 class="font-semibold">{{ result.countryName }}</h3>
            <div class="text-sm text-gray-600">
              <p>ISO Code: {{ result.iso3CountryCode }}</p>
              <p>Ähnlichkeit: {{ (result.score * 100).toFixed(2) }}%</p>
              <p v-if="result.warning" class="text-red-500">
                Warnung vorhanden!
              </p>
              <p class="font-semibold">Content</p>
              <p class="h-12 overflow-auto">{{ result.content }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
UButton:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}
</style>