import { processAndStoreDataInJsonForEvaluation } from '../../utils/pineconeHandler.ts';

export default defineEventHandler(async (event) => {
  try {
    console.log('API-Aufruf zum Starten der Evaluationsverarbeitung erhalten');
    await processAndStoreDataInJsonForEvaluation();
    return { message: 'Datenverarbeitung und Speicherung in JSON abgeschlossen.' };
  } catch (error) {
    console.error('Fehler bei der Verarbeitung:', error);
    return { error: 'Fehler bei der Verarbeitung der Länderdaten.' };
  }
});