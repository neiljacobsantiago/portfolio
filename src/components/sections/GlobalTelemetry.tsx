"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GitBranch, Star, Terminal, CloudLightning, Crosshair, Activity, Cpu, Link as LinkIcon, BadgeCheck } from "lucide-react";

interface Repo { id: number; name: string; description: string; html_url: string; stargazers_count: number; language: string; }
interface Weather { temperature: number; windspeed: number; }
interface Visitor { ip: string; city: string; org: string; }

export default function GlobalTelemetry() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [githubStats, setGithubStats] = useState({ followers: 0, public_repos: 0 });
  const [weather, setWeather] = useState<Weather | null>(null);
  const [visitor, setVisitor] = useState<Visitor | null>(null);

  useEffect(() => {
    // Fetch GitHub Profile
    fetch("https://api.github.com/users/neiljacobsantiago")
      .then((res) => res.json())
      .then((data) => setGithubStats({ followers: data.followers, public_repos: data.public_repos }))
      .catch(console.error);

    // Fetch Latest GitHub Repos
    fetch("https://api.github.com/users/neiljacobsantiago/repos?sort=updated&per_page=4")
      .then((res) => res.json())
      .then((data) => Array.isArray(data) && setRepos(data))
      .catch(console.error);

    // Fetch Weather for San Jose City
    fetch("https://api.open-meteo.com/v1/forecast?latitude=15.79&longitude=120.99&current_weather=true")
      .then((res) => res.json())
      .then((data) => setWeather(data.current_weather))
      .catch(console.error);

    // Fetch Visitor IP Trace
    fetch("https://ipapi.co/json/")
      .then((res) => {
        if (!res.ok) throw new Error("Rate Limited");
        return res.json();
      })
      .then((data) => setVisitor({ ip: data.ip, city: data.city, org: data.org }))
      .catch(() => setVisitor({ ip: "192.168.1.1 (MASKED)", city: "LOCAL_HOST", org: "SECURE PROXY" }));
  }, []);

  const socials = [
    { name: "GitHub", label: "@neiljacobsantiago", url: "https://github.com/neiljacobsantiago", verified: true },
    { name: "Credly", label: "Cisco Certifications", url: "#", verified: true },
    { name: "LinkedIn", label: "Professional Intel", url: "#", verified: false },
    { name: "X (Twitter)", label: "Micro-logs", url: "#", verified: false },
    { name: "Instagram", label: "Visual Telemetry", url: "#", verified: false },
    { name: "TikTok", label: "Media Directives", url: "#", verified: false }
  ];

  return (
    <section id="telemetry" className="relative z-10 w-full min-h-screen px-6 md:px-16 py-32 bg-marine border-y border-butter/10">
      <div className="max-w-7xl mx-auto">
        
        <div className="flex items-center gap-4 mb-16">
          <Activity className="w-8 h-8 text-accentRed" />
          <h2 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight">Global Telemetry</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: API Sniffers & GitHub Repos */}
          <div className="lg:col-span-8 flex flex-col gap-8">
            
            {/* The GitHub Repositories Board */}
            <div className="border border-butter/20 bg-black/40 p-6 flex-1">
              <div className="flex justify-between items-center mb-6 border-b border-butter/10 pb-4">
                <h3 className="font-mono text-xs tracking-widest uppercase text-accentRed flex items-center gap-2">
                  <Terminal className="w-4 h-4" /> Live GitHub Commits
                </h3>
                <div className="font-mono text-[10px] uppercase flex gap-4 opacity-70">
                  <span>Repos: <strong className="text-butter">{githubStats.public_repos}</strong></span>
                </div>
              </div>

              {repos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      className="group flex flex-col justify-between border border-butter/10 bg-marine/50 p-5 hover:bg-butter/5 hover:border-accentRed transition-all interactive"
                    >
                      <div>
                        <h4 className="font-display text-lg font-bold uppercase group-hover:text-accentRed transition-colors mb-2 truncate">
                          {repo.name}
                        </h4>
                        <p className="font-sans opacity-60 text-xs line-clamp-2 mb-4 h-8">
                          {repo.description || "System architecture data omitted. Root access only."}
                        </p>
                      </div>
                      <div className="flex items-center justify-between font-mono text-[10px] uppercase opacity-80 pt-3 border-t border-butter/10">
                        <span className="flex items-center gap-1.5"><GitBranch className="w-3 h-3 text-accentRed" /> Main</span>
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1"><Star className="w-3 h-3 text-butter" /> {repo.stargazers_count}</span>
                          <span className="text-butter">{repo.language || "Shell"}</span>
                        </div>
                      </div>
                    </motion.a>
                  ))}
                </div>
              ) : (
                <div className="font-mono text-accentRed animate-pulse text-sm py-8 text-center border border-dashed border-accentRed/30">
                  Synchronizing with GitHub API...
                </div>
              )}
            </div>

            {/* Social / External Nodes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {socials.map((social, i) => (
                <motion.a 
                  key={i} 
                  href={social.url} 
                  target="_blank"
                  initial={{ opacity: 0, scale: 0.95 }} 
                  whileInView={{ opacity: 1, scale: 1 }} 
                  viewport={{ once: true }} 
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between p-4 border border-butter/10 bg-black/40 hover:bg-butter/10 hover:border-butter/50 transition-all interactive group"
                >
                  <div>
                    <h4 className="font-display font-bold uppercase text-sm group-hover:text-accentRed transition-colors flex items-center gap-2">
                      {social.name} {social.verified && <BadgeCheck className="w-3 h-3 text-green-500" />}
                    </h4>
                    <p className="font-mono text-[9px] uppercase opacity-50 mt-1 tracking-widest">{social.label}</p>
                  </div>
                  <LinkIcon className="w-4 h-4 opacity-30 group-hover:opacity-100 group-hover:text-accentRed transition-all" />
                </motion.a>
              ))}
            </div>

          </div>

          {/* RIGHT: Passive Scanners */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} className="border border-butter/20 bg-black/40 p-6 relative overflow-hidden group flex-1">
              <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity"><CloudLightning className="w-24 h-24 text-butter" /></div>
              <h3 className="font-mono text-xs tracking-widest uppercase text-accentRed mb-4 flex items-center gap-2"><Cpu className="w-4 h-4" /> Host Environment</h3>
              <p className="font-display text-2xl font-bold uppercase mb-1">San Jose City, PH</p>
              <p className="font-sans opacity-70 text-sm mb-4 border-b border-butter/10 pb-4">Central Luzon Infrastructure</p>
              {weather ? (
                <div className="grid grid-cols-2 gap-4 font-mono">
                  <div><span className="block text-[10px] opacity-50 uppercase tracking-wider mb-1">Thermal</span><span className="text-2xl font-bold text-butter">{weather.temperature}°C</span></div>
                  <div><span className="block text-[10px] opacity-50 uppercase tracking-wider mb-1">Velocity</span><span className="text-2xl font-bold text-butter">{weather.windspeed} <span className="text-xs">km/h</span></span></div>
                </div>
              ) : (<div className="font-mono text-sm opacity-50 animate-pulse">Establishing uplink...</div>)}
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }} className="border border-accentRed/40 bg-accentRed/5 p-6 relative group flex-1">
              <h3 className="font-mono text-xs tracking-widest uppercase text-accentRed mb-4 flex items-center gap-2"><Crosshair className="w-4 h-4" /> Incoming Trace</h3>
              {visitor ? (
                <div className="font-mono text-sm space-y-3">
                  <div className="flex justify-between border-b border-butter/10 pb-2"><span className="text-[10px] opacity-60 uppercase">Origin IP</span><span className="text-accentRed font-bold">{visitor.ip}</span></div>
                  <div className="flex justify-between border-b border-butter/10 pb-2"><span className="text-[10px] opacity-60 uppercase">Routing City</span><span className="text-butter">{visitor.city}</span></div>
                  <div className="flex justify-between pb-1"><span className="text-[10px] opacity-60 uppercase">ISP / Org</span><span className="text-butter truncate max-w-[150px] text-right" title={visitor.org}>{visitor.org}</span></div>
                </div>
              ) : (<div className="font-mono text-sm opacity-50 animate-pulse">Bypassing limiters...</div>)}
            </motion.div>
          </div>

        </div>
      </div>
    </section>
  );
}