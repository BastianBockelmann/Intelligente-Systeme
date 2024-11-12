<script setup lang="ts">
// Bibiliotheken Importieren
import moment from "moment";

const userInput = ref("");
const chatContainer = ref<HTMLElement | null>(null);
const showScrollButton = ref(false); // Scroll-Button sichtbar oder nicht
const isLoading = ref(false); // Lade-Status für den Chatbot
const messages = ref([
  {
    text: "Stelle mir eine <b>Frage</b> <br>über deine Auslandsreise für nötige Informationen vor deiner Reise.",
    isUser: false,
    time: convertDate(new Date()),
  },
]);

// Funktion zur Erstellung einer eindeutigen Session-ID
function generateSessionId() {
  return `session-${Math.random().toString(36).substring(2, 15)}-${Math.random().toString(36).substring(2, 15)}`;
}

// Session-ID holen oder generieren
const sessionId = ref<string | null>(null);

// Funktion zum Senden einer Nachricht
const sendMessage = async () => {
  if (userInput.value.trim() !== "") {

    // Lokal Text speichern
    const textInput = userInput.value

    // Eingabe löschen
    userInput.value = "";

    // Benutzer-Nachricht hinzufügen
    messages.value.push({
      text: String(textInput),
      isUser: true,
      time: convertDate(new Date()),
    });

    // Lade-Status aktivieren
    isLoading.value = true;

    // Nachricht an Langchain-Backend senden
    await fetchChatbotResponse(String(textInput));


    // Lade-Status deaktivieren
    isLoading.value = false;
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

onMounted(() => {
  // Beim Laden der Komponente prüfen, ob eine Session-ID existiert, sonst eine neue erstellen
  let storedSessionId = localStorage.getItem("chatSessionId");
  if (!storedSessionId) {
    storedSessionId = generateSessionId();
    localStorage.setItem("chatSessionId", storedSessionId);
  }
  sessionId.value = storedSessionId;

  // Scrollen beim Laden der Komponente
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

// Funktion, um eine neue Session zu starten
const startNewSession = () => {
  const newSessionId = generateSessionId();
  sessionId.value = newSessionId;
  localStorage.setItem("chatSessionId", newSessionId);

  // Leeren Sie den Memory-Store und die Nachrichten
  messages.value = [
    {
      text: "Stelle mir eine <b>Frage</b> <br>über deine Auslandsreise für nötige Informationen vor deiner Reise.",
      isUser: false,
      time: convertDate(new Date()),
    },
  ];

  console.log("Neue Session gestartet mit ID:", newSessionId);
};


// Funktion um Chatbot-Antwort vom Backend abzurufen
const fetchChatbotResponse = async (userMessage: string) => {
  try {
    if (!sessionId.value) {
      console.error("Fehler: Session-ID fehlt!");
      return;
    }

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: userMessage }],
        sessionId: sessionId.value // Session-ID hinzufügen
      }),
    });

    userInput.value = "";

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

          console.log('Dies ist die Rückgabe von ChatGPT: ' + chunk);

          // Bereinigen des Formats, um Artefakte zu entfernen
          const cleanedChunk = chunk.replace(/\d+:"/g, '').replace(/"\n?/g, '').replace(/\n\n/g, ' ');

          // Dynamisch den Text zur Nachricht hinzufügen
          chatbotMessage += cleanedChunk;

          // Nachricht aktualisieren, während der Text gestreamt wird
          addMessageToChatbot(chatbotMessage.trim());
        }
      }
    }
  } catch (error) {
    console.error('Fehler beim Abrufen der Chatbot-Antwort:', error);
  }
};

function formatMessageWithLists(text: string): string {

  // Fettschrift für Titel (z.B. **Titel**)
  let formattedText = text.replace(/\*\*(.*?)\*\*/g, "<b>$1</b>");

  formattedText = formattedText.replace(/(?:\n|^)(\d+)\.\s(.+?)(?=\n|$)/g, "<b><li>$1. $2</li></b>");

  // Nummerierte Listen (1., 2., 3. ...) erkennen und in <li> umwandeln
  formattedText = formattedText.replace(/(?:\n|^)(\d+)\.\s(.+?)(?=\n|$)/g, "<b><li>$1. $2</li></b>");

  // Aufzählungen mit - in Listen umwandeln (- Listenelement)
  formattedText = formattedText.replace(/(?:\n|^)-\s(.+?)(?=\n|$)/g, "<b><li>$1</li></b>");

  // Alle <li> in <ul> oder <ol> umschließen, abhängig von der Liste
  formattedText = formattedText.replace(/(<li>\d+\. .*<\/li>)/g, "<b><ol>$1</ol></b>");
  formattedText = formattedText.replace(/(<li>(?!\d\.).*<\/li>)/g, "<ul>$1</ul>");

  // Doppelte Zeilenumbrüche in Absätze (<p>) umwandeln
  formattedText = formattedText.replace(/\n\n/g, "</p><p>");

  // Einfache Zeilenumbrüche außerhalb von Listen in <br> umwandeln
  formattedText = formattedText.replace(/\n/g, "<br>");

  // Entferne doppelte Backslashes
  formattedText = formattedText.replace(/\\n/g, "<br>");

  // Text in <p> packen, falls nicht bereits in einem Block
  return `<p>${formattedText}</p>`;
}




