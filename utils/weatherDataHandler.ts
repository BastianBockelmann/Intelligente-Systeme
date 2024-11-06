// weatherDataHandler.ts
import * as fs from 'fs';
import { join } from 'path';
import csvParser from 'csv-parser';

interface WeatherData {
  Country: string;
  ISO3_Code: string;
  Month: string;
  tmin: string;
  tmax: string;
}

// Funktion zum Einlesen der CSV-Datei und Filtern der Temperaturdaten nach ISO-Code
export async function getTemperatureDataByISOCode(isoCode: string): Promise<string> {
  // Sicherstellen, dass isoCode nicht leer ist
  if (!isoCode || typeof isoCode !== 'string') {
    return Promise.reject('Ungültiger ISO-Code übergeben.');
  }

  const weatherFilePath = join(process.cwd(), 'data', 'average_monthly_weather_data.csv');
  const weatherData: WeatherData[] = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(weatherFilePath)
      .pipe(csvParser())
      .on('data', (row: WeatherData) => {
        // Prüfen, ob row.ISO3_Code definiert ist, bevor die Methode toUpperCase aufgerufen wird
        if (row.ISO3_Code && typeof row.ISO3_Code === 'string') {
          if (row.ISO3_Code.toUpperCase() === isoCode.toUpperCase()) {
            weatherData.push(row);
          }
        } else {
          console.warn('Warnung: ISO3_Code in CSV-Zeile ist undefiniert oder kein String:', row);
        }
      })
      .on('end', () => {
        if (weatherData.length === 0) {
          return resolve(`Keine Wetterdaten für ISO-Code ${isoCode} gefunden.`);
        }

        // Den vollständigen Ländernamen verwenden
        const countryName = weatherData[0].Country;

        // Wetterdaten nach den Monaten in der richtigen Reihenfolge sortieren
        const monthOrder = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];

        weatherData.sort((a, b) => monthOrder.indexOf(a.Month) - monthOrder.indexOf(b.Month));

        // Erstellen einer kurzen Zusammenfassung der Temperaturdaten
        const summary = weatherData
          .map(data => `${data.Month}: Tmin ${data.tmin}°C, Tmax ${data.tmax}°C`)
          .join('; ');

        resolve(`Weatherdata for ${countryName}: ${summary}`);
      })
      .on('error', (error) => {
        reject(`Fehler beim Einlesen der Wetterdaten: ${error.message}`);
      });
  });
}