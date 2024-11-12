import { defineEventHandler, getQuery } from 'h3';
import { getFullContentFromJson } from '../../utils/pineconeHandler.ts';

// Laden des Inhalts eines Landes anhand des ISO3-Codes aus der JSON-Datei

export default defineEventHandler(async (event) => {
  const { iso3Code } = getQuery(event);
  if (!iso3Code) {
    return { error: 'ISO3-Code muss angegeben werden' };
  }

  const content = getFullContentFromJson(iso3Code);
  if (!content) {
    return { error: `Kein Content für ISO3-Code "${iso3Code}" gefunden.` };
  }

  return { content };
});