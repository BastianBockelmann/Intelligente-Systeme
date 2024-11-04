import { queryPineconeData } from '../../utils/pineconeHandler.ts';


export default defineEventHandler(async (event) => {
  try {
    const body = await readBody(event);
    const { queryText, topK, filterOptions } = body;

    if (!queryText) {
      throw new Error('Suchtext ist erforderlich');
    }

    const results = await queryPineconeData(
      queryText,
      topK || 5,
      filterOptions
    );

    return results;
  } catch (error) {
    throw createError({
      statusCode: 500,
      statusMessage: `Fehler bei der Pinecone-Abfrage: ${error.message}`
    });
  }
});