// Funktion zum Hinzufügen der Chatbot-Nachricht
const addMessageToChatbot = (text: string) => {

  // Nachricht formatieren
  const formattedText = formatMessageWithLists(text);

  // Aktualisiere die letzte Nachricht oder füge eine neue hinzu
  const lastMessage = messages.value[messages.value.length - 1];
  if (!lastMessage.isUser) {
    lastMessage.text = formattedText; // Aktualisiere die bestehende Nachricht
  } else {
    messages.value.push({
      text: formattedText,
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
  [
    {
      label: "Data testing",
      slot: "vector",
      to: "/Data",
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

        <template #vector="{ item }">
          <div class="text-left">
            <p>Vektor Page:</p>
            <UButton class="font-medium text-left break-words" :to="item.to" :label="item.label" variant="link">
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
          <span class="text-xs text-gray-600 dark:text-gray-400">
            {{ message.time }}
          </span>

          <!-- Wenn Chatbot Antwort -->
          <div v-if="!message.usUser"
            class="bg-gray-200 dark:text-gray-300 dark:bg-gray-800 p-1 my-auto rounded-md shadow-sm max-w-xs break-words">
            <span v-html="message.text"></span>
          </div>

          <div v-if="message.usUser"
            class="bg-gray-200 dark:text-gray-300 dark:bg-gray-800 p-1 my-auto rounded-md shadow-sm max-w-xs break-words">
            <span>{{ message.text }}</span>
          </div>
        </div>

        <div v-if="message.isUser"
          class="text-gray-600 dark:text-gray-400 text-center items-center justify-center flex h-10 w-10 ml-2 rounded-full bg-white dark:bg-gray-800 border dark:border-gray-600">
          <UIcon name="i-heroicons-user" class="w-6 h-6" />
        </div>
      </div>

      <!-- Lade-Status-Anzeige -->
      <div v-if="isLoading" class="flex self-start items-center text-gray-600 dark:text-gray-400 space-x-2">
        <span>Chatbot lädt...</span>
        <UIcon name="i-heroicons-ellipsis-horizontal" class="animate-bounce" />
      </div>

      <!-- Scroll to Bottom Button -->
      <UButton v-if="showScrollButton" @click="scrollToBottom"
        class="fixed bottom-24 left-1/2 transform -translate-x-1/2 rounded-full shadow-lg" variant="soft"
        icon="i-heroicons-arrow-down" size="lg">
        Runter Scrollen
      </UButton>
    </div>

    <!-- Input Area -->
    <div class="w-full pb-4 md:px-36 px-7 flex-1 items-center flex">
      <!-- Neuer Button zum Starten einer neuen Session -->
      <UButton @click="startNewSession" variant="soft" size="xl" icon="i-heroicons-chat-bubble-left" :padded="false" class="mr-4 p-2"
        title="Neuen Chat starten">
        <span class="hidden md:inline">Neuer Chat</span>
      </UButton>

      <!-- Chat-Eingabefeld -->
      <UInput v-model="userInput" @keyup.enter="sendMessage" placeholder="Senden Sie eine Nachricht..."
        variant="outline" class="flex-1" autocomplete="off"
        :ui="{ rounded: 'rounded-2xl', icon: { trailing: { pointer: '' } } }" size="lg"
        icon="i-heroicons-chat-bubble-left-ellipsis">
        <template #trailing>
          <UButton v-show="userInput !== ''" class="rounded-full" @click="sendMessage" variant="soft" size="xl"
            icon="i-heroicons-arrow-up" :padded="false"></UButton>
        </template>
      </UInput>
    </div>
  </div>
</template>
