<script lang="ts">
import { defineComponent } from 'vue';

const columns = [{
  key: 'id',
  label: 'ID'
}, {
  key: 'country',
  label: 'Land',
  sortable: true
}, {
  key: 'code',
  label: 'Ländercode',
  sortable: true
}, {
  key: 'restriction',
  label: 'Beschränkung',
  sortable: false,
}]

const countries = []

const countries_dummy = [{
  id: 1,
  country: 'Deutschland',
  code: 'DE',
  restriction: 'Einreise nur mit negativem Test'
}, {
  id: 2,
  country: 'Frankreich',
  code: 'FR',
  restriction: 'Einreise nur für Geimpfte'
}, {
  id: 3,
  country: 'Spanien',
  code: 'ES',
  restriction: 'Einreise nur mit Quarantäne'
}]

export default defineComponent({
  data() {
    return {
      columns,
      countries_dummy
    };
  },
  methods: {
    async updateAuswaertigesAmt() {
      // Füge hier die Logik hinzu, um die API des Auswärtigen Amtes zu aktualisieren
      console.log("Test: API Auswärtiges Amt aktualisieren");
    },
    async updateWikipedia() {
      // Füge hier die Logik hinzu, um Wikipedia-Daten zu aktualisieren
      console.log("Test: Wikipedia Daten aktualisieren");
    },
  },
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
      <UButton @click="updateAuswaertigesAmt" size="lg">
        API Auswärtiges Amt aktualisieren
      </UButton>
      <UButton @click="updateWikipedia" size="lg">
        Wikipedia Daten aktualisieren
      </UButton>
    </div>

    <div ref="chatContainer" class="h-full text-gray-800 flex flex-col space-y-4 overflow-y-auto p-4 relative">
      <!-- Übersicht Länder -->
      <UTable :columns="columns" :rows="countries_dummy" />
    </div>

  </div>
</template>