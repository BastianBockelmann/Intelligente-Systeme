// Funktionen zum Umgang mit Pinecone

// Benötigt wird:
// 1. Prüfen und initialisieren des Pinecone-Index
// 2. Speichern von Vektoren(Daten) in Pinecone
// 3. Aktualisieren von Vektoren in Pinecone
// 4. Abfrage von Daten aus Pinecone
// 5. optional: Löschen von Daten in Pinecone

// Importieren der benötigten Bibliotheken
import * as fs from 'fs';
import { join } from 'path';
import { encode, decode } from 'gpt-3-encoder';
import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

// Initialisieren der OpenAI API mit dem API-Key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,  // Laden des API-Keys aus Umgebungsvariablen
});

// Konfiguration der Pinecone API und des Index-Namens
const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,  // Pinecone API-Key aus Umgebungsvariablen laden
});
const indexName = 'traveldata';  // Name des Index, der in Pinecone verwendet wird

// Funktion zum Einlesen einer JSON-Datei und Parsen in ein JavaScript-Objekt
function readJsonFile(filename: string) {
  const filePath = join(process.cwd(), 'data', filename);  // Erstellen des Dateipfads
  const data = fs.readFileSync(filePath, 'utf-8');  // Lesen der Datei als UTF-8-String
  return JSON.parse(data);  // Parsen des JSON-Strings und Rückgabe des Objekts
}

// Einlesen der Länderinformationen aus der JSON-Datei
const countriesData = readJsonFile('apiresponse_auswaertiges_amt_by_Iso3CountryCode.json');

// Funktion zum Erstellen eines Embeddings für einen gegebenen Text
async function getEmbedding(text: string) {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',  // Modell für die Embedding-Erstellung
    input: text,  // Eingabetext
  });
  return response.data[0].embedding;  // Rückgabe des generierten Embeddings
}

// Funktion zum Aufteilen von Text in Chunks (Abschnitte), um Token-Limits einzuhalten
function splitTextIntoChunks(text: string, maxTokens: number, overlap: number, countryName: string) {
  const tokens = encode(text);  // Tokenisierung des gesamten Textes
  let chunks = [];
  let start = 0;

  while (start < tokens.length) {
    const end = Math.min(start + maxTokens, tokens.length);  // Berechnen des Endes jedes Chunks
    const chunkTokens = tokens.slice(start, end);  // Erstellen des Token-Chunks
    const chunkText = `${countryName}: ${decode(chunkTokens)}`;  // Dekodieren der Tokens in den ursprünglichen Text und Hinzufügen des Ländernamens

    chunks.push({
      text: chunkText,  // Speichern des Text-Chunks
      tokens: chunkTokens  // Speichern der Tokeninformationen
    });

    start += maxTokens - overlap;  // Aktualisieren des Startindex für den nächsten Chunk mit Überlappung
  }

  return chunks;
}


// Funktion zum Prüfen und ggf. Initialisieren des Pinecone-Indexes
async function checkAndInitIndex() {
  try {
    const response = await pinecone.listIndexes();  // Abrufen aller existierenden Pinecone-Indexes
    const existingIndexes = response.names || [];  // Extrahieren der Indexnamen

    // Prüfen, ob der gewünschte Index bereits existiert
    if (!existingIndexes.includes(indexName)) {
      // Erstellen des Index mit der gewünschten Dimension (3072)
      await pinecone.createIndex({
        name: indexName,
        dimension: 3072,
        metric: 'cosine',
        spec: {
          serverless: {
            cloud: "aws",
            region: "us-east-1"  // oder eine andere unterstützte Region
          }
        }
      });
      return 'Index wurde erfolgreich erstellt.';  // Rückmeldung, wenn der Index neu erstellt wurde
    } else {
      return 'Index existiert bereits.';  // Rückmeldung, wenn der Index bereits vorhanden ist
    }
  } catch (error) {
    console.error(`Fehler bei der Index-Prüfung: ${error}`);
    return 'Fehler bei der Index-Prüfung oder Erstellung.';  // Rückmeldung bei Fehlern
  }
}

