import { defineEventHandler, getQuery } from 'h3';
import { queryUniqueCountriesTravelData } from '../../utils/pineconeHandler.ts';

export default defineEventHandler(async (event) => {
  const { minRelevance, topK, queryString } = getQuery(event);

  if (!minRelevance || !queryString) {
    return { error: 'Ungültige Anfrage. Bitte geben Sie sowohl eine Mindest-Relevanz als auch einen Suchstring an.' };
  }

  try {
    const relevance = parseFloat(minRelevance as string);
    const topKResults = topK ? parseInt(topK as string, 10) : 10;
    const response = await queryUniqueCountriesTravelData(relevance, topKResults, queryString as string);
    return response;
  } catch (error) {
    return { error: `Fehler bei der Abfrage der Reisedaten: ${error}` };
  }
});