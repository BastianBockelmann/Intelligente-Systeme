import type { Message } from "ai";
import { LangChainStream } from "ai";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";
import { PromptTemplate } from "@langchain/core/prompts";
import { Langfuse } from "langfuse";
import { encoding_for_model } from "tiktoken"; // Import tiktoken

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

  const llm = new ChatOpenAI({
    openAIApiKey: String(apiKey),
    streaming: true,
  });

  // Klassifizierung der Frage (Wetterdaten, Auswertiges Amt Daten)
  const themePrompt = new PromptTemplate({
    template: `
      Du bist ein Assistent, der Informationen und Hilfe zu Auslandsreisen und relevanten Vorgaben des Auswärtigen Amts in Deutschland bereitstellt.
      Deine Aufgabe ist es, präzise und hilfreiche Informationen zu liefern, die für jemanden, der ins Ausland reisen möchte, wichtig sind.
      Dazu gehören Reisehinweise, Sicherheitswarnungen und Empfehlungen des Auswärtigen Amts.

      Benutzerfrage: {userQuestion}

      Bitte klassifiziere die Nutzerfrage zu einer Wahl zwischen "Wetterabfrage", "Auswertiges Amt Daten" oder "Beide"

      Antworte nur mit der Auswahl zwischen den beiden klassifizierungen, die gegeben sind!
    `,
    inputVariables: ["userQuestion"]
  })

  
  // Alle Prompt
  const promptTemplate = new PromptTemplate({
    template: `
        Du hast folgende Daten zu verfügung:

        Daten vom Auswertigen Amt: {auswertigesAmtData}
        Wetterdaten: {weatherData}

        Du bist ein Assistent, der Informationen und Hilfe zu Auslandsreisen und relevanten Vorgaben des Auswärtigen Amts in Deutschland bereitstellt.
        Deine Aufgabe ist es, präzise und hilfreiche Informationen zu liefern, die für jemanden, der ins Ausland reisen möchte, wichtig sind.
        Dazu gehören Reisehinweise, Sicherheitswarnungen und Empfehlungen des Auswärtigen Amts.

        Bitte beantworte die folgende Frage: {userQuestion}

        Gib eine detaillierte Antwort basierend auf den offiziellen Richtlinien und Informationen des Auswärtigen Amts. Beantworte die Frage nur wenn du relevante Informationen findest. Wenn nicht, antworte mit 'Entschuldigen Sie ich habe dazu keine genaue Antwort.'`,
    inputVariables: ["userQuestion"], ["auswertigesAmtData"], ["weatherData"],
  });

  return defineEventHandler(async (event) => {
    const { messages } = await readBody<{ messages: Message[] }>(event);

    if (!messages || messages.length === 0) {
      throw createError({
        statusCode: 400,
        statusMessage: "Keine Nachrichten gefunden",
      });
    }

    const trace = langfuse.trace({
      name: "chat-api-call",
      userId: "Team_Arbeit_Auswertiges_Amt",
      metadata: {
        userQuestion: messages[0].content,
      },
      tags: ["production"],
    });

    const prompt = await promptTemplate.format({
      userQuestion: messages[0].content,
    });

    // Token count for the input message
    const inputTokenCount = countTokens(prompt, "gpt-4"); // Use tiktoken for counting
    let outputTokenCount = 0;

    const { stream, handlers } = LangChainStream();
    const start = Date.now();

    try {
        // Process message with streaming, use the handlers to track token usage
        await llm.call([new HumanMessage(prompt)], {
          callbacks: [
            {
              handleLLMNewToken(token) {
                // Count the tokens as they are streamed
                outputTokenCount++;
              },
              handleLLMEnd() {
                // When the response completes
                console.log("Stream ended.");
              },
            },
            handlers, // Existing handlers for the streaming response
          ],
        });

      // Event on successful response
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
      // Error Handling for Langfuse
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

    // Kosten berechnen (GPT-4 preis pro 1000 Tokens)
    const totalTokens = inputTokenCount + outputTokenCount;
    const costPerToken = 0.00003; // Example cost for OpenAI GPT-4
    const inputCost = inputTokenCount * costPerToken;
    const outputCost = outputTokenCount * costPerToken;
    const totalCost = inputCost + outputCost;

    // Create Langfuse generation with usage and cost tracking
    const generation = langfuse.generation({
      model: "gpt-4", // Specify the model used
      usage: {
        promptTokens: inputTokenCount,   // Input token count
        completionTokens: outputTokenCount, // Output token count
        totalTokens,       // Total token count
        unit: "TOKENS",    // Specify token unit
        inputCost,         // Input cost based on token usage
        outputCost,        // Output cost based on token usage
        totalCost          // Total cost
      },
    });

    // Update Langfuse with generation details
    generation.update({
      usage: {
        promptTokens: inputTokenCount,
        completionTokens: outputTokenCount,
        totalTokens,
        inputCost,
        outputCost,
        totalCost,
      },
    });

    // End the generation to signify completion
    generation.end();

    // Return the streamed response
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  });
});
