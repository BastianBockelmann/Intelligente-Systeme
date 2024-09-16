<script setup lang="ts">
// Import Heroicons
import { PaperAirplaneIcon as HeroiconsSolidPaperAirplaneIcon } from '@heroicons/vue/24/solid';

const userInput = ref('');
const messages = ref([
    { text: 'Hello! How can I help you today?', isUser: false }
]);

// Function to handle sending a message
const sendMessage = () => {
    if (userInput.value.trim() !== '') {
        // Add user message
        messages.value.push({ text: userInput.value, isUser: true });

        // Add a simple bot response (for demo purposes)
        setTimeout(() => {
            messages.value.push({ text: 'This is a bot response.', isUser: false });
        }, 500);

        // Clear input
        userInput.value = '';
    }
};
</script>

<template>
    <div class="items-center justify-center">
        <span class="text-gray-700 bg-red-500 w-full">Chatbot für das Auswertige Amt</span>
        <div class="bg-gray-200 rounded-2xl w-full h-full mx-auto p-6 shadow-md rounded-lg mt-10">
            <!-- Chat Display Area -->
            <div
                class="shadow-lg rounded-2xl text-gray-800 flex flex-col space-y-4 mb-4 h-80 overflow-y-auto border-2-black p-4">
                <div v-for="(message, index) in messages" :key="index"
                    :class="{ 'self-end text-right': message.isUser, 'self-start text-left': !message.isUser }"
                    class="bg-gray-100 p-2 rounded-md shadow-sm max-w-xs">
                    {{ message.text }}
                </div>
            </div>

            <!-- Input Area -->
            <div class="flex items-center">
                <input type="text" v-model="userInput" @keyup.enter="sendMessage" placeholder="Type your message..."
                    class="flex-1 p-2 border rounded-md focus:outline-none focus:border-blue-500" />
                <button @click="sendMessage" class="ml-2 p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">
                    <HeroiconsSolidPaperAirplaneIcon class="w-5 h-5 transform rotate-45" />
                </button>
            </div>
        </div>
    </div>
</template>