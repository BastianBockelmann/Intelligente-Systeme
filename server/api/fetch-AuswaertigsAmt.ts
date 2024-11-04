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
  const countryDataByIso: Record<string, any> = {};

  const contentList = mainData.response?.contentList || [];
  const totalCountries = contentList.length;
  
  for (let index = 0; index < totalCountries; index++) {
    const countryId = contentList[index];
    
    try {
      const countryDataResponse = await fetchCountryData(countryId);
      const countryData = countryDataResponse.response?.[countryId];

      if (countryData && typeof countryData === 'object' && isValidContent(countryData)) {
        const parsedData = parseCountryData(countryData);
        const iso3Code = countryData.iso3CountryCode;
        
        // Strukturieren nach ISO3-Code
        countryDataByIso[iso3Code] = {
          ...parsedData,
          originalId: countryId // Optional: Original-ID als Referenz behalten
        };
      }
    } catch (error) {
      console.error(`Error processing country ${countryId}: ${error}`);
    }
  }

  return countryDataByIso;
}

// Funktion zum Speichern der JSON-Datei
function saveToJson(data: any, filename: string) {
  fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf-8');
}

// API-Route definieren
export default defineEventHandler(async () => {
  console.log('Fetching data from Auswärtiges Amt API...');
  const allCountriesData = await processAllCountries();

  const dataDir = join(process.cwd(), 'data');
  const filePath = join(dataDir, 'apiresponse_auswaertiges_amt_by_Iso3CountryCode.json');

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  saveToJson(allCountriesData, filePath);
  console.log('Fetching data from Auswärtiges Amt API successful');
  return { message: 'Data saved successfully', filePath };
});