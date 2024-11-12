// mainHandler.ts
import type { Message } from "ai";
import { LangChainStream } from "ai";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { PromptTemplate } from "@langchain/core/prompts";
import { Langfuse } from "langfuse";
import { encoding_for_model } from "tiktoken"; // Import tiktoken

// Memory Store für die Konversationen (alternativ könnte hier eine Datenbank verwendet werden)
const memoryStore = new Map<string, { messages: Message[], context?: string }>();
// Token counting function
function countTokens(text: string, model: string): number {
  const encoding = encoding_for_model(model);
  const tokens = encoding.encode(text);
  encoding.free();
  return tokens.length;
}

export default defineLazyEventHandler(() => {
  const config = useRuntimeConfig();

  const langfuse = new Langfuse({
    secretKey: config.langfuseSecretKey,
    publicKey: config.langfusePublicKey,
    baseUrl: "https://cloud.langfuse.com",
  });

  const apiKey = config.openaiApiKey;
  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: "OpenAI API key fehlt",
    });
  }

  // LLM ohne Streaming für die Klassifizierung und Kontextgenerierung
  const classificationLlm = new ChatOpenAI({
    openAIApiKey: String(apiKey),
    streaming: false, // Streaming deaktiviert für die Klassifizierung
  });

  // LLM mit Streaming für die Hauptantwort
  const llm = new ChatOpenAI({
    openAIApiKey: String(apiKey),
    streaming: true,
  });

  // Klassifizierung der Frage (Wetterabfrage, Auswärtiges Amt Daten, Beide)
  const themePrompt = new PromptTemplate({
    template: `
      Du bist ein Assistent, der Informationen und Hilfe zu Auslandsreisen und relevanten Vorgaben des Auswärtigen Amts in Deutschland bereitstellt.
      Deine Aufgabe ist es, präzise und hilfreiche Informationen zu liefern, die für jemanden, der ins Ausland reisen möchte, wichtig sind.
      Dazu gehören Reisehinweise, Sicherheitswarnungen und Empfehlungen des Auswärtigen Amts.

      Benutzerfrage: {userQuestion}

      Bitte klassifiziere die Nutzerfrage zu einer Wahl zwischen "Wetterabfrage", "Auswärtiges Amt Daten" oder "Beide"

      Antworte nur mit der Auswahl zwischen den drei Klassifizierungen, die gegeben sind!
    `,
    inputVariables: ["userQuestion"],
  });

  // Prompt zum Extrahieren des Landes und Erstellen eines Kontextsatzes
  const contextPrompt = new PromptTemplate({
    template: `
      Du bist ein Assistent, der Informationen und Hilfe zu Auslandsreisen und relevanten Vorgaben des Auswärtigen Amts in Deutschland bereitstellt.
      Deine Aufgabe ist es, präzise und hilfreiche Informationen zu liefern, die für jemanden, der ins Ausland reisen möchte, wichtig sind.
      Dazu gehören Reisehinweise, Sicherheitswarnungen und Empfehlungen des Auswärtigen Amts.
      Analysiere die folgende Benutzerfrage und finde heraus um welche Land es geht. Wenn es kein Land dazu gibt nutze Schlüsselwörter über die Themen.

      Benutzerfrage: {userQuestion}

      Klassifiziere die Nutzerfrage und ordne sie einem gefragten Themenbereich ein!
      Gebe nur den iso3CountryCode des Landes aus der Frage aus! Nicht das Land ausschreiben nur den ISO3CountryCode! Ein Wort nur!
    `,
    inputVariables: ["userQuestion"],
  });
  //Antworte nur mit maximal 3 Worten! Die Ausgabe darf nicht länger als drei Worte sein!


  // Prompt-Template für Auswärtiges Amt Daten
  const promptTemplateAuswaertigesAmt = new PromptTemplate({
    template: `
        Du hast folgende Daten zur Verfügung:

        Daten vom Auswärtigen Amt: {auswaertigesAmtData}

        Du bist ein Assistent, der Informationen und Hilfe zu Auslandsreisen und relevanten Vorgaben des Auswärtigen Amts in Deutschland bereitstellt.
        Deine Aufgabe ist es, präzise und hilfreiche Informationen zu liefern, die für jemanden, der ins Ausland reisen möchte, wichtig sind.
        Dazu gehören Reisehinweise, Sicherheitswarnungen und Empfehlungen des Auswärtigen Amts.

        Bitte beantworte die folgende Frage: {userQuestion}

        Gib eine detaillierte Antwort basierend auf den offiziellen Richtlinien und Informationen des Auswärtigen Amts. Beantworte die Frage nur, wenn du relevante Informationen findest. Wenn nicht, antworte mit 'Entschuldigen Sie, ich habe dazu keine genaue Antwort.'`,
    inputVariables: ["userQuestion", "auswaertigesAmtData"],
  });

  // Prompt-Template für Wetterdaten
  const promptTemplateWetter = new PromptTemplate({
    template: `
        Du hast folgende Daten zur Verfügung:

        Wetterdaten: {weatherData}

        Du bist ein Assistent, der Informationen und Hilfe zu Auslandsreisen bereitstellt, insbesondere in Bezug auf Wetterinformationen.

        Bitte beantworte die folgende Frage: {userQuestion}

        Gib eine detaillierte Antwort basierend auf den bereitgestellten Wetterdaten. Beantworte die Frage nur, wenn du relevante Informationen findest. Wenn nicht, antworte mit 'Entschuldigen Sie, ich habe dazu keine genaue Antwort.'`,
    inputVariables: ["userQuestion", "weatherData"],
  });

  // Prompt-Template für beide Daten
  const promptTemplateBeide = new PromptTemplate({
    template: `
        Du hast folgende Daten zur Verfügung:

        Daten vom Auswärtigen Amt: {auswaertigesAmtData}
        Wetterdaten: {weatherData}

        Du bist ein Assistent, der Informationen und Hilfe zu Auslandsreisen und relevanten Vorgaben des Auswärtigen Amts in Deutschland bereitstellt.
        Deine Aufgabe ist es, präzise und hilfreiche Informationen zu liefern, die für jemanden, der ins Ausland reisen möchte, wichtig sind.
        Dazu gehören Reisehinweise, Sicherheitswarnungen, Empfehlungen des Auswärtigen Amts, sowie aktuelle und vergangene Wetterinformationen.

        Bitte beantworte die folgende Frage: {userQuestion}

        Gib eine detaillierte Antwort basierend auf den offiziellen Richtlinien und Informationen des Auswärtigen Amts und den bereitgestellten Wetterdaten. Beantworte die Frage nur, wenn du relevante Informationen findest. Wenn nicht, antworte mit 'Entschuldigen Sie, ich habe dazu keine genaue Antwort.'`,
    inputVariables: ["userQuestion", "auswaertigesAmtData", "weatherData"],
  });

  return defineEventHandler(async (event) => {
    const { messages, sessionId } = await readBody<{ messages: Message[], sessionId: string }>(event);

    if (!messages || messages.length === 0 || !sessionId) {
      throw createError({
        statusCode: 400,
        statusMessage: "Fehlende Nachrichten oder Session-ID",
      });
    }

    // Nachrichten und Kontext aus dem Speicher abrufen oder initialisieren
    const previousSessionData = memoryStore.get(sessionId) || { messages: [], context: undefined };
    const currentMessages = [...previousSessionData.messages, ...messages];

    // Nutzerfrage extrahieren
    const userQuestion = messages[0].content;

    // Speicherung der Nachrichten im Memory aktualisieren
    previousSessionData.messages = currentMessages;
    memoryStore.set(sessionId, previousSessionData);

    // Verknüpfen des bisherigen Verlaufs mit der neuen Nachricht
    const chatHistory = currentMessages.map(msg => new HumanMessage(msg.content));

    const trace = langfuse.trace({
      name: "chat-api-call",
      userId: sessionId,
      metadata: {
        userQuestion,
      },
      tags: ["production"],
    });

    // 1. Klassifizierung der Nutzerfrage
    const themePromptFormatted = await themePrompt.format({
      userQuestion,
    });

    // Klassifizierung der Frage, um zu bestimmen, ob es um das Wetter, Reiseinformationen oder beides geht
    const classificationResponse = await classificationLlm.call([new HumanMessage(themePromptFormatted)]);
    const classification = classificationResponse.content.trim();
    console.log(`Response classification: "${classification}"`);


    // 2. Kontextsatz erstellen
    let contextSentence = "";
    if (classification !== "Wetterabfrage") {
      const contextPromptFormatted = await contextPrompt.format({
        userQuestion,
      });

      const contextResponse = await classificationLlm.call([new HumanMessage(contextPromptFormatted)]);
      contextSentence = contextResponse.content.trim();
      console.log(`Response contextSentence: "${contextSentence}"`);

      // Kontext speichern, falls ein Land erkannt wurde
      if (contextSentence) {
        previousSessionData.context = contextSentence;
        memoryStore.set(sessionId, previousSessionData);
      }
    }

    // Wenn kein Kontext in der aktuellen Nachricht gefunden wurde, den letzten bekannten Kontext verwenden
    if (!contextSentence && previousSessionData.context) {
      contextSentence = previousSessionData.context;
    }

    // Ausgabe des aktuellen ISO-Codes in der Konsole
    if (contextSentence) {
      console.log(`Verwendeter ISO Code: ${contextSentence}`);
    }

    // Daten und entsprechendes Prompt-Template basierend auf der Klassifizierung abrufen
    let auswaertigesAmtData = "";
    let weatherData = "";
    let prompt = "";

    if (classification === "Wetterabfrage" && contextSentence) {
      // Wetterdaten abrufen
      weatherData = await getWeatherData(contextSentence);

      // Prompt für Wetterdaten formatieren
      prompt = await promptTemplateWetter.format({
        userQuestion,
        weatherData,
      });
    } else if (classification === "Auswärtiges Amt Daten" && contextSentence) {
      auswaertigesAmtData = await fetchContent(contextSentence);

      // Prompt für Auswärtiges Amt Daten formatieren
      prompt = await promptTemplateAuswaertigesAmt.format({
        userQuestion,
        auswaertigesAmtData,
      });
    } else if (classification === "Beide" && contextSentence) {
      weatherData = await getWeatherData(contextSentence);
      auswaertigesAmtData = await fetchContent(contextSentence);

      // Prompt für beide Daten formatieren
      prompt = await promptTemplateBeide.format({
        userQuestion,
        auswaertigesAmtData,
        weatherData,
      });
    } else {
      // Wenn keine relevanten Daten gefunden werden konnten, standardmäßige Antwort
      prompt = "Entschuldigen Sie, ich habe dazu keine genaue Antwort.";
    }

    const { stream, handlers } = LangChainStream();
    const start = Date.now();

    try {
      // Verarbeitung der Nachricht mit Streaming
      await llm.call([...chatHistory, new HumanMessage(prompt)], {
        callbacks: [
          {
            handleLLMNewToken(token) {
              // Token zählen, während sie gestreamt werden
            },
            handleLLMEnd() {
              console.log("Stream beendet.");
            },
          },
          handlers,
        ],
      });

      trace.event({
        name: "LLM_Response_Success",
        metadata: {
          duration: Date.now() - start,
        },
      });
    } catch (error) {
      // Fehlerbehandlung für Langfuse
      trace.event({
        name: "LLM_Response_Error",
        metadata: {
          error: error.message,
        },
      });
      throw createError({
        statusCode: 500,
        statusMessage: "Fehler bei der Chatbot-Anfrage",
      });
    }

    // Rückgabe der gestreamten Antwort
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  });
});











