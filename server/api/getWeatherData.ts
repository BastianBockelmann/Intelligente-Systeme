import { defineEventHandler, getQuery } from 'h3';
import { getTemperatureDataByISOCode } from '../../utils/weatherDatHandler.ts';

// Abfrage der Wetterdaten für ein Land anhand des ISO3-Codes aus der CSV-Datei

export default defineEventHandler(async (event) => {
  const { iso3Code } = getQuery(event);
  if (!iso3Code) {
    return { error: 'ISO3-Code muss angegeben werden' };
  }

  try {
    const weatherData = await getTemperatureDataByISOCode(iso3Code);
    return { weatherData };
  } catch (error) {
    return { error: `Fehler beim Abrufen der Wetterdaten: ${error.message}` };
  }
});