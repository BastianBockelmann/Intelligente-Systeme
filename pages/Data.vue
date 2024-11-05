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
      isSearching,
      iso3Code: '',
      content: '',
      weatherData: '',
      minRelevance: 50, // Standardwert für Relevanz
      topK: 10, // Standardwert für Anzahl der Ergebnisse
      travelQueryString: '', // Suchstring für Reiseinformationen
      travelData: '', // Ergebniss für Reiseinformationen
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

    // Pinecone Datenabfrage
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
    },

    // Laden des Contents für einen bestimmten ISO3-Code aus der Json
    async fetchContent() {
      if (!this.iso3Code.trim()) {
        message.value = 'Bitte geben Sie einen ISO3-Code ein';
        return;
      }

      try {
        const { data, error } = await useFetch(`/api/getCountryContent?iso3Code=${this.iso3Code}`);
        if (error.value) {
          throw new Error(error.value);
        }
        if (data.value && data.value.content) {
          this.content = data.value.content;
        } else {
          this.content = 'Kein Content für diesen ISO3-Code gefunden.';
        }
      } catch (err) {
        this.content = `Fehler beim Abrufen des Contents: ${err.message}`;
      }
    },

    // Laden der Wetterdaten für einen bestimmten ISO3-Code aus der csv
    async fetchWeatherData() {
      if (!this.iso3Code.trim()) {
        message.value = 'Bitte geben Sie einen ISO3-Code ein';
        return;
      }

      try {
        const { data, error } = await useFetch(`/api/getWeatherData?iso3Code=${this.iso3Code}`);
        if (error.value) {
          throw new Error(error.value);
        }
        if (data.value && data.value.weatherData) {
          this.weatherData = data.value.weatherData;
        } else {
          this.weatherData = 'Keine Wetterdaten für diesen ISO3-Code gefunden.';
        }
      } catch (err) {
        this.weatherData = `Fehler beim Abrufen der Wetterdaten: ${err.message}`;
      }
    },

    // Laden der Reiseinformationen für einen bestimmten Suchbegriff aus Pinecone mit definierter Relevanz und Anzahl der Ergebnisse
    async fetchTravelData() {
      if (!this.travelQueryString.trim()) {
        message.value = 'Bitte geben Sie einen Suchbegriff für Reiseinformationen ein';
        return;
      }

      try {
        const { data, error } = await useFetch('/api/queryRelevantData', {
          params: {
            minRelevance: this.minRelevance,
            topK: this.topK,
            queryString: this.travelQueryString,
          }
        });

        if (error.value) {
          throw new Error(error.value);
        }

        if (data.value.success && data.value.results.length > 0) {
          this.travelData = data.value.results;
        } else {
          this.travelData = data.value.message || 'Keine Reiseinformationen gefunden.';
        }
      } catch (err) {
        this.travelData = `Fehler bei der Abfrage der Reisedaten: ${err.message}`;
      }
    },

    // Laden der Reiseinformationen für einen bestimmten Suchbegriff aus Pinecone mit berücksichtigung der Länder und Anzahl der Ergebnisse
    async fetchUniqueCountriesTravelData() {
      if (!this.travelQueryString.trim()) {
        message.value = 'Bitte geben Sie einen Suchbegriff für Reiseinformationen ein';
        return;
      }

      try {
        const { data, error } = await useFetch('/api/queryUniqueCountriesData', {
          params: {
            minRelevance: this.minRelevance,
            topK: this.topK,
            queryString: this.travelQueryString,
          }
        });

        if (error.value) {
          throw new Error(error.value);
        }

        if (data.value.success && data.value.results.length > 0) {
          this.travelData = data.value.results;
        } else {
          this.travelData = data.value.message || 'Keine Reiseinformationen gefunden.';
        }
      } catch (err) {
        this.travelData = `Fehler bei der Abfrage der Reisedaten: ${err.message}`;
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


      <!-- Gesamten Content zu Iso3 Code abrufen -->
      <div class="content-fetcher">
        <h2 class="text-lg font-semibold">Länder-Content Abrufen</h2>
        <!-- Eingabefeld für den ISO3-Code -->
        <input v-model="iso3Code" type="text" placeholder="Geben Sie den ISO3-Code ein" />

        <!-- Button, um den Content abzurufen -->
        <UButton class="ml-3" @click="fetchContent">Content abrufen</UButton>

        <!-- Bereich zur Anzeige des Inhalts -->
        <div v-if="content" class="content-display">
          <h3>Daten Auswärtiges Amt für {{ iso3Code }}</h3>
          <p class="max-h-60 overflow-y-auto break-words p-2 border rounded">{{ content }}</p>
        </div>
      </div>


      <!-- Wetterdaten zu Iso3 Code abrufen -->
      <div class="weather-fetcher mt-4">
        <h2 class="text-lg font-semibold">Wetterdaten Abrufen</h2>
        <!-- Button, um die Wetterdaten abzurufen -->
        <UButton class="ml-3" @click="fetchWeatherData">Wetterdaten abrufen</UButton>

        <!-- Bereich zur Anzeige der Wetterdaten -->
        <div v-if="weatherData" class="weather-display mt-2">
          <h3>Wetterdaten für {{ iso3Code }}</h3>
          <p class="max-h-60 overflow-y-auto break-words p-2 border rounded">{{ weatherData }}</p>
        </div>
      </div>

      <!-- Reisedaten basierend auf Suchstring und Relevanz abrufen -->
      <div class="travel-data-fetcher mt-2">
        <h2 class="text-lg font-semibold">Reiseinformationen Abrufen</h2>
        <!-- Eingabefelder für die Abfrageparameter -->
        <input v-model="travelQueryString" type="text"
          placeholder="Geben Sie einen Suchbegriff für Reiseinformationen ein" />
        <input v-model.number="minRelevance" type="number" placeholder="Minimale Relevanz (%)" />
        <input v-model.number="topK" type="number" placeholder="Maximale Anzahl an Ergebnissen" />

        <!-- Button, um die Reiseinformationen abzurufen -->
        <UButton class="ml-3" @click="fetchTravelData">Reiseinformationen abrufen</UButton>
        <UButton class="ml-3" @click="fetchUniqueCountriesTravelData">Reiseinformationen für Länder statt Chunks abrufen</UButton>


        <!-- Bereich zur Anzeige der Reiseinformationen -->
        <div v-if="Array.isArray(travelData) && travelData.length > 0" class="travel-data-display mt-8 space-y-4">
          <h2 class="text-lg font-semibold">Reiseinformationen basierend auf der Abfrage</h2>
          <div v-for="(result, index) in travelData" :key="index" class="p-4 border rounded-lg">
            <h3 class="font-semibold">{{ result.countryName }}</h3>
            <p>ISO Code: {{ result.iso3CountryCode }}</p>
            <p>Ähnlichkeit: {{ (result.score * 100).toFixed(2) }}%</p>
            <p>Chunk: {{ result.chunkIndex }} von {{ result.totalChunks }} Chunks</p>
            <p v-if="result.warning" class="text-red-500">
              Warnung vorhanden!
            </p>
            <p class="font-semibold">Content</p>
            <p class="max-h-60 overflow-y-auto break-words p-2 border rounded">{{ result.content }}</p>
          </div>
        </div>
        <div v-else-if="typeof travelData === 'string'" class="mt-2">
          <p>{{ travelData }}</p>
        </div>
      </div>


      <!-- Pinecone Datenabfrage -->
      <div class="mt-8 space-y-4">
        <h2 class="text-lg font-semibold">Pinecone Datenabfrage</h2>

        <div class="flex space-x-2">
          <UInput v-model="searchQuery" placeholder="Geben Sie Ihren Suchbegriff ein..." class="flex-grow"
            @keyup.enter="searchPinecone" />
          <UButton @click="searchPinecone" :disabled="isSearching" class="w-24">
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
              <p>Chunk: {{ result.chunkIndex }} von {{ result.totalChunks }} Chunks</p>
              <p v-if="result.warning" class="text-red-500">
                Warnung vorhanden!
              </p>
              <p class="font-semibold">Content</p>
              <p class="max-h-60 overflow-y-auto break-words p-2 border rounded">{{ result.content }}</p>
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