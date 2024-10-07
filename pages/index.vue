<script setup lang="ts">
import moment from "moment";

const userInput = ref("");
const chatContainer = ref<HTMLElement | null>(null);
const showScrollButton = ref(false); // Scroll-Button sichtbar oder nicht
const messages = ref([
  {
    text: "Stelle mir eine Frage über deine Auslandsreise für nötige Informationen vor deiner Reise.",
    isUser: false,
    time: convertDate(new Date()),
  },
]);

// Funktion zum Senden einer Nachricht
const sendMessage = async () => {
  if (userInput.value.trim() !== "") {
    // Benutzer-Nachricht hinzufügen
    messages.value.push({
      text: String(userInput.value),
      isUser: true,
      time: convertDate(new Date()),
    });

    // Nachricht an Langchain-Backend senden
    await fetchChatbotResponse(String(userInput.value));

    // Eingabe löschen
    userInput.value = "";
  }
};

// Funktion zur Formatierung des Datums
function convertDate(date: Date) {
  const formattedDate = moment(date).format("DD.MM.YYYY - HH:mm");
  return formattedDate;
}

// Funktion um ans Ende des Chatverlaufs zu scrollen
const scrollToBottom = () => {
  if (chatContainer.value) {
    chatContainer.value.scrollTo({
      top: chatContainer.value.scrollHeight,
      behavior: "smooth", // Sanftes Scrollen
    });
  }
};

// Überwachung von Nachrichten-Änderungen zum automatischen Scrollen
watch(messages, () => {
  scrollToBottom();
});

// Scrollen beim Laden der Komponente
onMounted(() => {
  scrollToBottom();

  // Scroll-Button sichtbar machen, wenn nicht unten gescrollt wird
  if (chatContainer.value) {
    chatContainer.value.addEventListener("scroll", () => {
      if (chatContainer.value) {
        showScrollButton.value =
          chatContainer.value.scrollTop + chatContainer.value.clientHeight <
          chatContainer.value.scrollHeight;
      }
    });
  }
});



// Funktion um Chatbot-Antwort vom Backend abzurufen
const fetchChatbotResponse = async (userMessage: string) => {
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messages: [{ role: 'user', content: userMessage }] }), // Benutzer-Nachricht
    });

    userInput.value = ""

    // Sicherstellen, dass die Antwort ein Stream ist
    const reader = response.body?.getReader();
    if (reader) {
      const decoder = new TextDecoder();
      let done = false;
      let chatbotMessage = '';

      // Streaming der Antwort
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          // Chunk dekodieren
          const chunk = decoder.decode(value, { stream: true });

          // Clean up the format: remove the '0:' indices and other artifacts
          const cleanedChunk = chunk.replace(/\d+:"/g, '').replace(/"\n?/g, '').replace(/\n\n/g, ' ');

          // Dynamically add the clean text to the message being built
          chatbotMessage += cleanedChunk;

          // Dynamisch die Nachricht aktualisieren, während der Text gestreamt wird
          addMessageToChatbot(chatbotMessage.trim());
        }
      }
    }
  } catch (error) {
    console.error('Fehler beim Abrufen der Chatbot-Antwort:', error);
  }
};

// Funktion zum Hinzufügen der Chatbot-Nachricht
const addMessageToChatbot = (text: string) => {
  // Aktualisiere die letzte Nachricht oder füge eine neue hinzu
  const lastMessage = messages.value[messages.value.length - 1];
  if (!lastMessage.isUser) {
    lastMessage.text = text; // Aktualisiere die bestehende Nachricht
  } else {
    messages.value.push({
      text: text,
      isUser: false,
      time: convertDate(new Date()),
    });
  }

  // Scrollen zum unteren Ende des Chats
  scrollToBottom();
};

// Dummy-Daten für Dropdown (Anpassung für das Projekt)
const items = [
  [
    {
      label: "ChatBot Auswertiges Amt",
      slot: "account",
      disabled: true,
    },
  ],
  [
    {
      label: "Intelligente Systeme WS-24/25",
      slot: "modul",
      disabled: true,
    },
  ],
  [
    {
      label: "https://www.auswaertiges-amt.de/opendata/travelwarning",
      slot: "api",
      icon: "i-heroicons-cog-8-tooth",
      disabled: true,
    },
  ],
];
</script>

