import type { recommendations } from "~/types/typebib.ts";

export const USE_RECOMMENDATIONSTORE = defineStore("itemStore", {
  // State: Define the state of your store
  state: () => ({
    loaded: false,
    recommendations: [] as recommendations[],
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
          const resp = await fetch(
            "https://www.auswaertiges-amt.de/opendata/travelwarning/"
          );
      
          // Ensure the response is in JSON format
          if (!resp.ok) {
            throw new Error(`Failed to fetch: ${resp.status} ${resp.statusText}`);
          }
      
          const data = await resp.json();
      
          // Assign the data to recommendations after fetching and parsing
          this.recommendations = data;
        } catch (error) {
          console.error('Error loading recommendations:', error);
        }
      },
      
  },
});
