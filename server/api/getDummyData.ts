// import { defineEventHandler } from 'h3';
// import { PineconeClient } from '@pinecone-database/pinecone';

// const pinecone = new PineconeClient();

// async function initPinecone() {
//   await pinecone.init({
//     environment: process.env.PINECONE_ENV,
//     apiKey: process.env.PINECONE_API_KEY,
//   });
// }

// // Funktion, um alle Dummydaten abzurufen
// export default defineEventHandler(async () => {
//   try {
//     await initPinecone();

//     const index = pinecone.Index('dummy-countries');
//     const queryResult = await index.query({
//       topK: 10,
//       includeMetadata: true,
//     });

//     const countries = queryResult.matches.map((match) => ({
//       id: match.id,
//       countryName: match.metadata?.countryName || 'Unbekannt',
//       countryCode: match.metadata?.countryCode || 'N/A',
//       restriction: match.metadata?.restriction || 'N/A',
//     }));

//     return { success: true, countries };
//   } catch (error) {
//     console.error('Fehler beim Abrufen der Dummy-Daten:', error);
//     return { success: false, message: 'Fehler beim Abrufen der Dummy-Daten.' };
//   }
// });
