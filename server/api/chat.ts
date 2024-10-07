import type { Message } from "ai";
import { LangChainStream } from "ai"; // Korrigierter Import
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { PromptTemplate } from "@langchain/core/prompts";
import { Langfuse } from "langfuse"; // Direkt importieren

export default defineLazyEventHandler(() => {
  const config = useRuntimeConfig();

  // Langfuse initialisieren
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

  // OpenAI Client initialisieren
  const llm = new ChatOpenAI({
    openAIApiKey: String(apiKey),
    streaming: true,
  });

  // Prompt Template definieren
  const promptTemplate = new PromptTemplate({
    template: `
        Du bist ein Assistent, der Informationen und Hilfe zu Auslandsreisen und relevanten Vorgaben des Auswärtigen Amts in Deutschland bereitstellt.
        Deine Aufgabe ist es, präzise und hilfreiche Informationen zu liefern, die für jemanden, der ins Ausland reisen möchte, wichtig sind.
        Dazu gehören Reisehinweise, Sicherheitswarnungen und Empfehlungen des Auswärtigen Amts.

        Benutzerfrage: {userQuestion}

        Gib eine detaillierte Antwort basierend auf den offiziellen Richtlinien und Informationen des Auswärtigen Amts.`,
    inputVariables: ["userQuestion"],
  });

  // Event Handler für den API-Endpunkt
  return defineEventHandler(async (event) => {
    console.info("Event des Handlers", event);

    // Body der Anfrage lesen
    const { messages } = await readBody<{ messages: Message[] }>(event);

    // Überprüfen, ob Nachrichten vorhanden sind
    if (!messages || messages.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Keine Nachrichten gefunden",
      });
    }

    // Langfuse Trace initialisieren
    const trace = langfuse.trace({
      name: "chat-api-call",
      userId: "user__12345", // Beispiel für eine eindeutige User-ID
      metadata: {
        userQuestion: messages[0].content,
      },
      tags: ["production"], // Tags für den Trace
    });

    // Prompt mit der Benutzernachricht füllen
    const prompt = await promptTemplate.format({
      userQuestion: messages[0].content,
    });

    // Berechne die Anzahl der Tokens für das Prompt
    const inputTokenCount = 1000;

    // Streaming Setup mit LangChainStream
    const { stream, handlers } = LangChainStream();

    // Tracken der API-Aufrufdauer
    const start = Date.now();
    let outputTokenCount = 0;

    try {
      // Nachrichten verarbeiten und streamen
      await llm.call([new HumanMessage(prompt)], {
        callbacks: [handlers], // Callback für das Streaming
      });

      // Event in Langfuse Trace aufzeichnen
      trace.event({
        name: "LLM_Response_Success",
        metadata: {
          duration: Date.now() - start,
          prompt,
          inputTokenCount,
          outputTokenCount,
          totalTokens: inputTokenCount + outputTokenCount,
        },
      });
    } catch (error) {
      // Fehlerfall im Trace festhalten
      trace.event({
        name: "LLM_Response_Error",
        metadata: {
          error: error.message,
        },
      });

      console.error("Fehler bei der Chatbot-Anfrage:", error);
      throw createError({
        statusCode: 500,
        statusMessage: "Fehler bei der Chatbot-Anfrage",
      });
    }

    const duration = Date.now() - start;
    console.info(`Dauer der Verarbeitung: ${duration}ms`);

    // Trace mit Dauer aktualisieren
    trace.update({
      metadata: {
        duration,
        result: "success",
      },
    });

    // Antwort streamen
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  });
});
