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

// Methode 1: Feste Chunkgröße (in Zeichen)
function fixedSizeChunkingByCharacters(text: string, chunkSize: number, overlap: number = 0) {
  let chunks = [];
  for (let i = 0; i < text.length; i += (chunkSize - overlap)) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

// Methode 2: Feste Chunkgröße (in Tokens)
function fixedSizeChunkingByTokens(text: string, chunkSize: number, overlap: number = 0) {
  const tokens = encode(text);
  let chunks = [];
  for (let i = 0; i < tokens.length; i += (chunkSize - overlap)) {
    const chunkTokens = tokens.slice(i, i + chunkSize);
    chunks.push(decode(chunkTokens));
  }
  return chunks;
}

// Methode 3: Inhaltsbasiertes Chunking/Content-aware Chunking
function contentAwareChunking(text: string, maxTokens: number) {
  const delimiters = [
    '\n\n',  // Absatztrennung
    '\n',    // Zeilenumbrüche
    '. ',     // Satzende
    ', ',     // Komma
    ' ',      // Leerzeichen
  ];
  let chunks = [];
  let remainingText = text;

  while (encode(remainingText).length > maxTokens) {
    let chunk = '';
    for (const delimiter of delimiters) {
      const parts = remainingText.split(delimiter);
      let tempChunk = parts[0];
      for (let i = 1; i < parts.length; i++) {
        if (encode(tempChunk + delimiter + parts[i]).length > maxTokens) {
          break;
        }
        tempChunk += delimiter + parts[i];
      }
      if (encode(tempChunk).length <= maxTokens) {
        chunk = tempChunk;
        break;
      }
    }
    if (!chunk) {
      chunk = decode(encode(remainingText).slice(0, maxTokens));
    }
    chunks.push(chunk);
    remainingText = remainingText.slice(chunk.length).trim();
  }
  if (remainingText) {
    chunks.push(remainingText);
  }
  return chunks;
}

// Methode 4: Semantisches Chunking mit einem Modell basierend auf semantischer Ähnlichkeit
async function semanticChunking(text: string, maxTokens: number) {
  let chunks = [];
  let currentChunk = '';
  let sentences = text.split(/(?<=[.!?])\s+/);  // Aufteilen des Textes in Sätze basierend auf Satzzeichen

  for (const sentence of sentences) {
    const potentialChunk = currentChunk ? `${currentChunk} ${sentence}` : sentence;

    // Erstellen des Embeddings, um semantische Ähnlichkeit zu überprüfen
    const currentEmbedding = await getEmbedding(potentialChunk);
    const currentChunkEmbedding = currentChunk ? await getEmbedding(currentChunk) : null;

    if (currentChunkEmbedding && cosineSimilarity(currentEmbedding, currentChunkEmbedding) < 0.8) {
      // Falls die semantische Ähnlichkeit unter einem Schwellenwert liegt, neuen Chunk beginnen
      chunks.push(currentChunk);
      currentChunk = sentence;
    } else {
      // Andernfalls den Satz zum aktuellen Chunk hinzufügen
      currentChunk = potentialChunk;
    }

    if (encode(currentChunk).length > maxTokens) {
      chunks.push(currentChunk);
      currentChunk = '';
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

// Funktion zur Berechnung der Kosinusähnlichkeit zwischen zwei Vektoren
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((acc, val, idx) => acc + val * vecB[idx], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((acc, val) => acc + val * val, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((acc, val) => acc + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
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
async function checkAndInitIndex(indexName: string) {
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
  const indexInitMessage = await checkAndInitIndex(indexName);
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

// Einlesen der Länderinformationen aus der JSON-Datei für die Evaluation
const countriesDataEvaluation = readJsonFile('20_evaluation_auswaertiges_amt_by_Iso3CountryCode.json');

// Funktion zum Verarbeiten und Speichern der Länderdaten in Pinecone für Evaluationszwecke
export async function processAndStoreDataForEvaluation() {
  const chunkingMethods = [
    { name: 'fixed-characters', method: (text: string) => fixedSizeChunkingByCharacters(text, 2000) },
    { name: 'fixed-tokens', method: (text: string) => fixedSizeChunkingByTokens(text, 1000) },
    { name: 'content-aware', method: (text: string) => contentAwareChunking(text, 1000) },
    { name: 'semantic', method: async (text: string) => await semanticChunking(text, 1000) }
  ];

  for (const { name, method } of chunkingMethods) {
    const evalIndexName = `traveldata-${name}`;
    console.log(`Initialisiere Index: ${evalIndexName}`);
    const indexInitMessage = await checkAndInitIndex(evalIndexName);
    console.log(indexInitMessage);

    const countries = Object.entries(countriesDataEvaluation);  // Umwandlung in Array von [key, value] Paaren
    const totalCountries = countries.length;  // Gesamtanzahl der Länder bestimmen

    for (let countryIndex = 0; countryIndex < totalCountries; countryIndex++) {
      const [iso3Code, countryData] = countries[countryIndex];
      console.log(`Verarbeite Land ${countryIndex + 1} von ${totalCountries} mit Methode ${name}: ${iso3Code}`);

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
      const countryChunks = await method(countryText);
      const totalChunks = countryChunks.length;

      // Verarbeitung der Chunks
      for (let i = 0; i < countryChunks.length; i++) {
        try {
          const chunk = countryChunks[i];
          const embedding = await getEmbedding(chunk);  // Erstellen des Embeddings für den Chunk

          // Speichern in Pinecone mit korrekter ID und Metadaten; nur der Text des Chunks wird als Content gespeichert
          await pinecone.Index(evalIndexName).upsert([
            {
              id: `${iso3Code}_chunk_${i}`, // Verwendung des ISO3-Codes aus der Schlüsselstruktur
              values: embedding,
              metadata: {
                countryName: country.countryName,
                iso3CountryCode: iso3Code, // Verwendung des ISO3-Codes aus der Schlüsselstruktur
                warning: country.warning,
                content: chunk,  // Speichern nur des jeweiligen Chunks
                chunkIndex: i,
                totalChunks: totalChunks,
              },
            },
          ]);

          console.log(`Stored chunk ${i} for country ${country.countryName} (${iso3Code}) in index ${evalIndexName}`);
        } catch (error) {
          console.error(`Error processing chunk ${i} for country ${iso3Code} in index ${evalIndexName}: ${error}`);
        }
      }
    }

    // 60 Sekunden warten, bevor zur nächsten Methode gewechselt wird
    console.log(`Warte 60 Sekunden, bevor die nächste Chunking-Strategie angewendet wird.`);
    await new Promise(resolve => setTimeout(resolve, 60000));
  }
}







// Funktion zum Verarbeiten und Speichern der Länderdaten in JSON-Dateien für Evaluationszwecke
const countriesDataEvaluationJson6 = readJsonFile('6_evaluation_auswaertiges_amt_by_Iso3CountryCode.json');

export async function processAndStoreDataInJsonForEvaluation() {
  const chunkingMethods = [
    { name: 'fixed-characters', method: (text: string) => fixedSizeChunkingByCharacters(text, 2000) },
    { name: 'fixed-tokens', method: (text: string) => fixedSizeChunkingByTokens(text, 1000) },
    { name: 'content-aware', method: (text: string) => contentAwareChunking(text, 1000) },
    { name: 'semantic', method: async (text: string) => await semanticChunking(text, 1000) }
  ];

  for (const { name, method } of chunkingMethods) {
    try {
      console.log(`Starte Evaluation mit Methode: ${name}`);

      const countries = Object.entries(countriesDataEvaluationJson6);  // Umwandlung in Array von [key, value] Paaren
      const totalCountries = countries.length;  // Gesamtanzahl der Länder bestimmen

      let resultData: Record<string, any> = {};

      for (let countryIndex = 0; countryIndex < totalCountries; countryIndex++) {
        const [iso3Code, countryData] = countries[countryIndex];
        console.log(`Verarbeite Land ${countryIndex + 1} von ${totalCountries} mit Methode ${name}: ${iso3Code}`);

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
        const countryChunks = await method(countryText);
        const totalChunks = countryChunks.length;

        // Speichern der Chunks in der resultData-Struktur
        resultData[country.countryName] = {
          iso3CountryCode: country.iso3CountryCode,
          warning: country.warning,
          chunks: countryChunks.map((chunk, index) => ({
            chunkIndex: index,
            totalChunks: totalChunks,
            content: chunk,
          })),
        };
      }

      // Speichern der Ergebnisse in einer JSON-Datei
    const jsonFileName = `evaluation_chunks_${name}.json`;
    console.log(`CWD: ${process.cwd()}`);
    const filePath = join(process.cwd(), 'data', 'EvaluationJson', jsonFileName);
    fs.writeFileSync(filePath, JSON.stringify(resultData, null, 2), 'utf-8');
    console.log(`Ergebnisse für Methode ${name} wurden in ${jsonFileName} gespeichert.`);
    } catch (error) {
      console.error(`Fehler bei der Verarbeitung der Methode ${name}:`, error);
    }
  }
}









// Funktion zum Abfragen von Pinecone-Daten für Evaluationszwecke
export async function queryDataForEvaluation(indexName: string, queryString: string, minRelevance: number, topK: number) {
  try {
    console.log(`Querying index: ${indexName} with query: ${queryString}`);
    const queryEmbedding = await getEmbedding(queryString);  // Erstellen des Embeddings für die Abfrage
    const response = await pinecone.Index(indexName).query({
      vector: queryEmbedding,
      topK: topK,
      includeMetadata: true
    });

    console.log(`Found ${response.matches.length} results for query: ${queryString}`);
    
    // Filter-Logik nach der Abfrage anwenden, da Pinecone keinen direkten Relevanzfilter unterstützt
    const filteredResults = response.matches.filter(match => match.score !== undefined && match.score >= minRelevance);

    console.log(`Found ${filteredResults.length} results with relevance above ${minRelevance}%`);

    // Ergebnisse aufbereiten
    const results = filteredResults.map(match => ({
      score: match.score,
      countryName: match.metadata?.countryName,
      iso3CountryCode: match.metadata?.iso3CountryCode,
      warning: match.metadata?.warning,
      content: match.metadata?.content,
      chunkIndex: match.metadata?.chunkIndex,
      totalChunks: match.metadata?.totalChunks,
      id: match.id
    }));
    
    return filteredResults;
  } catch (error) {
    console.error(`Fehler bei der Abfrage von Pinecone für Index ${indexName}: ${error}`);
    throw new Error(`Fehler bei der Abfrage von Pinecone für Index ${indexName}`);
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
    console.error(`Kein Content für ISO3-Code "${iso3Code}" gefunden.`);
    return null;  // Rückgabe null, wenn kein Eintrag oder Content vorhanden ist
  }
}

// Funktion zum laden der Chunks mit einer Mindestrelevanz und optionaler Anzahl an maximalen zurückgegebenen Chunks auf Basis eines Suchstrings
export async function queryRelevantTravelData(
  minRelevance: number,
  topK: number = 10,
  queryString: string
) {
  try {
    const queryEmbedding = await getEmbedding(queryString);

    const queryResponse = await pinecone.Index(indexName).query({
      vector: queryEmbedding,
      topK: topK,
      includeMetadata: true,
    });

    if (queryResponse.matches.length === 0) {
      return {
        success: true,
        results: [],
        totalResults: 0,
        message: "Keine Einträge gefunden."
      };
    }

    // Filterung und Formatierung der Ergebnisse
    const results = queryResponse.matches
      .filter(match => match.score >= minRelevance / 100)
      .map(match => ({
        score: match.score,
        countryName: match.metadata?.countryName,
        iso3CountryCode: match.metadata?.iso3CountryCode,
        warning: match.metadata?.warning,
        content: match.metadata?.content,
        chunkIndex: match.metadata?.chunkIndex,
        totalChunks: match.metadata?.totalChunks,
        id: match.id
      }));

    if (results.length === 0) {
      return {
        success: true,
        results: [],
        totalResults: 0,
        message: `Keine relevanten Reiseinformationen mit einer Relevanz über ${minRelevance}% gefunden.`
      };
    }

    return {
      success: true,
      results,
      totalResults: results.length,
      message: null
    };
  } catch (error) {
    console.error('Fehler bei der Pinecone-Abfrage:', error);
    return {
      success: false,
      results: [],
      totalResults: 0,
      message: `Fehler bei der Abfrage der Reisedaten: ${error}`
    };
  }
}

// Funktion zum Laden der eindeutigen Länderdaten mit einer Mindestrelevanz und optionaler Anzahl an maximalen zurückgegebenen Ländern auf Basis eines Suchstrings
// Diese Funktion stellt sicher, dass nur eindeutige Länderdaten zurückgegeben werden, indem sie die Ergebnisse filtert und den gesamten Inhalt jedes Landes lädt
export async function queryUniqueCountriesTravelData(
  minRelevance: number,
  initialTopK: number = 10,
  queryString: string
) {
  try {
    const queryEmbedding = await getEmbedding(queryString);
    let uniqueResults: { [key: string]: any } = {};
    let topK = initialTopK;
    let allResults = [];

    // Schleife, um sicherzustellen, dass genügend unterschiedliche Länder enthalten sind
    while (Object.keys(uniqueResults).length < initialTopK) {
      const queryResponse = await pinecone.Index(indexName).query({
        vector: queryEmbedding,
        topK: topK,
        includeMetadata: true,
      });

      if (queryResponse.matches.length === 0) {
        return {
          success: true,
          results: [],
          totalResults: 0,
          message: "Keine Einträge gefunden.",
        };
      }

      // Ergebnisse filtern und nur die relevanten behalten
      allResults = queryResponse.matches
        .filter((match) => match.score >= minRelevance / 100)
        .map((match) => ({
          score: match.score,
          countryName: match.metadata?.countryName,
          iso3CountryCode: match.metadata?.iso3CountryCode,
          warning: match.metadata?.warning,
          chunkIndex: match.metadata?.chunkIndex,
          totalChunks: match.metadata?.totalChunks,
          id: match.id,
        }));

      // Unique-Länder extrahieren und gesamten Content laden
      uniqueResults = {};
      for (const result of allResults) {
        const iso3Code = result.iso3CountryCode;
        if (!uniqueResults[iso3Code]) {
          const fullContent = getFullContentFromJson(iso3Code); // Lade den gesamten Content des Landes
          if (fullContent) {
            uniqueResults[iso3Code] = {
              ...result,
              content: fullContent, // Speichere den gesamten Content
            };
          }
        }
        if (Object.keys(uniqueResults).length >= initialTopK) break;
      }

      if (Object.keys(uniqueResults).length < initialTopK) {
        topK += 1; // TopK erhöhen, wenn nicht genügend unterschiedliche Länder gefunden wurden
      }
    }

    // Rückgabe der eindeutigen Länderergebnisse
    return {
      success: true,
      results: Object.values(uniqueResults),
      totalResults: Object.keys(uniqueResults).length,
      message: null,
    };
  } catch (error) {
    console.error("Fehler bei der Pinecone-Abfrage:", error);
    return {
      success: false,
      results: [],
      totalResults: 0,
      message: `Fehler bei der Abfrage der Reisedaten: ${error}`,
    };
  }
}