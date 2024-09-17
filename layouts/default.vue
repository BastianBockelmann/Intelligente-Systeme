<script setup lang="ts">
useHead({
  titleTemplate: (siteTitle) => {
    return siteTitle ?? 'Intelligente Systeme - Auswertiges Amt Chatbot';
  }
});
</script>
<template>
  <div>
    <!-- Page Layout -->
    <div class="bg-gray-50 dark:bg-gray-900 mx-auto h-full w-full px-2 sm:px-6 lg:px-8">
      <!-- Main Content Slot and SpeedInsights -->
      <slot>
      </slot>
    </div>
  </div>
</template>