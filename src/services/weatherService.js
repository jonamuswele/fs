// Weather Service for Farmer Solutions
// Integrates with Open-Meteo API (free, open, no API key required)

// WMO Weather interpretation codes (WW)
const WMO_CODES = {
  0: { label: "Clear sky", icon: "☀️" },
  1: { label: "Mainly clear", icon: "🌤️" },
  2: { label: "Partly cloudy", icon: "⛅" },
  3: { label: "Overcast", icon: "☁️" },
  45: { label: "Foggy", icon: "🌫️" },
  48: { label: "Depositing rime fog", icon: "🌫️" },
  51: { label: "Light drizzle", icon: "🌦️" },
  53: { label: "Moderate drizzle", icon: "🌦️" },
  55: { label: "Dense drizzle", icon: "🌧️" },
  56: { label: "Light freezing drizzle", icon: "🌧️" },
  57: { label: "Dense freezing drizzle", icon: "🌧️" },
  61: { label: "Slight rain", icon: "🌦️" },
  63: { label: "Moderate rain", icon: "🌧️" },
  65: { label: "Heavy rain", icon: "🌧️" },
  66: { label: "Light freezing rain", icon: "🌧️" },
  67: { label: "Heavy freezing rain", icon: "🌧️" },
  71: { label: "Slight snow fall", icon: "🌨️" },
  73: { label: "Moderate snow fall", icon: "🌨️" },
  75: { label: "Heavy snow fall", icon: "❄️" },
  77: { label: "Snow grains", icon: "❄️" },
  80: { label: "Slight rain showers", icon: "🌦️" },
  81: { label: "Moderate rain showers", icon: "🌧️" },
  82: { label: "Violent rain showers", icon: "⛈️" },
  85: { label: "Slight snow showers", icon: "🌨️" },
  86: { label: "Heavy snow showers", icon: "❄️" },
  95: { label: "Thunderstorm", icon: "⛈️" },
  96: { label: "Thunderstorm with slight hail", icon: "⛈️" },
  99: { label: "Thunderstorm with heavy hail", icon: "⛈️" }
};

export function getWeatherMeta(code) {
  return WMO_CODES[code] || { label: "Clear", icon: "☀️" };
}

// In-memory cache to prevent redundant API calls
const weatherCache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

