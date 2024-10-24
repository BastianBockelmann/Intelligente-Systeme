import { defineEventHandler } from 'h3';

// Importiere hier die Funktion processAndStoreData
import { processAndStoreData } from '../../utils/pineconeHandler.ts';

export default defineEventHandler(async (event) => {
  try {
    await processAndStoreData();
    return { message: 'Data stored successfully in Pinecone.' };
  } catch (error) {
    console.error('Error storing data in Pinecone:', error);
    return { message: 'Error storing data', error };
  }
});
