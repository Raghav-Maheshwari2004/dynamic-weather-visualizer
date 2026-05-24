import React, { useState, useEffect } from "react";
import { Globe, MapPin, Navigation, Satellite, Sun, Moon as MoonIcon } from "lucide-react";

export default function SceneOrbit({ weather, isDay, intensity, realData }: any) {
  const [hoveredElement, setHoveredElement] = useState<string | null>(null);
  const [iss, setIss] = useState<any>(null);
  const [stars, setStars] = useState<{id: number, top: number, left: number, size: number, opacity: number}[]>([]);

  useEffect(() => {
    // Generate Static Stars for background
    const newStars = Array.from({ length: 150 }).map((_, i) => ({
      id: i,
      top: Math.random() * 100,
      left: Math.random() * 100,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.8 + 0.2
    }));
    setStars(newStars);

    // Fetch ISS Data
    let isMounted = true;
    const fetchISS = async () => {
      try {
        const res = await fetch('https://api.wheretheiss.at/v1/satellites/25544');
        const data = await res.json();
        if (isMounted) setIss(data);
      } catch (e) {
        console.error("ISS Fetch failed", e);
      }
    };
    fetchISS();
    const interval = setInterval(fetchISS, 4000); // ISS moves fast, update often
    return () => { isMounted = false; clearInterval(interval); };
  }, []);

  // --- DATA MAPPING ---
  const lat = realData?.coord?.lat || 0; 
  const lon = realData?.coord?.lon || 0; 
  const clouds = realData?.clouds?.all || 0;
  const cloudOpacity = clouds / 100;

  // 1. Earth Map Coordinates (Center the longitude, pinpoint the latitude)
  const bgPosX = `${50 + (lon / 1.8)}%`;
  const bgPosY = `50%`;
  const pinY = `${50 - (lat / 90) * 50}%`;

  // --- ASTRONOMY (SUN & MOON 3D PROJECTION) ---
  const utcHours = new Date().getUTCHours() + new Date().getUTCMinutes() / 60;
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
  
  // Sun Position
  let sunLon = 180 - (utcHours * 15);
  if (sunLon < -180) sunLon += 360;
  const sunLat = -23.44 * Math.cos((360 / 365) * (dayOfYear + 10) * (Math.PI / 180));

  // Moon Position
  const lunarCycle = 29.53; 
  const knownNewMoon = new Date('2024-01-11T11:57:00Z').getTime();
  const daysSince = (Date.now() - knownNewMoon) / (1000 * 60 * 60 * 24);
  const moonPhase = (daysSince % lunarCycle) / lunarCycle; 
  let moonLon = sunLon - (moonPhase * 360);
  if (moonLon < -180) moonLon += 360;
  if (moonLon > 180) moonLon -= 360;
  const moonLat = sunLat * -1; // Stylized opposite declination

  // 3D Spherical Projection Function
  const get3DCoords = (celestialLon: number, celestialLat: number, orbitRadiusPct: number) => {
    let diff = celestialLon - lon;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    
    const theta = diff * (Math.PI / 180);
    // x and y are relative to the 100% wrapper. Center is 50%.
    const x = 50 + Math.sin(theta) * orbitRadiusPct; 
    const y = 50 - (celestialLat / 90) * orbitRadiusPct; 
    const z = Math.cos(theta); 
    
    // Z-index: > 0 means in front of Earth (z:20). < 0 means behind Earth (z:5). Globe is z:10.
    const zIndex = z > 0 ? 20 : 5; 
    const scale = 1 + (z * 0.3); 
    return { x: `${x}%`, y: `${y}%`, scale, zIndex, z };
  };

  const sun3D = get3DCoords(sunLon, sunLat, 100); // Orbits far out
  const moon3D = get3DCoords(moonLon, moonLat, 75); // Orbits closer
  const iss3D = iss ? get3DCoords(iss.longitude, iss.latitude, 52) : null; // Skims the Earth's surface (Earth radius is 50%)

  // --- TOOLTIPS ---
  const getTooltip = (id: string, title: string, icon: React.ReactNode, metrics: {label: string, value: string}[]) => (
    <div className={`absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md border border-white/20 text-white text-sm py-4 px-6 rounded-xl shadow-2xl transition-all duration-300 w-64 z-50 pointer-events-none ${hoveredElement === id ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
            {icon}
            <span className="font-bold text-base tracking-wide">{title}</span>
        </div>
        {metrics.map((m, i) => (
            <div key={i} className="flex justify-between items-center mb-2 last:mb-0">
                <span className="text-slate-400">{m.label}</span>
                <span className="font-bold text-white text-right">{m.value}</span>
            </div>
        ))}
    </div>
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden bg-[#020617]">
      <style jsx>{`
        @keyframes orbit { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .animate-orbit { animation: orbit 120s linear infinite; }
        @keyframes pulse-ring { 0% { transform: scale(0.9); opacity: 0.5; } 50% { transform: scale(1.1); opacity: 0.8; } 100% { transform: scale(0.9); opacity: 0.5; } }
        .animate-pulse-ring { animation: pulse-ring 4s ease-in-out infinite; }
      `}</style>

      {/* BACKGROUND LAYER */}
      <div className="absolute inset-0 z-[1] bg-[radial-gradient(circle_at_center,rgba(15,23,42,0)_0%,#000000_100%)] opacity-80" />
      <div className="absolute inset-0 z-[2]">
        {stars.map(s => (
           <div key={s.id} className="absolute bg-white rounded-full" style={{ left: `${s.left}%`, top: `${s.top}%`, width: `${s.size}px`, height: `${s.size}px`, opacity: s.opacity }} />
        ))}
      </div>

      {/* 3D ORBIT WRAPPER */}
      {/* This wrapper ensures all 3D projected elements (ISS, Earth) scale together */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] h-[90vw] max-w-[800px] max-h-[800px] z-[10] perspective-[1000px]">

         {/* --- 3. THE ISS (Satellite) --- */}
         {iss && iss3D && (
            <div 
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 pointer-events-auto cursor-help group/iss"
              style={{ left: iss3D.x, top: iss3D.y, zIndex: iss3D.zIndex, transform: `scale(${iss3D.scale})`, opacity: iss3D.z < 0 ? 0 : 1 }}
              onMouseEnter={() => setHoveredElement('iss')}
              onMouseLeave={() => setHoveredElement(null)}
            >
               <div className="relative">
                  <Satellite size={28} className="text-green-400 drop-shadow-[0_0_15px_#4ade80]" />
               </div>
               <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2">
                   {getTooltip('iss', 'ISS Tracker', <Satellite size={18} className="text-green-400"/>, [
                       { label: 'Altitude', value: `${Math.round(iss.altitude)} km` },
                       { label: 'Velocity', value: `${Math.round(iss.velocity)} km/h` },
                       { label: 'Lat / Lon', value: `${iss.latitude.toFixed(2)}°, ${iss.longitude.toFixed(2)}°` }
                   ])}
               </div>
            </div>
         )}

         {/* --- 4. THE EARTH GLOBE --- */}
         {/* Radius is exactly 50% of the wrapper (inset-0 rounded-full) */}
         <div className="absolute inset-0 rounded-full z-[10] shadow-[inset_-40px_-40px_100px_rgba(0,0,0,0.9),inset_20px_20px_50px_rgba(255,255,255,0.2),0_0_100px_rgba(56,189,248,0.4)] bg-[#0284c7] overflow-hidden"
              style={{
                  backgroundImage: 'url("https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg")',
                  backgroundSize: '200% 100%',
                  backgroundPosition: `${bgPosX} ${bgPosY}`,
                  transition: 'background-position 2s ease-in-out'
              }}
         >
            {/* CLOUDS */}
            <div 
              className="absolute inset-0 rounded-full mix-blend-screen opacity-90 transition-opacity duration-1000"
              style={{ 
                  opacity: Math.max(0.2, cloudOpacity), 
                  backgroundImage: 'url("https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png")',
                  backgroundSize: '200% 100%',
                  backgroundPosition: `${bgPosX} ${bgPosY}`,
                  transition: 'background-position 2s ease-in-out',
              }}
            />

            {/* DYNAMIC SUNLIGHT/SHADOW TERMINATOR */}
            {/* The earth darkens smoothly based on the exact Z coordinate of the Sun object */}
            <div className="absolute inset-0 rounded-full mix-blend-multiply transition-all duration-1000 pointer-events-none"
                 style={{
                     background: `linear-gradient(${sun3D.z > 0 ? 110 : 250}deg, rgba(0,0,0,0) 0%, rgba(0,0,0,${sun3D.z < -0.5 ? 0.95 : 0.6}) 100%)`,
                 }}
            />

            {/* NIGHT LIGHTS (Visible only where dark) */}
            <div 
              className="absolute inset-0 rounded-full pointer-events-none mix-blend-screen opacity-80"
              style={{
                  backgroundImage: 'url("https://unpkg.com/three-globe/example/img/earth-night.jpg")',
                  backgroundSize: '200% 100%',
                  backgroundPosition: `${bgPosX} ${bgPosY}`,
                  transition: 'background-position 2s ease-in-out',
                  // Simply reveal night lights based on the sun's Z index (if sun is behind, earth is dark, lights go on)
                  opacity: sun3D.z < 0 ? 0.9 : 0.2
              }}
            />

            {/* LOCATION TARGET PIN */}
            <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none transition-all duration-1000 z-[30]" style={{ top: pinY }}>
                <div className="absolute w-8 h-8 rounded-full border border-blue-400 animate-pulse-ring" />
                <div className="absolute w-12 h-12 rounded-full border border-blue-400/30 animate-pulse-ring" style={{ animationDelay: '1s' }} />
                <MapPin size={24} className="text-blue-400 drop-shadow-[0_0_10px_#60a5fa] -translate-y-3" />
            </div>
         </div>

      </div>

      {/* SATELLITE HUD OVERLAYS (Bottom Left Corner) */}
      <div className="absolute bottom-12 left-12 z-[50] pointer-events-auto cursor-help group"
           onMouseEnter={() => setHoveredElement('sat')}
           onMouseLeave={() => setHoveredElement(null)}
      >
          <div className="relative w-32 h-32 opacity-70 group-hover:opacity-100 transition-opacity">
              <svg viewBox="0 0 100 100" className="w-full h-full animate-orbit">
                  <circle cx="50" cy="50" r="45" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="4 8" />
                  <circle cx="50" cy="50" r="35" fill="none" stroke="#0284c7" strokeWidth="2" strokeDasharray="20 10" />
                  <line x1="50" y1="0" x2="50" y2="100" stroke="#0ea5e9" strokeWidth="0.5" opacity="0.5" />
                  <line x1="0" y1="50" x2="100" y2="50" stroke="#0ea5e9" strokeWidth="0.5" opacity="0.5" />
                  <polygon points="50,2 53,8 47,8" fill="#38bdf8" />
              </svg>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-mono text-[10px] text-sky-400 text-center leading-tight">
                  SAT<br/>UPLINK
              </div>
          </div>
          
          <div className="absolute bottom-full left-0 mb-4">
            {getTooltip('sat', 'Satellite Status', <Navigation size={18} className="text-sky-400"/>, [
                { label: 'Altitude', value: 'Low Earth Orbit' },
                { label: 'Wind Vector', value: `${realData?.wind?.speed || 0}m/s @ ${realData?.wind?.deg || 0}°` },
                { label: 'Status', value: 'Active Tracking' }
            ])}
          </div>
      </div>
      
    </div>
  );
}