export async function fetchWeatherForecast(lat, lng) {
  if (lat === undefined || lat === null || isNaN(Number(lat)) || lng === undefined || lng === null || isNaN(Number(lng))) {
    // Default fallback to Bukavu / Lwiro coordinates if not provided
    lat = -2.2472;
    lng = 28.8042;
  }

  const numLat = Number(lat);
  const numLng = Number(lng);
  const cacheKey = `${numLat.toFixed(3)},${numLng.toFixed(3)}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${numLat}&longitude=${numLng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,relative_humidity_2m_mean&timezone=auto`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const json = await response.json();

    // Parse current weather
    const currentCode = json.current?.weather_code ?? 0;
    const currentMeta = getWeatherMeta(currentCode);
    const current = {
      temp: Math.round(json.current?.temperature_2m ?? 24),
      apparentTemp: Math.round(json.current?.apparent_temperature ?? 24),
      humidity: Math.round(json.current?.relative_humidity_2m ?? 60),
      wind: Math.round(json.current?.wind_speed_10m ?? 10),
      precipitation: json.current?.precipitation ?? 0,
      code: currentCode,
      condition: currentMeta.label,
      icon: currentMeta.icon,
      timestamp: json.current?.time || new Date().toISOString()
    };

    // Parse 7-day daily forecast
    const daily = [];
    const dailyData = json.daily || {};
    const times = dailyData.time || [];
    const todayStr = new Date().toISOString().split("T")[0];

    for (let i = 0; i < Math.min(times.length, 7); i++) {
      const dateStr = times[i];
      const code = dailyData.weather_code?.[i] ?? 0;
      const meta = getWeatherMeta(code);
      const isToday = i === 0 || dateStr === todayStr;
      
      const d = new Date(dateStr);
      const dayName = isToday
        ? "Today"
        : i === 1
        ? "Tomorrow"
        : d.toLocaleDateString("en-US", { weekday: "short" });

      daily.push({
        day: dayName,
        date: dateStr,
        code,
        icon: meta.icon,
        condition: meta.label,
        high: Math.round(dailyData.temperature_2m_max?.[i] ?? 26),
        low: Math.round(dailyData.temperature_2m_min?.[i] ?? 17),
        rain: Math.round(dailyData.precipitation_probability_max?.[i] ?? 0),
        rainMm: Number((dailyData.precipitation_sum?.[i] ?? 0).toFixed(1)),
        humidity: Math.round(dailyData.relative_humidity_2m_mean?.[i] ?? 60),
        wind: Math.round(dailyData.wind_speed_10m_max?.[i] ?? 12)
      });
    }

    // Build intelligent irrigation recommendation
    const highRainDays = daily.filter(d => d.rain >= 50 || d.rainMm >= 4);
    let irrigationAdvice = {
      type: "normal",
      icon: "☀️",
      title: "No significant rain forecast this week",
      desc: "Monitor soil humidity closely and irrigate based on real-time sensor readings."
    };

    if (highRainDays.length > 0) {
      const dayNames = highRainDays.map(d => d.day).join(", ");
      const maxMm = Math.max(...highRainDays.map(d => d.rainMm));
      irrigationAdvice = {
        type: "rain",
        icon: "🌧️",
        title: `Rain expected: hold irrigation on ${dayNames}`,
        desc: `High probability of rainfall (up to ${maxMm} mm). Save water and prevent waterlogging by deferring scheduled irrigation.`
      };
    } else if (current.temp >= 30 && current.humidity <= 45) {
      irrigationAdvice = {
        type: "heat",
        icon: "🔥",
        title: "High heat & low humidity alert",
        desc: "Evaporation rate is high. Check soil moisture and consider watering during early morning or late evening."
      };
    }

    const result = {
      current,
      daily,
      irrigationAdvice,
      elevation: json.elevation,
      timezone: json.timezone,
      lat: json.latitude,
      lng: json.longitude,
      source: "Open-Meteo"
    };

    weatherCache.set(cacheKey, { timestamp: Date.now(), data: result });
    return result;
  } catch (error) {
    console.warn("Falling back to local weather data:", error.message);
    return getFallbackWeather();
  }
}

export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      { headers: { "Accept-Language": "en" } }
    );
    if (!res.ok) throw new Error("Geocode error");
    const data = await res.json();
    const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || data.address?.state;
    const country = data.address?.country;
    if (city && country) return `${city}, ${country}`;
    if (city) return city;
    return `${Number(lat).toFixed(4)}°, ${Number(lng).toFixed(4)}°`;
  } catch {
    return `${Number(lat).toFixed(4)}°, ${Number(lng).toFixed(4)}°`;
  }
}

function getFallbackWeather() {
  const days = ["Today", "Tomorrow", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return {
    current: {
      temp: 24,
      apparentTemp: 25,
      humidity: 58,
      wind: 11,
      precipitation: 0,
      code: 1,
      condition: "Mainly clear",
      icon: "🌤️",
      timestamp: new Date().toISOString()
    },
    daily: days.map((day, i) => ({
      day,
      date: new Date(Date.now() + i * 86400000).toISOString().split("T")[0],
      code: i === 2 ? 61 : 1,
      icon: i === 2 ? "🌧️" : "🌤️",
      condition: i === 2 ? "Rain showers" : "Partly sunny",
      high: 26 - i % 3,
      low: 16 + i % 2,
      rain: i === 2 ? 65 : 15,
      rainMm: i === 2 ? 8.4 : 0.5,
      humidity: 55 + (i * 4) % 20,
      wind: 10 + i
    })),
    irrigationAdvice: {
      type: "normal",
      icon: "☀️",
      title: "No significant rain forecast this week",
      desc: "Monitor soil humidity closely and irrigate based on sensor readings."
    },
    source: "Fallback offline"
  };
}
