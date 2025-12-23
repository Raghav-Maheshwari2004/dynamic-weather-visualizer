import React, { useState } from "react";
import { Gauge, Navigation } from "lucide-react";

export default function SceneBalloon({ weather, isDay, intensity, realData }: any) {
  const [hoveredBalloon, setHoveredBalloon] = useState<number | null>(null);

  // Colors based on Day/Night for environment
  const mtColor1 = isDay ? "#cbd5e1" : "#1e293b"; // Back
  const mtColor2 = isDay ? "#94a3b8" : "#0f172a"; // Middle
  const mtColor3 = isDay ? "#64748b" : "#020617"; // Front

  // Balloon Colors (Red palette matching the image, slightly darker at night)
  const balloonMain = isDay ? "#ef4444" : "#c2410c"; // Bright red day, deeper red night
  const balloonBand = isDay ? "#b91c1c" : "#991b1b"; // Darker band
  const basketColor = isDay ? "#78350f" : "#451a03"; // Brown

  // Wind Physics
  const windSpeed = realData?.wind?.speed || 0;
  const windDeg = realData?.wind?.deg || 0;
  
  // Calculate tilt based on wind direction.
  const tiltBase = Math.sin(windDeg * (Math.PI / 180)); 
  const tiltAmount = tiltBase * Math.min(windSpeed * 1.5, 20); // Max tilt of 20 degrees

  const getTooltip = (id: number) => (
    <div className={`absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-md border border-white/20 text-white text-sm py-4 px-6 rounded-xl shadow-2xl transition-all duration-300 w-64 z-50 ${hoveredBalloon === id ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
            <Gauge size={18} className="text-blue-400"/>
            <span className="font-bold text-base tracking-wide">Atmospheric Data</span>
        </div>
        <div className="flex justify-between items-center mb-2">
            <span className="text-slate-400">Visibility</span>
            <span className="font-bold text-white">{realData ? (realData.visibility/1000).toFixed(1) : 0} km</span>
        </div>
        <div className="flex justify-between items-center mb-2">
            <span className="text-slate-400">Wind Speed</span>
            <span className="font-bold text-blue-200">{windSpeed} m/s</span>
        </div>
        <div className="flex justify-between items-center">
            <span className="text-slate-400">Wind Dir.</span>
            <div className="flex items-center gap-2 font-bold text-blue-200">
                {realData ? getCardinal(windDeg) : "-"} ({windDeg}°)
                <Navigation size={12} style={{transform: `rotate(${windDeg}deg)`}} />
            </div>
        </div>
    </div>
  );

  const getCardinal = (angle: number) => { const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']; return directions[Math.round(angle / 45) % 8]; };

  // Shared SVG Structure for the new simple balloon shape
  const SimpleBalloonSVG = ({ className }: { className: string }) => (
    <svg viewBox="0 0 100 120" className={className}>
        {/* Balloon Body - Simple Ellipse */}
        <ellipse cx="50" cy="45" rx="40" ry="42" fill={balloonMain} />
        {/* Balloon Band - Simple curved path overlay */}
        <path d="M10,45 Q50,35 90,45 Q90,55 50,65 Q10,55 10,45 Z" fill={balloonBand} opacity="0.6" />

        {/* Ropes */}
        <line x1="35" y1="83" x2="42" y2="100" stroke={basketColor} strokeWidth="2" />
        <line x1="65" y1="83" x2="58" y2="100" stroke={basketColor} strokeWidth="2" />

        {/* Basket - Simple Rectangle */}
        <rect x="42" y="100" width="16" height="12" rx="2" fill={basketColor} />
    </svg>
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <style jsx>{`
        @keyframes float-bob { 0%, 100% { transform: translateY(0) rotate(${tiltAmount}deg); } 50% { transform: translateY(-15px) rotate(${tiltAmount - 2}deg); } }
        @keyframes float-drift { 0% { transform: translateX(0); } 50% { transform: translateX(20px); } 100% { transform: translateX(0); } }
      `}</style>

      {/* MOUNTAINS LAYERS */}
      <div className="absolute bottom-0 w-full h-[50vh]">
        {/* Layer 1 (Back) */}
        <svg className="absolute bottom-0 w-full h-full text-slate-300" preserveAspectRatio="none" viewBox="0 0 1440 320">
            <path fill={mtColor1} d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,197.3C1248,171,1344,149,1392,138.7L1440,128L1440,320L0,320Z"></path>
        </svg>
        {/* Layer 2 (Middle) */}
        <svg className="absolute bottom-0 w-full h-[90%] text-slate-400" preserveAspectRatio="none" viewBox="0 0 1440 320">
             <path fill={mtColor2} d="M0,192L60,186.7C120,181,240,171,360,176C480,181,600,203,720,197.3C840,192,960,160,1080,165.3C1200,171,1320,213,1380,234.7L1440,256L1440,320L0,320Z"></path>
        </svg>
        {/* Layer 3 (Front) */}
        <svg className="absolute bottom-0 w-full h-[80%]" preserveAspectRatio="none" viewBox="0 0 1440 320">
            <path fill={mtColor3} d="M0,160L60,186.7C120,213,240,267,360,261.3C480,256,600,192,720,165.3C840,139,960,149,1080,170.7C1200,192,1320,224,1380,240L1440,256L1440,320L0,320Z"></path>
        </svg>
      </div>

      {/* --- BALLOON LAYERS (Using the new simple shape) --- */}

      {/* 3. Far-Distant Balloon (Smallest, Slowest) */}
      <div 
        className="absolute top-[25%] left-[15%] z-[28] cursor-pointer pointer-events-auto group"
        onMouseEnter={() => setHoveredBalloon(3)}
        onMouseLeave={() => setHoveredBalloon(null)}
        onClick={() => setHoveredBalloon(hoveredBalloon === 3 ? null : 3)}
        style={{ animation: `float-bob ${8 - windSpeed/5}s ease-in-out infinite, float-drift 25s ease-in-out infinite`, transformOrigin: 'center bottom', opacity: 0.7, filter: 'blur(0.5px)' }}
      >
        <SimpleBalloonSVG className="w-12 h-auto drop-shadow-sm" />
        {getTooltip(3)}
      </div>

      {/* 2. Mid-Distance Balloon (Medium, Medium Speed) */}
      <div 
        className="absolute top-[15%] right-[20%] z-[29] cursor-pointer pointer-events-auto group"
        onMouseEnter={() => setHoveredBalloon(2)}
        onMouseLeave={() => setHoveredBalloon(null)}
        onClick={() => setHoveredBalloon(hoveredBalloon === 2 ? null : 2)}
        style={{ animation: `float-bob ${7 - windSpeed/5}s ease-in-out infinite, float-drift 18s ease-in-out infinite reverse`, transformOrigin: 'center bottom', opacity: 0.9 }}
      >
        <SimpleBalloonSVG className="w-20 md:w-24 h-auto drop-shadow-md" />
        {getTooltip(2)}
      </div>

      {/* 1. Main Balloon (Largest, Fastest Bob, Foreground) */}
      <div 
        className="absolute top-[20%] left-1/2 -translate-x-1/2 z-[30] cursor-pointer pointer-events-auto group"
        onMouseEnter={() => setHoveredBalloon(1)}
        onMouseLeave={() => setHoveredBalloon(null)}
        onClick={() => setHoveredBalloon(hoveredBalloon === 1 ? null : 1)}
        style={{ animation: `float-bob ${6 - windSpeed/5}s ease-in-out infinite`, transformOrigin: 'center bottom' }}
      >
        <SimpleBalloonSVG className="w-32 md:w-40 h-auto drop-shadow-xl" />
        {getTooltip(1)}
      </div>

    </div>
  );
}