// Funktion zum Abrufen der Wetterdaten basierend auf dem Kontextsatz
async function getWeatherData(isoCode: string): Promise<string> {
  try {
    const response = await fetch(`http://localhost:3000/api/getWeatherData?iso3Code=${isoCode}`);

    if (!response.ok) {
      throw new Error(`HTTP-Fehler! Status: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.weatherData) {
      return data.weatherData;
    } else {
      return 'Keine Wetterdaten für diesen ISO3-Code gefunden.';
    }
  } catch (error) {
    console.log(`Fehler beim Abrufen der Wetterdaten: ${error}`);
    return 'Fehler beim Abrufen der Wetterdaten.';
  }
}

// Pinecone Datenabfrage
async function getAuswaertigesAmtData(queryText: string): Promise<string> {
  try {
    const response = await fetch('http://localhost:3000/api/queryData', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        queryText: queryText,
        topK: 1,
      }),
    });

    const data = await response.json();

    if (!data || data.length === 0) {
      return 'Keine Ergebnisse gefunden';
    } else {
      return data.results;
    }
  } catch (err) {
    return 'Keine Länderdaten zur Verfügung.';
  }
}

// Laden des Contents für einen bestimmten ISO3-Code aus der Json
async function fetchContent(isoCode: string): Promise<string> {
  try {
    const response = await fetch(`http://localhost:3000/api/getCountryContent?iso3Code=${isoCode}`);

    if (!response.ok) {
      throw new Error(`HTTP-Fehler! Status: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.content) {
      return data.content;
    } else {
      return 'Kein Content für diesen ISO3-Code gefunden.';
    }
  } catch (error) {
    console.log(`Fehler beim Abrufen des Contents: ${error}`);
    return 'Fehler beim Abrufen des Contents.';
  }
}