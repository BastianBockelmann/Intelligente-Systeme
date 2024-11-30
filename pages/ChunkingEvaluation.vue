<template>
  <div>
    <div class="flex justify-center items-center px-2">
      <span class="w-full text-gray-700 dark:text-gray-100 text-center text-xl font-semibold py-3">
        Chunking Evaluation
      </span>
    </div>

    <!-- Button zum Hochladen der Evaluationsdaten in Pinecone und speichern im Json-Format -->
    <span class="w-full text-left mb-1 font-semibold">
        Evaluations Daten verarbeiten und speichern:
      </span>
    <div class="flex justify-left items-center mb-4 mt-2">
      <UButton @click="writeEvaluationPinecone" class="mr-2" size="lg" color="orange">
        Evaluationsdaten in VektorDB / Pinecone hochladen </UButton>
      <UButton @click="writeEvaluationJson" size="lg" color="blue">
        Evaluationsdaten in Json speichern </UButton>
    </div>


    <!-- Formular für die Chunking Evaluation -->
    <span class="w-full text-left mb-1 font-semibold">
        Chunking Evaluation - Abfrage und Parameter:
      </span>
    <div class="flex items-start">
      <label class="mr-1">DB Query:</label>
      <u-input v-model="query" class="mr-2 w-80" label="Frage an die Pinecone DB"
        placeholder="Geben Sie eine Frage ein..." />
      <label class="mr-1">Min. Relevanz:</label>
      <u-input v-model.number="minRelevance" class="mr-2" label="Minimale Relevanz" type="number" min="0" max="1"
        step="0.01" />
      <label class="mr-1">Max. Ergebnisse:</label>
      <u-input v-model.number="maxResults" label="Maximale Ergebnisse" type="number" min="1" />
    </div>

    <div class="checkbox-section">
      <u-checkbox v-model="selectedStrategies.fixedCharacters" label="Feste Zeichen" />
      <u-checkbox v-model="selectedStrategies.fixedTokens" label="Feste Tokens" />
      <u-checkbox v-model="selectedStrategies.contentAware" label="Content-aware (Inhaltsbasiert)" />
      <u-checkbox v-model="selectedStrategies.semantic" label="Semantisch" />
    </div>

    <u-button @click="sendQuery">Abfrage senden</u-button>


    <div class="results-section" v-if="results.length > 0">
      <div v-for="(result, index) in results" :key="index" class="p-4 border rounded-lg mt-4">
        <h2 class="font-semibold">{{ result.strategy }}</h2>
        <div v-for="(item, idx) in result.data" :key="idx" class="text-sm text-gray-600 dark:text-gray-300 mt-2">
          <p class="font-semibold">Ergebnis {{ idx + 1 }}</p>
          <p>ISO Code: {{ item.metadata.iso3CountryCode }}</p>
          <p>Ähnlichkeit: {{ (item.score * 100).toFixed(2) }}%</p>
          <p>Chunk: {{ item.metadata.chunkIndex }} von {{ item.metadata.totalChunks }} Chunks</p>
          <p v-if="item.metadata.warning" class="text-red-500">Warnung vorhanden!</p>
          <p class="font-semibold mt-2">Content</p>
          <p class="max-h-60 overflow-y-auto break-words p-2 border rounded">{{ item.metadata.content }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      query: '',
      minRelevance: 0.25,
      maxResults: 10,
      selectedStrategies: {
        fixedCharacters: false,
        fixedTokens: false,
        contentAware: false,
        semantic: false,
      },
      results: []
    };
  },
  methods: {
    async sendQuery() {
      // Liste der gewählten Strategien erstellen
      const strategiesToQuery = Object.keys(this.selectedStrategies).filter(
        (key) => this.selectedStrategies[key]
      );

      if (strategiesToQuery.length === 0) {
        alert('Bitte wählen Sie mindestens eine Chunking-Strategie aus.');
        return;
      }

      try {
        // Senden der Abfrage an die API
        const response = await fetch(`/api/queryDataForEvaluation?${new URLSearchParams({
          queryString: this.query,
          minRelevance: this.minRelevance,
          topK: this.maxResults,
          strategies: strategiesToQuery.map(strategy => {
            switch (strategy) {
              case 'fixedCharacters':
                return 'fixed-characters';
              case 'fixedTokens':
                return 'fixed-tokens';
              case 'contentAware':
                return 'content-aware';
              case 'semantic':
                return 'semantic';
              default:
                return strategy;
            }
          }).join(',')
        })}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        const data = await response.json();

        if (data.error) {
          alert(data.error);
        } else {
          this.results = data;
        }
      } catch (error) {
        console.error('Fehler bei der Abfrage:', error);
        alert('Fehler bei der Abfrage. Weitere Details finden Sie in der Konsole.');
      }
    },

    async writeEvaluationPinecone() {
      console.log('Evaluationsdaten fürs Chunking werden in Pinecone Daten hochgeladen -  Button wurde geklickt!');
      try {
        const { data, error } = await useFetch('/api/storeEvaluationData');
        if (error.value) {
          throw new Error(error.value);
        }
        message.value = data.value.message;
      } catch (err) {
        message.value = `Error: ${err.message}`;
      }
    },

    async writeEvaluationJson() {
      console.log('Evaluationsdaten fürs Chunking werden in Json gespeichert -  Button wurde geklickt!');
      try {
        const { data, error } = await useFetch('/api/storeEvaulationDataAsJson');
        if (error.value) {
          throw new Error(error.value);
        }
        message.value = data.value.message;
      } catch (err) {
        message.value = `Error: ${err.message}`;
      }
    },

  },
};
</script>

<style scoped>
.results-section {
  margin-top: 25px;
}
.result {
  border: 2px solid #ddd;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 10px;
}
.checkbox-section {
  margin-top: 20px;
  margin-bottom: 20px;
  display: flex;
  gap: 15px;
}
</style>
