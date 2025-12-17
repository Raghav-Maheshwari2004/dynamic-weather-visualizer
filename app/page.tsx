"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, MapPin, Wind, Eye, Droplets, Sunrise, Sunset, Gauge, Sun, CloudRain, Moon, Compass, Thermometer, Activity, Globe, Clock, Cloud, Navigation, Menu, X, Plus, GripHorizontal, Waves, LayoutDashboard } from "lucide-react";

// --- API CONFIG ---
const API_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY || "";

// --- TYPES ---
type WeatherType = "clear" | "cloudy" | "rain" | "storm" | "snow";
type WidgetType = "temp" | "wind" | "astro" | "atmos" | "aqi" | "location";
type ViewMode = "hud" | "dashboard";

interface WidgetInstance {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  zIndex: number;
}

// --- ASSETS ---
const boatPaths = {
  mainsail: "M62,10 L62,95 Q105,90 110,85 Z",
  jib: "M58,15 L58,95 L15,90 Z",
  hull: "M10,110 Q60,135 110,110 L108,105 L12,105 Z",
  deck: "M12,105 L108,105 L105,100 L15,100 Z",
  mastBoom: "M58,5 L62,5 L62,100 L110,95 L110,98 L62,103 L58,103 Z"
};

const wavePaths = {
  typeA: "M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,181.3C960,181,1056,235,1152,234.7C1248,235,1344,181,1392,154.7L1440,192L1440,320L0,320Z",
  typeB: "M0,64L48,80C96,96,192,128,288,128C384,128,480,96,576,90.7C672,85,768,107,864,128C960,149,1056,171,1152,165.3C1248,160,1344,128,1392,112L1440,64L1440,320L0,320Z",
  typeC: "M0,128L60,138.7C120,149,240,171,360,165.3C480,160,600,128,720,112C840,96,960,96,1080,112C1200,128,1320,160,1380,176L1440,192L1440,320L0,320Z"
};

const cloudPath = "M25,60 Q35,45 50,50 Q60,35 75,45 Q90,40 100,55 Q115,55 115,75 Q115,95 95,95 L35,95 Q10,95 10,75 Q10,60 25,60 Z";

const THEMES = {
  day: {
    clear: { sky: "bg-gradient-to-b from-[#0284c7] via-[#38bdf8] to-[#bae6fd]", waves: ["#7dd3fc", "#38bdf8", "#0ea5e9", "#0284c7", "#0369a1"] },
    cloudy: { sky: "bg-gradient-to-b from-slate-400 via-slate-300 to-slate-200", waves: ["#e2e8f0", "#cbd5e1", "#94a3b8", "#64748b", "#475569"] },
    rain: { sky: "bg-gradient-to-b from-slate-600 via-slate-500 to-slate-400", waves: ["#cbd5e1", "#94a3b8", "#64748b", "#475569", "#334155"] },
    storm: { sky: "bg-gradient-to-b from-slate-800 via-slate-700 to-slate-600", waves: ["#94a3b8", "#64748b", "#475569", "#334155", "#1e293b"] },
    snow: { sky: "bg-gradient-to-b from-slate-200 via-slate-100 to-white", waves: ["#f1f5f9", "#e2e8f0", "#cbd5e1", "#94a3b8", "#64748b"] },
    boat: { sail: "#ffffff", jib: "#f1f5f9", hull: "#a16207", deck: "#ca8a04", mast: "#78350f" }
  },
  night: {
    clear: { sky: "bg-gradient-to-b from-[#0f172a] via-[#1e1b4b] to-[#312e81]", waves: ["#6366f1", "#4f46e5", "#4338ca", "#3730a3", "#312e81"] },
    cloudy: { sky: "bg-gradient-to-b from-gray-950 via-slate-900 to-slate-800", waves: ["#64748b", "#475569", "#334155", "#1e293b", "#0f172a"] },
    rain: { sky: "bg-gradient-to-b from-slate-950 via-gray-900 to-gray-800", waves: ["#475569", "#334155", "#1e293b", "#0f172a", "#020617"] },
    storm: { sky: "bg-gradient-to-b from-black via-slate-950 to-purple-950", waves: ["#4338ca", "#3730a3", "#312e81", "#1e1b4b", "#000000"] },
    snow: { sky: "bg-gradient-to-b from-slate-900 via-slate-800 to-blue-950", waves: ["#a5f3fc", "#67e8f9", "#22d3ee", "#06b6d4", "#0891b2"] },
    boat: { sail: "#475569", jib: "#334155", hull: "#1e293b", deck: "#0f172a", mast: "#020617" }
  }
};

const layerConfig = [
  { speedBase: 35, bobSpeed: "4s",  bobDelay: "0s", path: wavePaths.typeA, opacity: 0.9, z: 10 },
  { speedBase: 28, bobSpeed: "5s",  bobDelay: "-2s", path: wavePaths.typeC, opacity: 0.85, z: 11 },
  { speedBase: 20, bobSpeed: "6s",  bobDelay: "-3s", path: wavePaths.typeA, opacity: 0.9, z: 12 },
  { speedBase: 14, bobSpeed: "3s",  bobDelay: "-1s", path: wavePaths.typeC, opacity: 0.95, z: 13 },
  { speedBase: 9,  bobSpeed: "4.5s", bobDelay: "-4s", path: wavePaths.typeB, opacity: 1.0, z: 14 },
];

