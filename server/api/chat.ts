// server/api/chat.ts
import { defineEventHandler, readBody } from 'h3'
import axios from 'axios'

const API_KEY = process.env.OPENAI_API_KEY;
const API_URL = 'https://api.openai.com/v1/completions'

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    try {
        const response = await axios.post(
            API_URL,
            {
                model: 'text-davinci-003', // oder 'gpt-4' je nach Verfügbarkeit und Bedarf
                prompt: body.prompt,
                max_tokens: 100,
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${API_KEY}`,
                },
            }
        );

        return {
            success: true,
            data: response.data.choices[0].text,
        };
    } catch (error) {
        console.error('Error while calling OpenAI API:', error);
        return {
            success: false,
            error: 'Fehler beim Abrufen der Antwort von OpenAI',
        };
    }
});
