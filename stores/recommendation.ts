import type { recommendations } from "~/types/typebib.ts";

export const USE_RECOMMENDATIONSTORE = defineStore("itemStore", {
  // State: Define the state of your store
  state: () => ({
    loaded: false,
    recommendations: [] as string[],
    allrecommendations: [] as recommendations[]
  }),

  // Getters: Define computed properties for the store
  getters: {},

  // Actions: Define methods to modify the state
  actions: {
    loadAllData() {
      if (!this.loaded) {
        this.loadRecommendations()
      }
    },
    async loadRecommendations() {
      try {
        const response = await fetch(
          "https://www.auswaertiges-amt.de/opendata/travelwarning/"
        );

        // Ensure the response is in JSON format
        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        // Assign the data to recommendations after fetching and parsing
        this.recommendations = Object.keys(data.response);
      } catch (error) {
        console.error('Error loading recommendations:', error);
      }
    },
    async loadContentFromAPI(ids: string[]) {
      try {
        // Erstelle ein Array von Promises, um die API-Anfragen parallel durchzuführen
        const promises = ids.map(async (id) => {
          const apiString = `https://www.auswaertiges-amt.de/opendata/travelwarning/${id}`;
          const response = await fetch(apiString);
    
          // Stelle sicher, dass die Antwort erfolgreich ist
          if (!response.ok) {
            throw new Error(`Failed to fetch for ID ${id}: ${response.status} ${response.statusText}`);
          }
    
          const data = await response.json();
    
          // Gib die Daten für diese spezifische ID zurück
          return data;
        });
    
        // Warte, bis alle Promises aufgelöst sind (alle Anfragen beendet)
        const results = await Promise.all(promises);
    
        // Nutze flatMap, um die Werte direkt in die Liste zu pushen
        this.allrecommendations.push(
          ...results.flatMap(data => Object.values(data))
        );
      } catch (error) {
        console.error('Error loading recommendations:', error);
      }
    }
    
  },
});