export default function Home() {
  const [city, setCity] = useState("London"); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [realData, setRealData] = useState<any>(null);
  const [aqiData, setAqiData] = useState<any>(null);

  // App State
  const [viewMode, setViewMode] = useState<ViewMode>("hud");
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draggedWidget, setDraggedWidget] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Visual State
  const [isDay, setIsDay] = useState(true);
  const [weather, setWeather] = useState<WeatherType>("clear");
  const [intensity, setIntensity] = useState(3);
  const [lightning, setLightning] = useState(false);
  const [fogOpacity, setFogOpacity] = useState(0); 
  const [mounted, setMounted] = useState(false);
  
  const [clouds, setClouds] = useState<{id: number, width: number, top: number, left: number, speed: number, delay: number}[]>([]);
  const [raindrops, setRaindrops] = useState<{id: number, height: number, left: number, speed: number, delay: number, rotation: number}[]>([]);
  const [snowflakes, setSnowflakes] = useState<{id: number, size: number, left: number, speed: number, delay: number, swing: number}[]>([]);
  const [stars, setStars] = useState<{id: number, top: number, left: number, size: number, delay: number}[]>([]);
  
  // Hover/Click States (Strings for unique IDs, or null)
  const [hoveredObject, setHoveredObject] = useState<string | null>(null);
  const [hoveredDroplet, setHoveredDroplet] = useState(false);

  // --- WIDGET LOGIC ---
  const addWidget = (type: WidgetType) => {
    const id = Date.now().toString();
    const startX = (typeof window !== 'undefined' ? window.innerWidth : 800) / 2 - 128;
    const startY = (typeof window !== 'undefined' ? window.innerHeight : 600) / 2 - 100;
    setWidgets([...widgets, { id, type, x: startX, y: startY, zIndex: widgets.length + 50 }]);
    setMenuOpen(false);
  };
  const removeWidget = (id: string) => { setWidgets(widgets.filter(w => w.id !== id)); };
  const bringToFront = (id: string) => {
    const maxZ = Math.max(...widgets.map(w => w.zIndex), 50);
    setWidgets(widgets.map(w => w.id === id ? { ...w, zIndex: maxZ + 1 } : w));
  };
  const handleStart = (clientX: number, clientY: number, id: string) => {
    const widget = widgets.find(w => w.id === id); if (!widget) return;
    bringToFront(id); setDraggedWidget(id); setDragOffset({ x: clientX - widget.x, y: clientY - widget.y });
  };
  const handleMove = (clientX: number, clientY: number) => {
    if (!draggedWidget) return; setWidgets(widgets.map(w => w.id === draggedWidget ? { ...w, x: clientX - dragOffset.x, y: clientY - dragOffset.y } : w));
  };
  const handleEnd = () => { setDraggedWidget(null); };
  const handleMouseDown = (e: React.MouseEvent, id: string) => { e.preventDefault(); handleStart(e.clientX, e.clientY, id); };
  const handleMouseMove = (e: React.MouseEvent) => { handleMove(e.clientX, e.clientY); };
  const handleMouseUp = () => { handleEnd(); };
  const handleTouchStart = (e: React.TouchEvent, id: string) => { const touch = e.touches[0]; handleStart(touch.clientX, touch.clientY, id); };
  const handleTouchMove = (e: React.TouchEvent) => { if(draggedWidget) { const touch = e.touches[0]; handleMove(touch.clientX, touch.clientY); }};
  const handleTouchEnd = () => { handleEnd(); };

  // --- HELPERS ---
  const formatTime = (timestamp: number, timezone: number) => new Date((timestamp + timezone) * 1000).toLocaleTimeString('en-US', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' });
  const getMoonPhase = (date: Date) => {
    let year = date.getFullYear(); let month = date.getMonth() + 1; let day = date.getDate();
    if (month < 3) { year--; month += 12; } ++month;
    let c = 365.25 * year; let e = 30.6 * month;
    let jd = c + e + day - 694039.09; jd /= 29.5305882;
    let b = parseInt(jd.toString()); jd -= b; b = Math.round(jd * 8); if (b >= 8) b = 0;
    return ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"][b];
  };
  const getCardinal = (angle: number) => { const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']; return directions[Math.round(angle / 45) % 8]; };
  const getPrecipitationVolume = () => { if (!realData) return 0; const rain = realData.rain?.['1h'] || 0; const snow = realData.snow?.['1h'] || 0; return rain + snow; };

  // --- TEMP CALCULATION ---
  const getTempFill = () => {
    if(!realData) return 0;
    const temp = realData.main.temp;
    const min = -5;
    const max = 40;
    const pct = Math.max(0, Math.min(1, (temp - min) / (max - min)));
    return pct * 78.54; 
  };

  // --- API ---
  const fetchWeather = async (query: string) => {
    if (!query) return;
    setLoading(true); setError("");
    if (!API_KEY) { setError("Missing API key"); setLoading(false); return; }
    try {
      const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${query}&appid=${API_KEY}&units=metric`);
      if (!res.ok) throw new Error("City not found");
      const data = await res.json();
      setRealData(data);
      applyWeatherData(data);
      const { lat, lon } = data.coord;
      const aqiRes = await fetch(`https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`);
      if (aqiRes.ok) { const aqiJson = await aqiRes.json(); setAqiData(aqiJson.list?.[0]); }
    } catch (err) { setError("City not found"); } finally { setLoading(false); }
  };

  const applyWeatherData = (data: any) => {
    const now = Date.now() / 1000;
    const isDaytime = now > data.sys.sunrise && now < data.sys.sunset;
    setIsDay(isDaytime);
    const id = data.weather[0].id;
    let newWeather: WeatherType = "clear";
    if (id >= 200 && id < 300) newWeather = "storm";
    else if (id >= 300 && id < 600) newWeather = "rain";
    else if (id >= 600 && id < 700) newWeather = "snow";
    else if (id >= 801 && id < 900) newWeather = "cloudy";
    else newWeather = "clear";
    setWeather(newWeather);
    const windSpeed = data.wind.speed;
    const newIntensity = Math.min(10, Math.floor(windSpeed / 2));
    setIntensity(newIntensity);
    const visibility = data.visibility;
    const newFog = Math.max(0, Math.min(0.85, 1 - (visibility / 10000)));
    setFogOpacity(newFog);
  };

  useEffect(() => { setMounted(true); fetchWeather("London"); }, []);

  // --- GENERATORS ---
  useEffect(() => {
    if (!mounted) return;
    const count = weather === "clear" ? 1 : (weather === "cloudy" || weather === "snow") ? 8 : 12;
    const baseSpeed = 60 - (intensity * 4);
    setClouds(Array.from({ length: count }).map((_, i) => ({
      id: i, width: 100 + Math.random() * 150, top: Math.random() * 40, left: -(Math.random() * 20), speed: baseSpeed + Math.random() * 20, delay: -(Math.random() * 20)
    })));
  }, [weather, intensity, mounted]);

  useEffect(() => {
    if (!mounted) return;
    const volume = getPrecipitationVolume();
    let rainCount = 0;
    if (weather === "rain" || weather === "storm") {
      setSnowflakes([]);
      rainCount = 30 + (intensity * 10) + (volume * 20); 
      setRaindrops(Array.from({ length: Math.min(rainCount, 400) }).map((_, i) => ({
        id: i, height: 10 + Math.random() * 20, left: Math.random() * 100, speed: 0.5 + Math.random() * 0.5, delay: -(Math.random() * 2), rotation: 10 + (intensity * 2)
      })));
    } else if (weather === "snow") {
      setRaindrops([]);
      rainCount = 50 + (intensity * 10) + (volume * 20);
      setSnowflakes(Array.from({ length: Math.min(rainCount, 200) }).map((_, i) => ({
        id: i, size: 2 + Math.random() * 4, left: Math.random() * 100, speed: 3 + Math.random() * 5, delay: -(Math.random() * 10), swing: Math.random() * 20 - 10 
      })));
    } else {
        setRaindrops([]); setSnowflakes([]);
    }
  }, [weather, intensity, mounted, realData]);

  useEffect(() => {
    if (!mounted) return;
    if (isDay || weather !== "clear") { setStars([]); return; }
    setStars(Array.from({ length: 50 }).map((_, i) => ({
        id: i, top: Math.random() * 60, left: Math.random() * 100, size: Math.random() * 2 + 1, delay: Math.random() * 5
    })));
  }, [isDay, weather, mounted]);

  useEffect(() => {
    if (weather !== "storm") { setLightning(false); return; }
    const minDelay = 10000 - (intensity * 900);
    let timer: NodeJS.Timeout;
    const triggerLightning = () => {
      setLightning(true); setTimeout(() => setLightning(false), 200); 
      timer = setTimeout(triggerLightning, Math.random() * minDelay + 500);
    };
    triggerLightning(); return () => clearTimeout(timer);
  }, [weather, intensity]);

  if (!mounted) return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading Weather Engine...</div>;

  const themeGroup = isDay ? THEMES.day : THEMES.night;
  const currentTheme = themeGroup[weather];
  const isFrozen = weather === "snow";
  const stormMultiplier = weather === "storm" ? 1.5 : 1;
  const waveScaleY = (1.2 + (intensity * 0.15)) * stormMultiplier; 
  const bobHeightPx = (10 + (intensity * 8)) * stormMultiplier;
  const boatRotation = isFrozen ? 25 : intensity * 1.5; 

  const getCloudColor = () => {
    const volume = getPrecipitationVolume();
    if (volume > 2) return isDay ? '#334155' : '#1e293b'; 
    if (volume > 0.1) return isDay ? '#94a3b8' : '#475569'; 
    return isDay ? '#fff' : '#64748b'; 
  };

  const getLocalTime = () => {
    if (!realData) return "Loading...";
    const cityTimestamp = new Date().getTime() + (realData.timezone * 1000);
    const cityDate = new Date(cityTimestamp);
    return cityDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
  };

  return (
    <div 
      className="flex min-h-screen w-full overflow-hidden bg-slate-900" 
      onMouseMove={handleMouseMove} 
      onMouseUp={handleMouseUp}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      
      {/* VISUAL ENGINE */}
      <div 
        className={`absolute inset-0 transition-all duration-1000 ${currentTheme.sky}`}
        style={{ "--wave-scale-y": waveScaleY, "--bob-height-neg": `-${bobHeightPx}px` } as React.CSSProperties}
      >
        <style jsx>{`
          @keyframes wave-flow { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
          @keyframes wave-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(var(--bob-height-neg)); } }
          @keyframes sun-pulse { 0%, 100% { transform: scale(1); opacity: 0.9; } 50% { transform: scale(1.05); opacity: 1; } }
          @keyframes cloud-move { 0% { transform: translateX(-200px); } 100% { transform: translateX(100vw); } }
          @keyframes rain-drop { 0% { transform: translateY(-10vh); opacity: 0; } 20% { opacity: 1; } 100% { transform: translateY(110vh); opacity: 0; } }
          @keyframes snow-fall { 0% { transform: translateY(-10vh) translateX(0px); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(110vh) translateX(20px); opacity: 0.5; } }
          @keyframes star-twinkle { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.2); } }
          .animate-flow { animation: wave-flow linear infinite; }
          .animate-bob { animation: wave-bob ease-in-out infinite; }
          .animate-sun { animation: sun-pulse 6s ease-in-out infinite; }
          .animate-cloud { animation: cloud-move linear infinite; }
          .animate-rain { animation: rain-drop linear infinite; }
          .animate-snow { animation: snow-fall linear infinite; }
          .animate-star { animation: star-twinkle ease-in-out infinite; }
        `}</style>

        <div className="absolute inset-0 z-[2] pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.3)_100%)]" />
        <div className="absolute inset-0 bg-white z-[40] pointer-events-none transition-opacity duration-100 ease-out" style={{ opacity: lightning ? 0.6 : 0 }} />

        {/* FOG */}
        <div 
          className="absolute inset-0 z-[3] pointer-events-none transition-all duration-1000 ease-in-out"
          style={{ 
            backgroundColor: isDay ? 'rgba(255, 255, 255, 0.8)' : 'rgba(15, 23, 42, 0.9)', 
            opacity: fogOpacity,
            backdropFilter: `blur(${fogOpacity * 10}px)`
          }}
        />

        {/* CELESTIAL GROUP */}
        <div className={`absolute top-12 right-12 z-[20] transition-all duration-1000 ${weather === 'rain' || weather === 'storm' ? 'opacity-0 translate-y-10' : 'opacity-100 translate-y-0'}`}>
          
          {/* 1. THE CELESTIAL BODY (Sun/Moon) */}
          <div 
            className="relative cursor-pointer group"
            onMouseEnter={() => setHoveredObject("celestial")}
            onMouseLeave={() => setHoveredObject(null)}
            onClick={() => setHoveredObject(hoveredObject === "celestial" ? null : "celestial")}
          >
              {isDay ? (
                <div className="h-16 w-16 md:h-28 md:w-28 rounded-full bg-[radial-gradient(circle_at_30%_30%,#fef08a,#eab308)] shadow-[0_0_60px_rgba(253,224,71,0.6)] animate-sun relative z-20"></div>
              ) : (
                <div className="relative h-16 w-16 md:h-24 md:w-24 rounded-full bg-[radial-gradient(circle_at_30%_30%,#f1f5f9,#cbd5e1)] shadow-[0_0_40px_rgba(255,255,255,0.2)] overflow-hidden z-20">
                  <div className="absolute top-4 left-6 h-4 w-4 rounded-full bg-slate-400/30 shadow-inner"></div>
                </div>
              )}
              
              {/* TIME TOOLTIP */}
              <div className={`absolute top-[120%] right-0 w-max bg-slate-900/80 backdrop-blur-md border border-white/20 text-white text-sm font-medium py-3 px-5 rounded-xl shadow-2xl transition-all duration-300 pointer-events-none translate-y-2 z-50 ${hoveredObject === 'celestial' ? 'opacity-100 translate-y-0' : 'opacity-0'}`}>
                <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">Local Time</div>
                <div className="text-xl font-bold">{getLocalTime()}</div>
              </div>
          </div>

          {/* 2. THE TEMP RING (Bottom Left) */}
          <div 
             className="absolute top-1/2 left-1/2 w-[160px] h-[160px] -translate-x-[55%] -translate-y-[45%] pointer-events-auto cursor-help group/ring"
             onMouseEnter={() => setHoveredObject("temp_ring")}
             onMouseLeave={() => setHoveredObject(null)}
             onClick={() => setHoveredObject(hoveredObject === "temp_ring" ? null : "temp_ring")}
          >
             <svg viewBox="0 0 120 120" className="w-full h-full">
                <path 
                    d="M 60 110 A 50 50 0 0 1 10 60" 
                    fill="none" 
                    stroke="rgba(255,255,255,0.15)" 
                    strokeWidth="8" 
                    strokeLinecap="round"
                />
                
                <path 
                    d="M 60 110 A 50 50 0 0 1 10 60" 
                    fill="none" 
                    stroke="url(#tempGradient)" 
                    strokeWidth="8" 
                    strokeLinecap="round"
                    strokeDasharray="78.54" 
                    strokeDashoffset={78.54 - getTempFill()} 
                    className="transition-all duration-1000 ease-out"
                />
                
                <defs>
                    <linearGradient id="tempGradient" x1="0" y1="1" x2="0" y2="0">
                        <stop offset="0%" stopColor="#facc15" />
                        <stop offset="100%" stopColor="#ef4444" />
                    </linearGradient>
                </defs>
             </svg>

             {/* TEMP TOOLTIP */}
             <div className={`absolute top-full right-full mr-2 w-max bg-slate-900/90 backdrop-blur-md border border-red-500/30 text-white text-sm font-medium py-2 px-4 rounded-xl shadow-2xl transition-opacity duration-300 pointer-events-none z-50 ${hoveredObject === 'temp_ring' ? 'opacity-100' : 'opacity-0'}`}>
                <div className="flex items-center gap-2">
                    <Thermometer size={16} className="text-red-400"/>
                    <div>
                        <div className="text-[10px] text-slate-400 uppercase">Temperature</div>
                        <div className="text-lg font-bold text-red-100">{realData ? Math.round(realData.main.temp) : "--"}°C</div>
                    </div>
                </div>
             </div>
          </div>

        </div>

        <div className="absolute inset-0 z-0 pointer-events-none">
          {stars.map((star) => (
            <div key={star.id} className="absolute bg-white rounded-full animate-star" style={{ top: `${star.top}%`, left: `${star.left}%`, width: `${star.size}px`, height: `${star.size}px`, animationDuration: `${2 + star.delay}s` }} />
          ))}
        </div>

        {/* CLOUDS WITH TOOLTIP */}
        <div className="absolute inset-0 z-[5] pointer-events-none overflow-hidden">
          {clouds.map((cloud) => (
            <div
                key={cloud.id}
                className="absolute pointer-events-auto cursor-help animate-cloud group/cloud"
                style={{
                    width: `${cloud.width}px`,
                    top: `${cloud.top}%`,
                    left: `${cloud.left}%`,
                    animationDuration: `${cloud.speed}s`,
                    animationDelay: `${cloud.delay}s`
                }}
            >
                <svg viewBox="0 0 120 100" className="w-full h-full transition-colors duration-1000" style={{ color: getCloudColor() }}>
                    <path fill="currentColor" d={cloudPath} />
                </svg>
                
                {/* Cloud Tooltip: Hover only on desktop, auto-handled by click elsewhere */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max bg-slate-900/80 backdrop-blur-md border border-white/20 text-white text-xs py-1.5 px-3 rounded-lg opacity-0 group-hover/cloud:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                    <span className="font-bold flex items-center gap-1">
                        <CloudRain size={10} className="text-blue-300"/>
                        {getPrecipitationVolume() > 0 ? `${getPrecipitationVolume()} mm` : "No Rain"}
                    </span>
                </div>
            </div>
          ))}
        </div>

        <div className="absolute inset-0 z-[20] pointer-events-none overflow-hidden">
          {raindrops.map((drop) => (
            <div key={drop.id} className="animate-rain absolute w-[2px] bg-slate-200 opacity-40 rounded-full" style={{ height: `${drop.height}px`, left: `${drop.left}%`, animationDuration: `${drop.speed}s`, animationDelay: `${drop.delay}s`, transform: `rotate(${drop.rotation}deg)` }} />
          ))}
          {snowflakes.map((flake) => (
            <div key={flake.id} className="animate-snow absolute bg-white rounded-full opacity-80 shadow-[0_0_5px_white]" style={{ width: `${flake.size}px`, height: `${flake.size}px`, left: `${flake.left}%`, animationDuration: `${flake.speed}s`, animationDelay: `${flake.delay}s` }} />
          ))}
        </div>

        {/* BOAT */}
        <div className={`absolute bottom-[20%] md:bottom-[20%] bottom-28 left-[10%] z-[30] cursor-help group ${isFrozen ? '' : 'animate-bob'}`} style={{ animationDuration: layerConfig[2].bobSpeed, animationDelay: layerConfig[2].bobDelay, transform: isFrozen ? 'translateY(15px)' : 'none' }}>
          {/* Responsive Boat SVG: Larger on mobile to be visible/tappable */}
          <svg viewBox="0 0 120 130" className="w-40 md:w-64 h-auto drop-shadow-2xl transition-transform duration-1000 ease-in-out" style={{ transform: `rotate(${boatRotation + (weather === 'storm' && lightning ? Math.random() * 10 - 5 : 0)}deg)` }} onClick={() => setHoveredObject(hoveredObject === "boat" ? null : "boat")}>
            <g style={{ filter: isFrozen ? 'hue-rotate(180deg) saturate(0.5) brightness(1.2)' : 'none', transition: 'filter 1s' }}>
              <path d={boatPaths.mastBoom} fill={themeGroup.boat.mast} />
              <path d={boatPaths.mainsail} fill={themeGroup.boat.sail} className="origin-bottom transition-transform" style={{ transform: `scaleX(${1 + intensity * 0.06})` }}/>
              <path d={boatPaths.jib} fill={themeGroup.boat.jib} className="origin-bottom transition-transform" style={{ transform: `scaleX(${1 + intensity * 0.03})` }}/>
              <path d={boatPaths.hull} fill={themeGroup.boat.hull} />
              <path d={boatPaths.deck} fill={themeGroup.boat.deck} />
            </g>
          </svg>
          
          {/* BOAT GLASS TOOLTIP - Show on hover (desktop) OR click (mobile) */}
          <div className={`absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-md border border-white/20 text-white text-sm py-4 px-6 rounded-xl shadow-2xl transition-all duration-300 pointer-events-none translate-y-2 w-56 z-50 ${hoveredObject === 'boat' ? 'opacity-100 translate-y-0' : 'opacity-0 group-hover:opacity-100 group-hover:translate-y-0'}`}>
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
              <Wind size={18} className="text-blue-400"/>
              <span className="font-bold text-base tracking-wide">Wind Report</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400">Speed</span>
              <span className="font-bold text-blue-200">{realData ? realData.wind.speed : 0} m/s</span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-slate-400">Gusts</span>
              <span className="font-bold text-blue-200">{realData && realData.wind.gust ? realData.wind.gust : "0"} m/s</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Direction</span>
              <div className="flex items-center gap-2 font-bold text-blue-200">
                 {realData ? getCardinal(realData.wind.deg) : "-"} ({realData ? realData.wind.deg : 0}°)
                 <Navigation size={12} style={{transform: `rotate(${realData ? realData.wind.deg : 0}deg)`}} />
              </div>
            </div>
          </div>
        </div>

        {/* WAVES */}
        <div className="absolute bottom-0 left-0 right-0 z-[10] w-full overflow-hidden pointer-events-none" style={{ height: '35vh', minHeight: '300px' }}>
          {/* WATER HOVER INTERACTION */}
          <div 
            className="absolute inset-0 z-[40] pointer-events-auto cursor-help group/water"
            onMouseEnter={() => setHoveredObject("water")}
            onMouseLeave={() => setHoveredObject(null)}
            onClick={() => setHoveredObject(hoveredObject === "water" ? null : "water")}
          />
          
          {/* WATER TOOLTIP */}
          <div className={`absolute bottom-20 left-1/2 -translate-x-1/2 w-max bg-slate-900/80 backdrop-blur-md border border-white/20 text-white text-sm font-medium py-3 px-5 rounded-xl shadow-2xl transition-all duration-300 pointer-events-none translate-y-4 z-50 ${hoveredObject === 'water' ? 'opacity-100 translate-y-0' : 'opacity-0'}`}>
             <div className="flex items-center gap-2 mb-2 pb-2 border-b border-white/10">
                <Waves size={18} className="text-cyan-400"/>
                <span className="font-bold tracking-wide">Location Data</span>
             </div>
             <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
                <div className="text-slate-400">Latitude</div>
                <div className="font-mono text-right">{realData ? realData.coord.lat : "--"}</div>
                <div className="text-slate-400">Longitude</div>
                <div className="font-mono text-right">{realData ? realData.coord.lon : "--"}</div>
                <div className="text-slate-400">Sea Level</div>
                <div className="font-mono text-right">{realData && realData.main.sea_level ? `${realData.main.sea_level} hPa` : "N/A"}</div>
             </div>
          </div>

          {isFrozen && <div className="absolute inset-0 z-[30] opacity-30 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay pointer-events-none" />}
          {layerConfig.map((layer, index) => (
            <div key={index} className={`absolute bottom-0 left-0 flex w-[200%] ${isFrozen ? '' : 'animate-flow'}`} style={{ height: '100%', zIndex: layer.z, animationDuration: `${layer.speedBase - intensity}s`, mixBlendMode: isDay ? "multiply" : "normal" }}>
              <div className={`w-full flex flex-nowrap origin-bottom transition-transform duration-1000 ease-out ${isFrozen ? '' : 'animate-bob'}`} style={{ height: '100%', animationDuration: layer.bobSpeed, animationDelay: layer.bobDelay, transform: `scaleY(var(--wave-scale-y))` }}>
                {[1, 2].map((i) => (
                  <svg key={i} className="w-1/2 h-full block" viewBox="0 0 1440 320" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                    <path fill={currentTheme.waves[index]} fillOpacity={layer.opacity} d={layer.path} className="transition-colors duration-1000" />
                  </svg>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================================
          HUD LAYER
          ========================================================================= */}
      <div className="absolute inset-0 z-[60] pointer-events-none">
        
        {/* TOP BAR - Responsive */}
        <div className="absolute top-6 left-6 pointer-events-auto flex items-center gap-4 flex-wrap">
          <button 
            onClick={() => setMenuOpen(!menuOpen)} 
            className="bg-slate-900/40 backdrop-blur-xl p-3 rounded-full text-white border border-white/10 hover:bg-slate-800 transition-colors shadow-2xl"
          >
            {menuOpen ? <X size={20}/> : <Menu size={20}/>}
          </button>

          <form 
            onSubmit={(e) => { e.preventDefault(); fetchWeather(city); }}
            className="flex gap-2 bg-slate-900/40 backdrop-blur-xl p-2 rounded-full border border-white/10 shadow-xl transition-all focus-within:bg-slate-900/60"
          >
            <input 
              type="text" 
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Search..."
              className="bg-transparent border-none outline-none text-white placeholder-white/70 px-4 w-32 md:w-40 font-medium"
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-full transition-colors">
              {loading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" /> : <Search size={20} />}
            </button>
            
            <div 
                className="absolute top-full left-10 flex gap-1 -mt-1 z-[-1] cursor-pointer group/drops pointer-events-auto"
                onMouseEnter={() => setHoveredDroplet(true)}
                onMouseLeave={() => setHoveredDroplet(false)}
                onClick={() => setHoveredDroplet(!hoveredDroplet)}
            >
                <svg width="40" height="20" viewBox="0 0 40 20" className="drop-shadow-sm">
                    <path d="M5,0 Q10,10 5,15 Q0,10 5,0 Z" fill="url(#dropGrad)" opacity="0.9" />
                    <path d="M20,0 Q28,15 20,20 Q12,15 20,0 Z" fill="url(#dropGrad)" opacity="1" />
                    <path d="M35,0 Q38,8 35,12 Q32,8 35,0 Z" fill="url(#dropGrad)" opacity="0.8" />
                    <defs>
                        <linearGradient id="dropGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity="1" />
                        </linearGradient>
                    </defs>
                </svg>
                <div className={`absolute top-full left-0 mt-1 bg-slate-900/90 backdrop-blur-md text-white text-xs py-2 px-3 rounded-lg border border-white/20 whitespace-nowrap transition-opacity duration-300 ${hoveredDroplet ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className="flex items-center gap-2">
                        <Droplets size={12} className="text-blue-400"/>
                        <span className="font-bold">Humidity: {realData ? realData.main.humidity : "--"}%</span>
                    </div>
                </div>
            </div>
          </form>

          {/* PERMANENT CITY DISPLAY (Hidden on very small screens if needed, mostly visible) */}
          {realData && (
            <div className="flex items-center gap-3 bg-slate-900/40 backdrop-blur-xl p-2 px-4 rounded-full border border-white/10 shadow-xl text-white hidden md:flex">
                <div className="flex items-center gap-1">
                    <MapPin size={16} className="text-blue-400"/>
                    <span className="font-bold text-sm">{realData.name}</span>
                </div>
                <div className="w-px h-4 bg-white/20"></div>
                <div className="font-mono text-lg">{Math.round(realData.main.temp)}°</div>
            </div>
          )}
        </div>

        {/* WIDGET DRAWER */}
        <div className={`absolute top-20 left-6 bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 w-64 shadow-2xl transition-all duration-300 pointer-events-auto transform origin-top-left ${menuOpen ? 'scale-100 opacity-100' : 'scale-90 opacity-0 pointer-events-none'}`}>
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Available Instruments</div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[
              { id: 'temp', label: 'Temp', icon: Thermometer },
              { id: 'wind', label: 'Wind', icon: Wind },
              { id: 'astro', label: 'Astro', icon: Moon },
              { id: 'atmos', label: 'Atmos', icon: Gauge },
              { id: 'aqi', label: 'Air', icon: Activity },
              { id: 'location', label: 'City', icon: MapPin },
            ].map((item) => (
              <button 
                key={item.id}
                onClick={() => addWidget(item.id as WidgetType)}
                className="flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 p-3 rounded-xl border border-white/5 transition-colors gap-2 group"
              >
                <item.icon size={20} className="text-slate-300 group-hover:text-blue-400 transition-colors"/>
                <span className="text-xs text-slate-300">{item.label}</span>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"><Plus size={12} className="text-blue-400"/></div>
              </button>
            ))}
          </div>
          
          <div className="h-px bg-white/10 w-full mb-4"></div>
          
          <button 
            onClick={() => { setViewMode("dashboard"); setMenuOpen(false); }}
            className="w-full flex items-center justify-center gap-2 bg-blue-600/80 hover:bg-blue-600 p-3 rounded-xl transition-colors font-bold text-xs text-white"
          >
            <LayoutDashboard size={16}/> View Dashboard
          </button>
        </div>

        {/* --- FULL SCREEN DASHBOARD OVERLAY (Responsive Grid) --- */}
        {viewMode === "dashboard" && (
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-3xl z-[200] pointer-events-auto p-4 md:p-8 flex flex-col animate-in fade-in duration-300 overflow-y-auto">
                <div className="flex justify-between items-center mb-4 md:mb-8 flex-shrink-0">
                    <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                        <LayoutDashboard className="text-blue-400"/> Weather Station
                    </h1>
                    <button 
                        onClick={() => setViewMode("hud")}
                        className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-4 py-2 rounded-full text-white transition-colors text-sm md:text-base"
                    >
                        <X size={18}/> Close
                    </button>
                </div>
                
                {realData ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pb-8">
                        {/* MAIN CARD */}
                        <div className="bg-gradient-to-br from-blue-500/20 to-indigo-500/20 border border-white/10 p-6 rounded-3xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-6 opacity-20"><MapPin size={80} /></div>
                            <div className="text-slate-300 uppercase text-xs font-bold tracking-widest mb-1">Current Location</div>
                            <div className="text-3xl md:text-4xl font-bold text-white mb-1">{realData.name}</div>
                            <div className="text-sm text-slate-300 mb-6">{realData.sys.country}</div>
                            <div className="text-5xl md:text-6xl font-bold text-white mb-2">{Math.round(realData.main.temp)}°</div>
                            <div className="text-lg text-blue-200 capitalize">{realData.weather[0].description}</div>
                        </div>

                        {/* ATMOSPHERE */}
                        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1">
                                <div className="text-slate-400 text-xs uppercase"><Thermometer size={14} className="inline mr-1"/> Feels Like</div>
                                <div className="text-2xl font-bold text-white">{Math.round(realData.main.feels_like)}°</div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <div className="text-slate-400 text-xs uppercase"><Droplets size={14} className="inline mr-1"/> Humidity</div>
                                <div className="text-2xl font-bold text-white">{realData.main.humidity}%</div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <div className="text-slate-400 text-xs uppercase"><Gauge size={14} className="inline mr-1"/> Pressure</div>
                                <div className="text-2xl font-bold text-white">{realData.main.pressure} hPa</div>
                            </div>
                            <div className="flex flex-col gap-1">
                                <div className="text-slate-400 text-xs uppercase"><Eye size={14} className="inline mr-1"/> Visibility</div>
                                <div className="text-2xl font-bold text-white">{(realData.visibility/1000).toFixed(1)} km</div>
                            </div>
                        </div>

                        {/* WIND */}
                        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex flex-col justify-between">
                            <div className="flex items-center gap-2 mb-4">
                                <Wind size={20} className="text-blue-400"/>
                                <span className="font-bold text-white">Wind Conditions</span>
                            </div>
                            <div className="flex justify-between items-center text-center">
                                <div>
                                    <div className="text-3xl font-bold text-white">{realData.wind.speed}</div>
                                    <div className="text-xs text-slate-400">Speed (m/s)</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-white">{realData.wind.deg}°</div>
                                    <div className="text-xs text-slate-400">Direction</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-white">{realData.wind.gust || 0}</div>
                                    <div className="text-xs text-slate-400">Gusts (m/s)</div>
                                </div>
                            </div>
                        </div>

                        {/* ASTRO */}
                        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex flex-col justify-center gap-4">
                             <div className="flex justify-between items-center bg-black/20 p-4 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-500/20 rounded-full text-orange-400"><Sunrise size={20}/></div>
                                    <div>
                                        <div className="text-xs text-slate-400">Sunrise</div>
                                        <div className="text-lg font-bold text-white">{formatTime(realData.sys.sunrise, realData.timezone)}</div>
                                    </div>
                                </div>
                             </div>
                             <div className="flex justify-between items-center bg-black/20 p-4 rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-purple-500/20 rounded-full text-purple-400"><Sunset size={20}/></div>
                                    <div>
                                        <div className="text-xs text-slate-400">Sunset</div>
                                        <div className="text-lg font-bold text-white">{formatTime(realData.sys.sunset, realData.timezone)}</div>
                                    </div>
                                </div>
                             </div>
                        </div>

                        {/* AQI & RAIN */}
                        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl grid grid-cols-1 gap-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Activity size={20} className="text-green-400"/>
                                    <span className="font-bold text-white">Air Quality</span>
                                </div>
                                <div className="text-2xl font-bold text-green-300">{aqiData ? aqiData.main.aqi : "--"} <span className="text-sm text-slate-400">/ 5</span></div>
                            </div>
                            <div className="h-px bg-white/10 w-full"/>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CloudRain size={20} className="text-blue-400"/>
                                    <span className="font-bold text-white">Precipitation (1h)</span>
                                </div>
                                <div className="text-2xl font-bold text-blue-300">{getPrecipitationVolume()} mm</div>
                            </div>
                        </div>

                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-500">Loading Dashboard Data...</div>
                )}
            </div>
        )}

        {/* ACTIVE WIDGETS (Only visible in HUD mode) */}
        {viewMode === "hud" && widgets.map((widget) => (
          <div
            key={widget.id}
            className={`absolute pointer-events-auto transition-transform duration-100 ease-out ${draggedWidget === widget.id ? 'scale-105 z-[100]' : 'scale-100'}`}
            style={{ 
              left: widget.x, 
              top: widget.y,
              zIndex: widget.zIndex,
              touchAction: 'none',
              cursor: draggedWidget === widget.id ? 'grabbing' : 'grab'
            }}
            onMouseDown={(e) => handleMouseDown(e, widget.id)}
            onTouchStart={(e) => handleTouchStart(e, widget.id)}
          >
            {/* ULTRA-GLASSMORPHIC CONTAINER */}
            <div className={`backdrop-blur-2xl border border-white/10 rounded-2xl overflow-hidden w-64 group transition-shadow duration-300 ${draggedWidget === widget.id ? 'shadow-[0_20px_50px_0_rgba(0,0,0,0.5)] bg-slate-900/50' : 'shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] bg-slate-900/20'}`}>
              
              {/* SLIM DRAG HEADER */}
              <div className="bg-white/5 h-6 flex justify-between items-center px-2 cursor-grab active:cursor-grabbing border-b border-white/5">
                <GripHorizontal size={12} className="text-slate-500 opacity-50 group-hover:opacity-100 transition-opacity"/>
                <button onClick={(e) => { e.stopPropagation(); removeWidget(widget.id); }} className="text-slate-500 hover:text-red-400 transition-colors">
                  <X size={12}/>
                </button>
              </div>
              
              {/* CONTENT */}
              <div className="p-4 relative">
                {/* Inner Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/5 to-transparent pointer-events-none" />
                
                {widget.type === 'temp' && (
                  <div className="flex flex-col items-center relative z-10">
                    <Thermometer size={24} className="text-orange-400 mb-2"/>
                    <div className="text-3xl font-bold text-white drop-shadow-md">{realData ? Math.round(realData.main.temp) : "--"}°</div>
                    <div className="text-xs text-slate-300">Feels like {realData ? Math.round(realData.main.feels_like) : "--"}°</div>
                  </div>
                )}
                {widget.type === 'wind' && (
                  <div className="flex flex-col items-center text-center relative z-10">
                    <Wind size={24} className="text-blue-400 mb-2"/>
                    <div className="text-2xl font-bold text-white drop-shadow-md">{realData ? realData.wind.speed : "--"} <span className="text-sm font-normal text-slate-300">m/s</span></div>
                    <div className="flex items-center gap-1 text-xs text-slate-300 mt-1">
                      <Compass size={12} style={{transform: `rotate(${realData ? realData.wind.deg : 0}deg)`}}/>
                      {realData ? getCardinal(realData.wind.deg) : "-"}
                    </div>
                  </div>
                )}
                {widget.type === 'astro' && (
                  <div className="flex flex-col items-center text-center gap-2 relative z-10">
                    <div className="flex justify-between w-full text-xs text-slate-300">
                      <div className="flex items-center gap-1"><Sunrise size={12}/> {realData ? formatTime(realData.sys.sunrise, realData.timezone) : "--"}</div>
                      <div className="flex items-center gap-1"><Sunset size={12}/> {realData ? formatTime(realData.sys.sunset, realData.timezone) : "--"}</div>
                    </div>
                    <div className="h-px w-full bg-white/10"/>
                    <div className="flex items-center gap-2 text-xs text-indigo-300">
                      <Moon size={14}/> {getMoonPhase(new Date())}
                    </div>
                  </div>
                )}
                {widget.type === 'atmos' && (
                  <div className="grid grid-cols-2 gap-4 text-center relative z-10">
                    <div>
                      <Gauge size={20} className="text-emerald-400 mx-auto mb-1"/>
                      <div className="text-lg font-bold text-white drop-shadow-sm">{realData ? realData.main.pressure : "--"}</div>
                      <div className="text-[10px] text-slate-300">hPa</div>
                    </div>
                    <div>
                      <Eye size={20} className="text-blue-400 mx-auto mb-1"/>
                      <div className="text-lg font-bold text-white drop-shadow-sm">{realData ? (realData.visibility/1000).toFixed(1) : "--"}</div>
                      <div className="text-[10px] text-slate-300">km</div>
                    </div>
                  </div>
                )}
                {widget.type === 'aqi' && (
                  <div className="flex flex-col items-center relative z-10">
                    <Activity size={24} className="text-green-400 mb-2"/>
                    <div className="text-2xl font-bold text-white drop-shadow-md">{aqiData ? aqiData.main.aqi : "--"} <span className="text-sm font-normal text-slate-300">/ 5</span></div>
                    <div className="text-xs text-slate-300 mt-1">Air Quality Index</div>
                  </div>
                )}
                {widget.type === 'location' && (
                  <div className="flex flex-col items-center text-center relative z-10">
                    <MapPin size={24} className="text-red-400 mb-2"/>
                    <div className="text-xl font-bold text-white drop-shadow-md">{realData ? realData.name : "Select City"}</div>
                    <div className="text-xs text-slate-300">{realData ? realData.sys.country : "--"}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">{realData ? `${realData.coord.lat}, ${realData.coord.lon}` : ""}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

      </div>

    </div>
  );
}