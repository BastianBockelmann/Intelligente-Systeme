import { USE_RECOMMENDATIONSTORE } from '~/stores/recommendation';


export default defineNuxtPlugin(async (nuxtApp) => {
    console.log('Lädt Plugin beim starten der Anwendnung')
    // Get access to the Pinia store
    const recommendationStore = USE_RECOMMENDATIONSTORE();

    // Load the recommendations when the application starts
    if (!recommendationStore.loaded) {
        await recommendationStore.loadRecommendations();
    }

    loadcontent()
});