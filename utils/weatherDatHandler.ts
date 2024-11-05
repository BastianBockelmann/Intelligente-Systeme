// weatherDataHandler.ts
import * as fs from 'fs';
import { join } from 'path';
import csvParser from 'csv-parser';

interface WeatherData {
  Country: string;
  ISO_Code: string;
  Month: string;
  tmin: string;
  tmax: string;
}

// Funktion zum Einlesen der CSV-Datei und Filtern der Temperaturdaten nach ISO-Code
export async function getTemperatureDataByISOCode(isoCode: string): Promise<string> {
  const filePath = join(process.cwd(), 'data', 'average_monthly_weather_data.csv');
  const weatherData: WeatherData[] = [];

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csvParser())
      .on('data', (row: WeatherData) => {
        if (row.ISO_Code.toUpperCase() === isoCode.toUpperCase()) {
          weatherData.push(row);
        }
      })
      .on('end', () => {
        if (weatherData.length === 0) {
          return resolve(`Keine Wetterdaten für ISO-Code ${isoCode} gefunden.`);
        }

        // Erstellen einer kurzen Zusammenfassung der Temperaturdaten
        const summary = weatherData
          .map(data => `${data.Month}: Tmin ${data.tmin}°C, Tmax ${data.tmax}°C`)
          .join('; ');

        resolve(`Wetterdaten für ${isoCode}: ${summary}`);
      })
      .on('error', (error) => {
        reject(`Fehler beim Einlesen der Wetterdaten: ${error.message}`);
      });
  });
}

// Beispielaufruf
getTemperatureDataByISOCode('DEU')
  .then((result) => console.log(result))
  .catch((error) => console.error(error));
