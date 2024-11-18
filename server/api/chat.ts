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

  // Klassifizierung der Frage (Wetterabfrage, Auswärtiges Amt Daten, Beide, Sonstiges)
  const themePrompt = new PromptTemplate({
    template: `
      Du bist ein Assistent, der Informationen und Hilfe zu Auslandsreisen und relevanten Vorgaben des Auswärtigen Amts in Deutschland bereitstellt.
      Deine Aufgabe ist es, präzise und hilfreiche Informationen zu liefern, die für jemanden, der ins Ausland reisen möchte, wichtig sind.
      Dazu gehören Reisehinweise, Sicherheitswarnungen und Empfehlungen des Auswärtigen Amts.

      Benutzerfrage: {userQuestion}

      Bitte klassifiziere die Nutzerfrage zu einer Wahl zwischen "Wetterabfrage", "Auswärtiges Amt Daten", "Beide" oder "Sonstiges".
      "Beide" bezieht sich dabei auf Anfragen zu den Wetterdaten und den Daten des Auswärtiges Amt.

      Antworte nur mit der Auswahl zwischen den vier Klassifizierungen, die gegeben sind!
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
      Gebe nur den Namen des Landes aus der Frage aus! Nicht das Land ausschreiben nur den Namen! Ein Wort nur!

      Dann Hänge nur eine ganz kurze Kontext frage dahinter!
    `,
    inputVariables: ["userQuestion"],
  });

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

  // Prompt-Template für beide Daten
  const promptTemplateOther = new PromptTemplate({
    template: `
        Du hast folgende Daten zur Verfügung:

        Daten vom Auswärtigen Amt: {auswaertigesAmtData}
        Wetterdaten: {weatherData}

        Du bist ein Assistent, der Informationen und Hilfe zu Auslandsreisen und relevanten Vorgaben des Auswärtigen Amts in Deutschland bereitstellt.
        Deine Aufgabe ist es, präzise und hilfreiche Informationen zu liefern, die für jemanden, der ins Ausland reisen möchte, wichtig sind.
        Dazu gehören Reisehinweise, Sicherheitswarnungen, Empfehlungen des Auswärtigen Amts, sowie aktuelle und vergangene Wetterinformationen.

        Bitte beantworte die folgende Frage: {userQuestion}

        Wenn möglich beantworte die Frage mit einer detaillierten Antwort basierend auf den offiziellen Richtlinien und Informationen des Auswärtigen Amts und den bereitgestellten Wetterdaten.
        Wenn du keine relevanen Informationen in den Daten findest oder die Frage unabhänig zu beantworten ist gebe bitte eine allgemeingültige antwort aus.
        Füge in dieem Fall unbedigt am Anfang folgenden Satz in die Antwort ein: 'Entschuldigen Sie, ich habe dazu keine genaue Antwort in den mir vorliegenden Daten gefunden. Allgemein kann ich ihnen aber folgende Informationen geben: '`,
    inputVariables: ["userQuestion", "auswaertigesAmtData", "weatherData"],
  });

  return defineEventHandler(async (event) => {
    // Initialize token counting variables with default value of 0
    let classificationInputTokens = 0;
    let classificationOutputTokens = 0;
    let contextInputTokens = 0;
    let contextOutputTokens = 0;

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
    classificationInputTokens = countTokens(themePromptFormatted, "gpt-4");

    // Klassifizierung der Frage, um zu bestimmen, ob es um das Wetter, Reiseinformationen oder beides geht
    const classificationResponse = await classificationLlm.call([new HumanMessage(themePromptFormatted)]);
    const classification = classificationResponse.content.trim();
    classificationOutputTokens = countTokens(classification, "gpt-4");
    console.log(`Response classification: "${classification}"`);

    // 2. Kontextsatz erstellen
    let contextSentence = "";
    if (classification !== "Wetterabfrage") {
      const contextPromptFormatted = await contextPrompt.format({
        userQuestion,
      });
      contextInputTokens = countTokens(contextPromptFormatted, "gpt-4");

      const contextResponse = await classificationLlm.call([new HumanMessage(contextPromptFormatted)]);
      contextSentence = contextResponse.content.trim();
      contextOutputTokens = countTokens(contextSentence, "gpt-4");
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
    let inputTokenCount = 0;
    let outputTokenCount = 0;
    let pinecoreData = ""

    if (classification === "Wetterabfrage" && contextSentence) {
      pinecoreData = await getAuswaertigesAmtData(contextSentence)
      if (pinecoreData.length > 0) {
        pinecoreData = pinecoreData[0].iso3CountryCode
        weatherData = await getWeatherData(pinecoreData);
      }

      prompt = await promptTemplateWetter.format({
        userQuestion,
        weatherData,
      });
      inputTokenCount = countTokens(prompt, "gpt-4");

    } else if (classification === "Auswärtiges Amt Daten") {
      pinecoreData = await getAuswaertigesAmtData(contextSentence)
      if (pinecoreData.length > 0) {
        pinecoreData = pinecoreData[0].iso3CountryCode
        auswaertigesAmtData = await fetchContent(pinecoreData)
      } else {
        auswaertigesAmtData = 'keine Daten'
      }

      prompt = await promptTemplateAuswaertigesAmt.format({
        userQuestion,
        auswaertigesAmtData,
      });
      inputTokenCount = countTokens(prompt, "gpt-4");

    } else if (classification === "Beide") {
      pinecoreData = await getAuswaertigesAmtData(contextSentence)
      if (pinecoreData.length > 0) {
        pinecoreData = pinecoreData[0].iso3CountryCode
        weatherData = await getWeatherData(pinecoreData);
        auswaertigesAmtData = await fetchContent(pinecoreData)
      } else {
        weatherData = "Keine Wetterdaten"
        auswaertigesAmtData = "Keine Auswertiges Amt Daten"
      }

      prompt = await promptTemplateBeide.format({
        userQuestion,
        auswaertigesAmtData,
        weatherData,
      });
      inputTokenCount = countTokens(prompt, "gpt-4");

    } else if (classification === "Sonstiges") {
      pinecoreData = await getAuswaertigesAmtData(contextSentence)
      if (pinecoreData.length > 0) {
        pinecoreData = pinecoreData[0].iso3CountryCode
        weatherData = await getWeatherData(pinecoreData);
        auswaertigesAmtData = await fetchContent(pinecoreData)
      } else {
        weatherData = "Keine Wetterdaten"
        auswaertigesAmtData = "Keine Auswertiges Amt Daten"
      }

      prompt = await promptTemplateOther.format({
        userQuestion,
        auswaertigesAmtData,
        weatherData,
      });
      inputTokenCount = countTokens(prompt, "gpt-4");
    
    } else {
      prompt = "Entschuldigen Sie, ich habe dazu keine genaue Antwort.";
    }

    const { stream, handlers } = LangChainStream();
    const start = Date.now();

    try {
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

    const duration = Date.now() - start;

    const totalTokens =
      inputTokenCount +
      outputTokenCount +
      classificationInputTokens +
      classificationOutputTokens +
      contextInputTokens +
      contextOutputTokens;
    const costPerToken = 0.00003; 
    const inputCost = inputTokenCount * costPerToken;
    const outputCost = outputTokenCount * costPerToken;
    const classificationInputCost = classificationInputTokens * costPerToken;
    const classificationOutputCost = classificationOutputTokens * costPerToken;
    const contextInputCost = contextInputTokens * costPerToken;
    const contextOutputCost = contextOutputTokens * costPerToken;
    const totalCost =
      inputCost +
      outputCost +
      classificationInputCost +
      classificationOutputCost +
      contextInputCost +
      contextOutputCost;

    const classificationGeneration = langfuse.generation({
      model: "gpt-4",
      usage: {
        promptTokens:
          classificationInputTokens + contextInputTokens,
        completionTokens:
          classificationOutputTokens + contextOutputTokens,
        totalTokens:
          classificationInputTokens +
          classificationOutputTokens +
          contextInputTokens +
          contextOutputTokens,
        unit: "TOKENS",
        inputCost: classificationInputCost + contextInputCost,
        outputCost: classificationOutputCost + contextOutputCost,
        totalCost:
          classificationInputCost +
          classificationOutputCost +
          contextInputCost +
          contextOutputCost,
      },
    });

    classificationGeneration.end();

    const generation = langfuse.generation({
      model: "gpt-4",
      usage: {
        promptTokens: inputTokenCount,
        completionTokens: outputTokenCount,
        totalTokens: inputTokenCount + outputTokenCount,
        unit: "TOKENS",
        inputCost,
        outputCost,
        totalCost: inputCost + outputCost,
      },
    });

    generation.end();

    trace.event({
      name: "Total_Cost_And_Usage",
      metadata: {
        totalTokens,
        totalCost,
      },
    });

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
        topK: 5,
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
