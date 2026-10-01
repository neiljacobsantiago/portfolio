"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GitBranch, Star, Terminal, CloudLightning, Crosshair, Activity, Cpu } from "lucide-react";

interface Repo {
  id: number;
  name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  language: string;
}

interface Weather {
  temperature: number;
  windspeed: number;
  time: string;
}

interface Visitor {
  ip: string;
  city: string;
  org: string;
}

export default function GlobalTelemetry() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [githubStats, setGithubStats] = useState({ followers: 0, public_repos: 0 });
  const [weather, setWeather] = useState<Weather | null>(null);
  const [visitor, setVisitor] = useState<Visitor | null>(null);

  useEffect(() => {
    // 1. Fetch GitHub Repos & User Stats
    fetch("https://api.github.com/users/neiljacobsantiago")
      .then((res) => res.json())
      .then((data) => setGithubStats({ followers: data.followers, public_repos: data.public_repos }))
      .catch(console.error);

    fetch("https://api.github.com/users/neiljacobsantiago/repos?sort=updated&per_page=3")
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setRepos(data))
      .catch(console.error);

    // 2. Fetch San Jose City Weather (Open-Meteo - No API Key Needed)
    // Lat: 15.79, Lon: 120.99 (San Jose, Central Luzon)
    fetch("https://api.open-meteo.com/v1/forecast?latitude=15.79&longitude=120.99&current_weather=true")
      .then((res) => res.json())
      .then((data) => setWeather(data.current_weather))
      .catch(console.error);

    // 3. Fetch Visitor IP / ISP Trace (Network Engineering theme)
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => setVisitor({ ip: data.ip, city: data.city, org: data.org }))
      .catch(() => setVisitor({ ip: "ENCRYPTED", city: "UNKNOWN", org: "PROXY DETECTED" }));
  }, []);

  return (
    <section id="telemetry" className="relative z-10 w-full min-h-screen px-6 md:px-16 py-32 bg-marine border-y border-butter/10">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-16">
          <Activity className="w-8 h-8 text-accentRed" />
          <h2 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight">
            Global Telemetry
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* LEFT COLUMN: External APIs (Weather & Visitor Trace) */}
          <div className="md:col-span-4 flex flex-col gap-6">
            
            {/* Host Environment Panel */}
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="border border-butter/20 bg-black/40 p-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><CloudLightning className="w-24 h-24 text-butter" /></div>
              <h3 className="font-mono text-xs tracking-widest uppercase text-accentRed mb-4 flex items-center gap-2">
                <Cpu className="w-4 h-4" /> Host Node Environment
              </h3>
              <p className="font-display text-2xl font-bold uppercase mb-1">San Jose City, PH</p>
              <p className="font-sans opacity-70 text-sm mb-4 border-b border-butter/10 pb-4">Central Luzon Infrastructure</p>
              
              {weather ? (
                <div className="grid grid-cols-2 gap-4 font-mono">
                  <div>
                    <span className="block text-[10px] opacity-50 uppercase tracking-wider mb-1">Thermal</span>
                    <span className="text-xl font-bold text-butter">{weather.temperature}°C</span>
                  </div>
                  <div>
                    <span className="block text-[10px] opacity-50 uppercase tracking-wider mb-1">Wind Velocity</span>
                    <span className="text-xl font-bold text-butter">{weather.windspeed} km/h</span>
                  </div>
                </div>
              ) : (
                <div className="font-mono text-sm opacity-50 animate-pulse">Establishing uplink...</div>
              )}
            </motion.div>

            {/* Visitor IP Trace Panel */}
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="border border-accentRed/40 bg-accentRed/5 p-6 relative group">
              <h3 className="font-mono text-xs tracking-widest uppercase text-accentRed mb-4 flex items-center gap-2">
                <Crosshair className="w-4 h-4" /> Incoming Connection Trace
              </h3>
              
              {visitor ? (
                <div className="font-mono text-sm space-y-3">
                  <div className="flex justify-between items-end border-b border-butter/10 pb-2">
                    <span className="text-[10px] opacity-60 uppercase">Origin IP</span>
                    <span className="text-accentRed font-bold">{visitor.ip}</span>
                  </div>
                  <div className="flex justify-between items-end border-b border-butter/10 pb-2">
                    <span className="text-[10px] opacity-60 uppercase">Routing City</span>
                    <span className="text-butter">{visitor.city}</span>
                  </div>
                  <div className="flex justify-between items-end pb-1">
                    <span className="text-[10px] opacity-60 uppercase">ISP / Org</span>
                    <span className="text-butter truncate max-w-[150px] text-right">{visitor.org}</span>
                  </div>
                  <p className="text-[9px] text-accentRed uppercase mt-4 opacity-70 border border-accentRed/30 p-2 bg-black/20 text-center">
                    Network handshake logged.
                  </p>
                </div>
              ) : (
                <div className="font-mono text-sm opacity-50 animate-pulse">Running packet sniff...</div>
              )}
            </motion.div>
          </div>

          {/* RIGHT COLUMN: GitHub Repos */}
          <div className="md:col-span-8 flex flex-col">
            <div className="border border-butter/20 bg-black/40 p-6 flex-1">
              <div className="flex justify-between items-center mb-8 border-b border-butter/10 pb-4">
                <h3 className="font-mono text-xs tracking-widest uppercase text-accentRed flex items-center gap-2">
                  <Terminal className="w-4 h-4" /> GitHub Repository Logs
                </h3>
                <div className="font-mono text-[10px] uppercase flex gap-4 opacity-70">
                  <span>Repos: <strong className="text-butter">{githubStats.public_repos}</strong></span>
                  <span>Followers: <strong className="text-butter">{githubStats.followers}</strong></span>
                </div>
              </div>

              {repos.length > 0 ? (
                <div className="space-y-4">
                  {repos.map((repo, i) => (
                    <motion.a
                      href={repo.html_url}
                      target="_blank"
                      rel="noreferrer"
                      key={repo.id}
                      initial={{ opacity: 0, y: 10 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="group block border border-butter/10 bg-marine/50 p-4 hover:bg-butter/5 hover:border-butter/40 transition-all interactive flex flex-col md:flex-row justify-between md:items-center gap-4"
                    >
                      <div className="flex-1">
                        <h4 className="font-display text-xl font-bold uppercase group-hover:text-accentRed transition-colors mb-1">
                          {repo.name}
                        </h4>
                        <p className="font-sans opacity-60 text-xs truncate max-w-md">
                          {repo.description || "System architecture data omitted."}
                        </p>
                      </div>
                      <div className="flex items-center gap-4 font-mono text-[10px] uppercase opacity-80 shrink-0">
                        <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" /> Main</span>
                        <span className="flex items-center gap-1"><Star className="w-3 h-3 text-butter" /> {repo.stargazers_count}</span>
                        <span className="px-2 py-1 bg-black/40 border border-butter/20 rounded-full">{repo.language || "Shell"}</span>
                      </div>
                    </motion.a>
                  ))}
                </div>
              ) : (
                <div className="font-mono text-accentRed animate-pulse text-sm">Synchronizing with GitHub API...</div>
              )}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}