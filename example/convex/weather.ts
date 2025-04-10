import { tool } from "ai";
import { z } from "zod";

export const getGeocoding = tool({
  description: "Get the latitude and longitude of a location",
  parameters: z.object({
    location: z
      .string()
      .describe("The location to get the geocoding for, e.g. 'San Francisco'"),
  }),
  execute: async ({ location }) => {
    const geocodingUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`;
    const geocodingResponse = await fetch(geocodingUrl);
    const geocodingData = (await geocodingResponse.json()) as {
      results: {
        latitude: number;
        longitude: number;
        name: string;
      }[];
    };

    if (!geocodingData.results?.[0]) {
      throw new Error(`Location '${location}' not found`);
    }

    const { latitude, longitude, name } = geocodingData.results[0];
    return { latitude, longitude, name };
  },
});

export const getWeather = tool({
  description: "Get the weather for a location",
  parameters: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }),
  execute: async (args) => {
    const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${args.latitude}&longitude=${args.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,wind_gusts_10m,weather_code`;

    const response = await fetch(weatherUrl);
    const data = (await response.json()) as {
      current: {
        time: string;
        temperature_2m: number;
        wind_speed_10m: number;
        wind_gusts_10m: number;
      };
    };
    return {
      temperature: data.current.temperature_2m,
      windSpeed: data.current.wind_speed_10m,
      windGust: data.current.wind_gusts_10m,
    };
  },
});
