<template>
    <div>
        <div class="flex justify-center items-center px-2">
            <span class="w-full text-gray-700 dark:text-gray-100 text-center text-xl font-semibold py-3">
                Chunking Evaluation
            </span>
        </div>

        <div class="flex items-start mb-2">
            <label class="mr-1">DB Query:</label>
            <u-input v-model="query" class="mr-2 w-80" label="Frage an die Pinecone DB" placeholder="Geben Sie eine Frage ein..."/>
            <label class="mr-1">Min. Relevanz:</label>
            <u-input v-model.number="minRelevance" class="mr-2" label="Minimale Relevanz" type="number" min="0" max="1" step="0.01" />
            <label class="mr-1">Max. Ergebnisse:</label>
            <u-input v-model.number="maxResults" label="Maximale Ergebnisse" type="number" min="1" />
        </div>

        <u-button @click="sendQuery">Abfrage senden</u-button>

        <div class="checkbox-section">
            <u-checkbox v-model="selectedStrategies.fixedCharacters" label="Feste Zeichen" />
            <u-checkbox v-model="selectedStrategies.fixedTokens" label="Feste Tokens" />
            <u-checkbox v-model="selectedStrategies.contentAware" label="Content-aware (Inhaltsbasiert)" />
            <u-checkbox v-model="selectedStrategies.semantic" label="Semantisch" />
        </div>

        <div class="results-section" v-if="results.length > 0">
            <div v-for="(result, index) in results" :key="index" class="result">
                <h3>{{ result.strategy }}</h3>
                <ul>
                    <li v-for="(item, idx) in result.data" :key="idx">{{ item.metadata.content }}</li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script>
export default {
  data() {
    return {
      query: '',
      minRelevance: 0.5,
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
  },
};
</script>

<style scoped>
.checkbox-section {
  margin-top: 20px;
  margin-bottom: 20px;
  display: flex;
  gap: 15px;
}
.results-section {
  margin-top: 30px;
}
.result {
  margin-bottom: 20px;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  background-color: #f9f9f9;
}
</style>
