// stores/chat.ts
import { defineStore } from 'pinia';
import axios from 'axios';

export const useChatStore = defineStore('chat', {
  // State
  state: () => ({
    messages: [
      {
        text: 'Stelle mir eine Frage über deine Auslandsreise für nötige Informationenen vor deiner Reise.',
        isUser: false,
        time: new Date().toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }),
      },
    ] as { text: string; isUser: boolean; time: string }[],
    userInput: '',
    loading: false,
  }),

  // Getters
  getters: {
    allMessages(state) {
      return state.messages;
    },
    isLoading(state) {
      return state.loading;
    },
  },

  // Actions
  actions: {
    async sendMessage() {
      if (this.userInput.trim() === '') return;

      // Add user message
      this.messages.push({
        text: this.userInput,
        isUser: true,
        time: new Date().toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }),
      });

      this.loading = true;

      try {
        const response = await axios.post(
          '/api/chat',
          { prompt: this.userInput },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        // Add chatbot response
        this.messages.push({
          text: response.data.data.trim(),
          isUser: false,
          time: new Date().toLocaleString('de-DE', { dateStyle: 'short', timeStyle: 'short' }),
        });
      } catch (error) {
        console.error('Fehler beim Abrufen der Antwort:', error);
      } finally {
        this.loading = false;
        this.userInput = ''; // Clear input after sending
      }
    },
  },
});
