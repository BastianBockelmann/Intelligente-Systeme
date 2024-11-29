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
                    <li v-for="(item, idx) in result.data" :key="idx">{{ item }}</li>
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
                this.results = [];
                for (const strategy of strategiesToQuery) {
                    // Senden der Abfrage an die API (je nach Strategie)
                    const response = await fetch(`/api/chunking/query`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            strategy,
                            query: this.query,
                            minRelevance: this.minRelevance,
                            maxResults: this.maxResults,
                        }),
                    });
                    const data = await response.json();

                    // Ergebnisse der gewählten Strategien speichern
                    this.results.push({ strategy: this.getStrategyName(strategy), data: data.results });
                }
            } catch (error) {
                console.error('Fehler bei der Abfrage:', error);
                alert('Fehler bei der Abfrage. Weitere Details finden Sie in der Konsole.');
            }
        },
        getStrategyName(strategyKey) {
            switch (strategyKey) {
                case 'fixedCharacters':
                    return 'Feste Zeichen';
                case 'fixedTokens':
                    return 'Feste Tokens';
                case 'contentAware':
                    return 'Content-aware';
                case 'semantic':
                    return 'Semantisch';
                default:
                    return 'Unbekannte Strategie';
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