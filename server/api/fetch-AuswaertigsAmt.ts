// Abfragen der API des Auswärtigen Amts und Speichern der Daten in einer json-Datei

import { defineEventHandler } from 'h3';
import axios from 'axios';
import * as fs from 'fs';
import { JSDOM } from 'jsdom';
import { join } from 'path';

// API-Daten von der Webseite abrufen
async function fetchTravelWarnings() {
  const url = "https://www.auswaertiges-amt.de/opendata/travelwarning/";
  const response = await axios.get(url);
  return response.data;
}

async function fetchCountryData(countryId: string) {
  const url = `https://www.auswaertiges-amt.de/opendata/travelwarning/${countryId}`;
  const response = await axios.get(url);
  return response.data;
}

function isValidContent(data: any): boolean {
  const requiredKeys = ['lastModified', 'effective', 'title', 'countryCode', 'iso3CountryCode', 'countryName'];
  return requiredKeys.every(key => key in data);
}

function parseHtmlContent(htmlContent: string): string {
  const dom = new JSDOM(htmlContent);
  const textContent = dom.window.document.body.textContent || '';
  return textContent.trim();
}

function parseCountryData(data: any) {
  const rawContent = data.content || '';
  const formattedContent = rawContent ? parseHtmlContent(rawContent) : '';

  return {
    lastModified: data.lastModified,
    effective: data.effective,
    title: data.title,
    countryCode: data.countryCode,
    iso3CountryCode: data.iso3CountryCode,
    countryName: data.countryName,
    warning: data.warning || false,
    partialWarning: data.partialWarning || false,
    situationWarning: data.situationWarning || false,
    situationPartWarning: data.situationPartWarning || false,
    lastChanges: data.lastChanges,
    content: formattedContent,
    disclaimer: data.disclaimer || ''
  };
}

async function processAllCountries() {
  const mainData = await fetchTravelWarnings();
  const allCountries: Record<string, any> = {};

  const contentList = mainData.response?.contentList || [];
  const totalCountries = contentList.length;
  
  for (let index = 0; index < totalCountries; index++) {
    const countryId = contentList[index];
    
    try {
      const countryDataResponse = await fetchCountryData(countryId);
      const countryData = countryDataResponse.response?.[countryId];

      if (countryData && typeof countryData === 'object' && isValidContent(countryData)) {
        const parsedData = parseCountryData(countryData);
        allCountries[countryId] = parsedData;
      }
    } catch (error) {
      console.error(`Error processing country ${countryId}: ${error}`);
    }
  }

  return allCountries;
}

// Funktion zum Speichern der JSON-Datei
function saveToJson(data: any, filename: string) {
  // Daten in eine JSON-Datei schreiben
  fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf-8');
}

// API-Route definieren
export default defineEventHandler(async () => {
  console.log('Fetching data from Auswärtiges Amt API...');
  const allCountriesData = await processAllCountries();

  // Absoluter Pfad zur Datei
  const dataDir = join(process.cwd(), 'data');
  const filePath = join(dataDir, 'apiresponse_auswaertiges_amt_all_countries.json');

  // Sicherstellen, dass der Ordner ./data existiert, ansonsten erstellen
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Speichern der Daten in der JSON-Datei
  saveToJson(allCountriesData, filePath);
  console.log('Fetching data from Auswärtiges Amt API successfull');
  return { message: 'Data saved successfully', filePath };
});