import { defineEventHandler, getQuery } from 'h3';
import { queryDataForEvaluation } from '../../utils/pineconeHandler.ts';

export default defineEventHandler(async (event) => {
  const { minRelevance, topK, queryString, strategies } = getQuery(event);

  if (!minRelevance || !queryString || !strategies) {
    return { error: 'Ungültige Anfrage. Bitte geben Sie eine Mindest-Relevanz, einen Suchstring und mindestens eine Strategie an.' };
  }

  try {
    const relevance = parseFloat(minRelevance as string);
    const topKResults = topK ? parseInt(topK as string, 10) : 10;
    const selectedStrategies = strategies.split(',');

    let results = [];

    for (const strategy of selectedStrategies) {
      const indexName = `traveldata-${strategy}`;
      console.log(`Abfrage des Index: ${indexName}`);
      const strategyResults = await queryDataForEvaluation(indexName, queryString as string, relevance, topKResults);
      results.push({ strategy, data: strategyResults });
    }

    return results;
  } catch (error) {
    console.error('Fehler bei der Abfrage der Evaluationsdaten:', error);
    return { error: `Fehler bei der Abfrage der Evaluationsdaten: ${error}` };
  }
});
