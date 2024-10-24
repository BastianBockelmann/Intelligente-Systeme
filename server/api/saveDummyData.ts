// import { defineEventHandler } from 'h3';
// import { PineconeClient } from '@pinecone-database/pinecone';

// // Initialisiere die Pinecone-Instanz
// const pinecone = new PineconeClient();

// async function initPinecone() {
//   await pinecone.init({
//     environment: process.env.PINECONE_ENV, // Stelle sicher, dass die Umgebungsvariablen gesetzt sind
//     apiKey: process.env.PINECONE_API_KEY,
//   });
// }

// // Funktion, um die Vektor-Datenbank zu erstellen oder zu überprüfen
// async function createOrVerifyIndex(indexName: string) {
//   const existingIndexes = await pinecone.listIndexes();
//   if (!existingIndexes.includes(indexName)) {
//     await pinecone.createIndex({
//       name: indexName,
//       dimension: 3, // Dimension für die Dummy-Daten
//     });
//     console.log(`Index "${indexName}" erstellt.`);
//   } else {
//     console.log(`Index "${indexName}" existiert bereits.`);
//   }
// }

// // Hauptfunktion, um Dummy-Daten zu speichern
// export default defineEventHandler(async () => {
//   try {
//     await initPinecone();
//     await createOrVerifyIndex('dummy-countries');

//     // Dummydaten
//     const dummyData = [
//       { id: '1', countryName: 'Deutschland', countryCode: 'DE', restriction: 'Einreise nur mit negativem Test' },
//       { id: '2', countryName: 'Frankreich', countryCode: 'FR', restriction: 'Einreise nur für Geimpfte' },
//       { id: '3', countryName: 'Spanien', countryCode: 'ES', restriction: 'Einreise nur mit Quarantäne' },
//     ];

//     // Daten in Pinecone einfügen
//     const vectors = dummyData.map((item) => ({
//       id: item.id,
//       values: [1, 1, 1], // Beispielwerte, die Vektoren darstellen; für echte Daten müssen geeignete Vektoren verwendet werden
//       metadata: {
//         countryName: item.countryName,
//         countryCode: item.countryCode,
//         restriction: item.restriction,
//       },
//     }));

//     const index = pinecone.Index('dummy-countries');
//     await index.upsert({ vectors });

//     return { success: true, message: 'Dummydaten erfolgreich gespeichert.' };
//   } catch (error) {
//     console.error('Fehler beim Speichern der Dummydaten:', error);
//     return { success: false, message: 'Fehler beim Speichern der Dummydaten.' };
//   }
// });
