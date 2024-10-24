// Funktionen zum Umgang mit Pinecone

// Benötigt wird:
// 1. Prüfen und initialisieren des Pinecone-Index
// 2. Speichern von Vektoren(Daten) in Pinecone
// 3. Aktualisieren von Vektoren in Pinecone
// 4. Abfrage von Daten aus Pinecone
// 5. optional: Löschen von Daten in Pinecone


// 1. Prüfen und initialisieren des Pinecone-Index




// 2. Speichern von Vektoren in Pinecone
// Json einlesen
import * as fs from 'fs';
import { join } from 'path';

function readJsonFile(filename: string) {
  const filePath = join(process.cwd(), 'data', filename);
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);  // Parsen der JSON-Daten
}

const countriesData = readJsonFile('apiresponse_auswaertiges_amt_all_countries.json');

// Umwandlung der Länderdaten in Vektoren mit OpenAI Embedding-Mdell

import OpenAI from 'openai';

// OpenAI API konfigurieren
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,  // Deinen API-Key aus der Umgebung laden
});

// Funktion, die Text in Vektoren umwandelt
async function getEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',  // Oder 'text-embedding-3-large'
    input: text,
  });
  
  return response.data[0].embedding;
}

// Verbinden mit Pinecone
import { Pinecone } from '@pinecone-database/pinecone';

// Pinecone API konfigurieren
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,  // Dein Pinecone API-Key, den du über Umgebungsvariablen sicherst
  });
// Index initialisieren
const index = pinecone.Index('traveldata');  // Dein Index in Pinecone

// Vektoren speichern
export async function processAndStoreData() {
    const countryKeys = Object.keys(countriesData);
  
    for (let key of countryKeys) {
      const country = countriesData[key];
      
      // Den Textinhalt, z.B. den Reisehinweis, extrahieren
      const countryText = `${country.title}. ${country.content}`;
      
      try {
        // Erstelle den Vektor für das Land
        const embedding = await getEmbedding(countryText);
        
        // Speichern des Vektors in Pinecone
        // Speichern des Vektors in Pinecone
      await index.upsert([ // Hier wird ein Array übergeben
        {
          id: country.countryCode, // Verwende den Ländercode als eindeutigen Key
          values: embedding, // Der Vektor vom OpenAI-Modell
          metadata: {
            countryName: country.countryName,
            iso3CountryCode: country.iso3CountryCode,
            warning: country.warning
          },
        },
      ]);
        
        console.log(`Stored vector for country: ${country.countryName}`);
        
      } catch (error) {
        console.error(`Error processing country ${country.countryName}: ${error}`);
      }
    }
  }
  