<template>
  <div class="h-screen flex flex-col justify-between">
    <div class="flex justify-center items-center px-2">
      <UDropdown mode="hover" :items="items" :ui="{ width: 'w-60', item: { disabled: 'cursor-text select-text' } }"
        :popper="{ placement: 'bottom-start' }">
        <UButton variant="ghost" label="Über" icon="i-heroicons-information-circle" />
        <template #account="{ item }">
          <div class="text-left">
            <p>Application</p>
            <p class="break-words truncate font-medium text-gray-900 dark:text-white">
              {{ item.label }}
            </p>
          </div>
        </template>

        <template #modul="{ item }">
          <div class="text-left">
            <p>Modul:</p>
            <p class="break-words truncate font-medium text-gray-900 dark:text-white">
              {{ item.label }}
            </p>
          </div>
        </template>

        <template #api="{ item }">
          <div class="text-left">
            <p>Benutze API:</p>
            <UButton class="font-medium text-left break-words" :to="item.label" :label="item.label" variant="link">
            </UButton>
          </div>
        </template>
      </UDropdown>

      <!-- Header Area -->
      <span class="w-full text-gray-700 dark:text-gray-100 text-center text-xl font-semibold py-3">
        Chatbot - Infos für Auslandsreisen
      </span>
    </div>

    <!-- Chat Display Area -->
    <div ref="chatContainer" class="h-full text-gray-800 flex flex-col space-y-4 overflow-y-auto p-4 relative">
      <div v-for="(message, index) in messages" :key="index" class="flex justify-center items-center" :class="{
        'self-end text-right': message.isUser,
        'self-start text-left': !message.isUser,
      }">
        <div v-if="!message.isUser"
          class="text-gray-500 text-center items-center flex justify-center h-10 w-10 mr-2 rounded-full bg-white dark:bg-gray-800 border dark:border-gray-600">
          <UIcon name="i-heroicons-check-circle" class="w-6 h-6" />
        </div>
        <div class="flex-1">
          <span class="text-xs text-gray-600 dark:text-gray-400">{{
            message.time
          }}</span>
          <div
            class="bg-gray-200 dark:text-gray-300 dark:bg-gray-800 p-1 my-auto rounded-md shadow-sm max-w-xs break-words">
            {{ message.text }}
          </div>
        </div>

        <div v-if="message.isUser"
          class="text-gray-600 dark:text-gray-400 text-center items-center justify-center flex h-10 w-10 ml-2 rounded-full bg-white dark:bg-gray-800 border dark:border-gray-600">
          <UIcon name="i-heroicons-user" class="w-6 h-6" />
        </div>
      </div>

      <!-- Scroll to Bottom Button -->
      <UButton v-if="showScrollButton" @click="scrollToBottom"
        class="fixed bottom-24 left-1/2 transform -translate-x-1/2 rounded-full shadow-lg" variant="soft"
        icon="i-heroicons-arrow-down" size="lg">
        Runter Scrollen
      </UButton>
    </div>

    <!-- Input Area -->
    <div class="w-full pb-4 md:px-36 px-7 flex-1 items-center">
      <UInput v-model="userInput" @keyup.enter="sendMessage" placeholder="Senden Sie eine Nachricht..."
        variant="outline" class="flex-1" autocomplete="off"
        :ui="{ rounded: 'rounded-2xl', icon: { trailing: { pointer: '' } } }" size="lg"
        icon="i-heroicons-chat-bubble-left-ellipsis">
        <template #trailing>
          <UButton v-show="userInput !== ''" class="rounded-full" @click="sendMessage" variant="soft" size="xl"
            icon="i-heroicons-arrow-up" :padded="false"></UButton>
        </template>
      </UInput>
      <p class="text-center text-gray-500 text-xs">Dies ist ein Projekt für das Modul: Intelligente Systeme von
      </p>
      <p class="text-center text-gray-500 text-xs">Lea Mangelsen, Gerrit Biller und Bastian Bockelmann
      </p>
    </div>
  </div>
</template>
