// types/langfuse.d.ts
import { Langfuse } from 'langfuse';

// Deklaration des Typs für $langfuse in der NuxtApp
declare module '#app' {
  interface NuxtApp {
    $langfuse: Langfuse;
  }
}
