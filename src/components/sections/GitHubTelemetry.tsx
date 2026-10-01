"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GitBranch, Star, Terminal } from "lucide-react";

interface Repo {
  id: number;
  name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  language: string;
}

export default function GitHubTelemetry() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("https://api.github.com/users/neiljacobsantiago/repos?sort=updated&per_page=4")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setRepos(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("GitHub Fetch Error:", err);
        setLoading(false);
      });
  }, []);

  return (
    <section id="github" className="relative z-10 w-full min-h-screen px-6 md:px-16 py-32 bg-marine border-y border-butter/10">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-16">
          <Terminal className="w-8 h-8 text-accentRed" />
          <h2 className="font-display text-4xl md:text-6xl font-black uppercase tracking-tight">
            Live Telemetry
          </h2>
        </div>

        {loading ? (
          <div className="font-mono text-accentRed animate-pulse">Fetching remote packets...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {repos.map((repo, i) => (
              <motion.a
                href={repo.html_url}
                target="_blank"
                rel="noreferrer"
                key={repo.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group block border border-butter/20 bg-black/40 p-6 hover:bg-butter/5 hover:border-accentRed transition-all interactive"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-display text-2xl font-bold uppercase group-hover:text-accentRed transition-colors truncate pr-4">
                    {repo.name}
                  </h3>
                  <div className="flex items-center gap-3 font-mono text-xs opacity-70">
                    <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {repo.stargazers_count}</span>
                    <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" /> Main</span>
                  </div>
                </div>
                <p className="font-sans opacity-70 text-sm mb-6 h-10 overflow-hidden">
                  {repo.description || "No description provided. Root access only."}
                </p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accentRed" />
                  <span className="font-mono text-xs uppercase tracking-widest">{repo.language || "Shell"}</span>
                </div>
              </motion.a>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}