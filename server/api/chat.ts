import type { Message, LangChainAdapter } from 'ai'
import { ChatOpenAI } from '@langchain/openai'
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { PromptTemplate } from '@langchain/core/prompts'

export default defineLazyEventHandler(() => {
    // API Key holen
    const config = useRuntimeConfig();
    const apiKey = config.openaiApiKey;
    if (!apiKey) {
        throw createError('OpenAI API key fehlt');
    }

    // Client OpenAI
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
    inputVariables: ["userQuestion"],});

    // Prompt mit der Benutzernachricht füllen


    return defineEventHandler(async (event) => {
        console.info('Event des Handlers', event)
        const { messages } = await readBody<{ messages: Message[] }>(event);

        // Prompt mit der Benutzernachricht füllen
        const prompt = await promptTemplate.format({ userQuestion: messages[0].content });

        // LangChainAdapter fürs Streaming
        const { stream, handlers } = LangChainAdapter();

        // Nachricht, Content
        try {
            // Chatbot Nachricht bearbeiten und streamen
            await llm.invoke(
                messages.map((message) =>
                    message.role === 'user'
                        ? new HumanMessage(message.content)
                        : new AIMessage(message.content)
                ),
                { callbacks: [handlers] }  // Callback für das Streaming
            );
        } catch (error) {
            console.error('Fehler bei der Chatbot-Anfrage:', error);
            throw createError({
                statusCode: 500,
                statusMessage: 'Fehler bei der Chatbot-Anfrage',
            });
        }

        // Antwort Stream
        return new Response(stream, {
            status: 200,
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
            },
        });
    });
});