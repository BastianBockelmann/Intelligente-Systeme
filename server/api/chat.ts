import { LangChainStream, Message, StreamingTextResponse } from 'ai';
import { ChatOpenAI } from 'langchain/chat_models/openai';
import { AIMessage, HumanMessage } from 'langchain/schema';

export default defineLazyEventHandler(() => {
  // fetch the OpenAI API key
  const apiKey = useRuntimeConfig().openaiApiKey;
  if (!apiKey) {
    throw createError('Missing OpenAI API key');
  }

  // create a OpenAI LLM client
  const llm = new ChatOpenAI({
    openAIApiKey: apiKey,
    streaming: true,
  });

  return defineEventHandler(async (event) => {
    const { messages } = await readBody<{ messages: Message[] }>(event);

    const { stream, handlers } = LangChainStream();
    llm
      .invoke(
        (messages as Message[]).map((message) =>
          message.role === 'user' ? new HumanMessage(message.content) : new AIMessage(message.content)
        ),
        { callbacks: [handlers] }
      )
      .catch(console.error);
    return new StreamingTextResponse(stream);
  });
});


// // /server/api/chat.ts
// import { OpenAI } from "langchain/llms/openai";
// import { LLMChain } from "langchain/chains";
// import { PromptTemplate } from "@langchain/core/message";

// // OpenAI Integrieren und API Key anbinden
// const openai = new OpenAI({
//   openAIApiKey: useRuntimeConfig().public.OPENAI_API_KEY,
//   temperature: 0.7, // Optionale Konfiguration zur Steuerung der Kreativität
//   maxTokens: 500,  // Begrenze die Anzahl der zurückgegebenen Tokens
// });

// export default defineLazyEventHandler(async (event) => {
//   try {
//     // Question Message
//     const body = await readBody(event);

//     // Vordefiniertes Prompt Template
//     const template = `
//     You are a helpful assistant that provides accurate and up-to-date information about foreign travel, visa requirements, safety warnings, and embassy services based on data from the Auswärtiges Amt (German Foreign Office). Respond in a clear and concise manner, and prioritize safety and travel advice.
//     User query: {input}`;

//     // Prompt Template generieren
//     const prompt = new PromptTemplate({
//       template,
//       inputVariables: ["input"],
//     });

//     // LLM-Chain erstellen
//     const chain = new LLMChain({
//       llm: openai,
//       prompt,
//     });

//     // get response from question
//     const response = await chain.call({
//       input: body.message,
//     });

//     // Rückgabe der Antwort
//     return { text: response.text };
//   } catch (error) {
//     console.error("Open API Methode fehlgeschlagen: ", error);
//     return {text: 'Leider ist ein Fehler bei dem Ausführen der Methode aufgetreten.'}
//   }
// });

// // https://dev.to/ikudev/chatting-with-your-documents-building-an-intelligent-chatbot-with-nuxt-langchain-and-vercel-ai-sdk-43ab