// Funktion zum Verarbeiten und Speichern der Länderdaten in Pinecone
export async function processAndStoreData() {

  // prüfen und initialisieren des Pinecone-Indexes
  const indexInitMessage = await checkAndInitIndex();
  console.log(indexInitMessage);  // Log-Eintrag zur Index-Initialisierung

  const countries = Object.entries(countriesData);  // Umwandlung in Array von [key, value] Paaren
  const totalCountries = countries.length;  // Gesamtanzahl der Länder bestimmen

  for (let countryIndex = 0; countryIndex < totalCountries; countryIndex++) {
    const [iso3Code, countryData] = countries[countryIndex];
    console.log(`Verarbeite Land ${countryIndex + 1} von ${totalCountries}: ${iso3Code}`);  // Fortschritt anzeigen

    // Typ-Sicherstellung und Extraktion der benötigten Daten
    const country = countryData as {
      countryName: string;
      iso3CountryCode: string;
      content: string;
      warning: boolean;
      // ggf. weitere Felder hinzufügen
    };
    
    // Zusammenführen der relevanten Textdaten
    const countryText = `${country.countryName}: ${country.content}`;
    const maxTokens = 5000;
    const overlap = 1000;
    const countryChunks = splitTextIntoChunks(countryText, maxTokens, overlap, country.countryName);
    const totalChunks = countryChunks.length;

    // Verarbeitung der Chunks
    for (let i = 0; i < countryChunks.length; i++) {
      try {
        const chunk = countryChunks[i];
        const embedding = await getEmbedding(chunk.text);  // Erstellen des Embeddings für den Chunk

        // Speichern in Pinecone mit korrekter ID und Metadaten; nur der Text des Chunks wird als Content gespeichert
        await pinecone.Index(indexName).upsert([
          {
            id: `${iso3Code}_chunk_${i}`, // Verwendung des ISO3-Codes aus der Schlüsselstruktur
            values: embedding,
            metadata: {
              countryName: country.countryName,
              iso3CountryCode: iso3Code, // Verwendung des ISO3-Codes aus der Schlüsselstruktur
              warning: country.warning,
              content: chunk.text,  // Speichern nur des jeweiligen Chunks
              chunkIndex: i,
              totalChunks: totalChunks,
            },
          },
        ]);

        console.log(`Stored chunk ${i} for country ${country.countryName} (${iso3Code})`);
      } catch (error) {
        console.error(`Error processing chunk ${i} for country ${iso3Code}: ${error}`);
      }
    }
  }
}

// Funktion zum Abfragen von Daten aus Pinecone
export async function queryPineconeData(
  queryText: string,
  topK: number = 5,
  filterOptions?: {
    countryName?: string;
    iso3CountryCode?: string;
    warning?: boolean;
  }
) {
  try {
    // Embedding für den Suchtext erstellen
    const queryEmbedding = await getEmbedding(queryText);

    // Filter-Objekt basierend auf den übergebenen Optionen erstellen
    const filter: Record<string, any> = {};
    if (filterOptions) {
      if (filterOptions.countryName) {
        filter.countryName = filterOptions.countryName;
      }
      if (filterOptions.iso3CountryCode) {
        filter.iso3CountryCode = filterOptions.iso3CountryCode;
      }
      if (filterOptions.warning !== undefined) {
        filter.warning = filterOptions.warning;
      }
    }

    // Abfrage an Pinecone senden
    const queryResponse = await pinecone.Index(indexName).query({
      vector: queryEmbedding,
      topK: topK,
      includeMetadata: true,
      filter: Object.keys(filter).length > 0 ? filter : undefined
    });

    // Ergebnisse aufbereiten
    const results = queryResponse.matches.map(match => ({
      score: match.score,
      countryName: match.metadata?.countryName,
      iso3CountryCode: match.metadata?.iso3CountryCode,
      warning: match.metadata?.warning,
      content: match.metadata?.content,
      chunkIndex: match.metadata?.chunkIndex,
      totalChunks: match.metadata?.totalChunks,
      id: match.id
    }));

    return {
      success: true,
      results,
      totalResults: results.length
    };

  } catch (error) {
    console.error('Fehler bei der Pinecone-Abfrage:', error);
    return {
      success: false,
      error: `Fehler bei der Datenbankabfrage: ${error}`,
      results: [],
      totalResults: 0
    };
  }
}

// Funktion zum Abrufen des gesamten Contents eines Landes aus der JSON-Datei anhand des ISO3-Codes
export function getFullContentFromJson(iso3Code: string): string | null {
  const countryData = countriesData[iso3Code];  // Suche den Eintrag basierend auf dem iso3Code
  if (countryData && countryData.content) {
    return countryData.content;  // Rückgabe des gesamten Contents des Eintrags
  } else {
    console.error(`Kein Content für ISO3-Code ${iso3Code} gefunden.`);
    return null;  // Rückgabe null, wenn kein Eintrag oder Content vorhanden ist
  }
}