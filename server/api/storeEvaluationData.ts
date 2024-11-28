import { defineEventHandler } from 'h3';
import { processAndStoreDataForEvaluation } from '../../utils/pineconeHandler.ts';

// API-Handler zum Verarbeiten und Speichern von Länderdaten für Evaluationszwecke
export default defineEventHandler(async (event) => {
  try {
    console.log('Starte den Evaluationsprozess der Chunking-Strategien...');
    await processAndStoreDataForEvaluation();
    return { status: 'success', message: 'Der Evaluationsprozess wurde erfolgreich abgeschlossen.' };
  } catch (error) {
    console.error('Fehler beim Evaluationsprozess:', error);
    return { status: 'error', message: 'Fehler beim Evaluationsprozess. Weitere Details sind im Server-Log einsehbar.', error: error.message };
  }
});
