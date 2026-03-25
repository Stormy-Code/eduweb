import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Compass, 
  Backpack, 
  Share2, 
  Bookmark, 
  BookmarkCheck, 
  Loader2, 
  ChevronRight, 
  Info,
  Flame,
  Tent,
  Axe,
  Cross,
  Map as MapIcon,
  Utensils,
  Droplets,
  Shirt,
  ArrowLeft,
  Trash2,
  Check
} from 'lucide-react';
import { cn } from './lib/utils';

// --- Types ---
interface LoadoutItem {
  name: string;
  description: string;
  weight: string;
  importance: 'Visoka' | 'Srednja' | 'Niska';
}

interface LoadoutCategory {
  name: string;
  items: LoadoutItem[];
}

interface Loadout {
  id: string;
  title: string;
  description: string;
  totalWeight: string;
  categories: LoadoutCategory[];
  tips: string[];
  createdAt: number;
}

// --- Icons Map ---
const getCategoryIcon = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes('sklonište') || lower.includes('spavanje')) return <Tent className="w-4 h-4" />;
  if (lower.includes('vatra') || lower.includes('toplina')) return <Flame className="w-4 h-4" />;
  if (lower.includes('alat') || lower.includes('nož')) return <Axe className="w-4 h-4" />;
  if (lower.includes('prva pomoć') || lower.includes('zdravlje')) return <Cross className="w-4 h-4" />;
  if (lower.includes('navigacija') || lower.includes('orijentacija')) return <MapIcon className="w-4 h-4" />;
  if (lower.includes('hrana') || lower.includes('kuhanje')) return <Utensils className="w-4 h-4" />;
  if (lower.includes('voda') || lower.includes('hidracija')) return <Droplets className="w-4 h-4" />;
  if (lower.includes('odjeća') || lower.includes('obuća')) return <Shirt className="w-4 h-4" />;
  return <Backpack className="w-4 h-4" />;
};

// --- Main App Component ---
export default function App() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentLoadout, setCurrentLoadout] = useState<Loadout | null>(null);
  const [savedLoadouts, setSavedLoadouts] = useState<Loadout[]>([]);
  const [view, setView] = useState<'home' | 'saved'>('home');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [generationCount, setGenerationCount] = useState<number>(0);

  // Load saved loadouts and generation count on mount
  useEffect(() => {
    const saved = localStorage.getItem('teren_saved_loadouts');
    if (saved) {
      try {
        setSavedLoadouts(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved loadouts', e);
      }
    }

    const count = localStorage.getItem('teren_generation_count');
    // If it's the old dummy value (1247) or not set, reset to 0
    if (count && count !== '1247') {
      setGenerationCount(parseInt(count, 10));
    } else {
      setGenerationCount(0);
      localStorage.setItem('teren_generation_count', '0');
    }
  }, []);

  // Save to localStorage when updated
  useEffect(() => {
    localStorage.setItem('teren_saved_loadouts', JSON.stringify(savedLoadouts));
  }, [savedLoadouts]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setCurrentLoadout(null);

    try {
      const response = await fetch('/api/generate-loadout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || 'Greška servera pri generiranju.');
      }

      const data = payload?.loadout;
      if (!data) {
        throw new Error('Prazan odgovor od AI servisa.');
      }

      setCurrentLoadout({
        ...data,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      });

      const newCount = generationCount + 1;
      setGenerationCount(newCount);
      localStorage.setItem('teren_generation_count', newCount.toString());
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : String(err);
      const lower = message.toLowerCase();

      if (lower.includes('api ključ') || lower.includes('api key') || lower.includes('nedostaje konfiguracija')) {
        setError(message);
      } else if (
        lower.includes('403') ||
        lower.includes('unauthorized') ||
        lower.includes('forbidden') ||
        lower.includes('permission')
      ) {
        setError(
          'Autorizacija nije uspjela. API ključ je vjerojatno neispravan ili ograničen za ovu domenu.'
        );
      } else if (lower.includes('429') || lower.includes('quota') || lower.includes('rate')) {
        setError('Dosegnut je limit poziva API-ja. Pokušajte ponovno malo kasnije.');
      } else {
        setError('Došlo je do pogreške pri generiranju. Provjerite API ključ i pokušajte ponovno.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleSave = (loadout: Loadout) => {
    const isSaved = savedLoadouts.some(l => l.id === loadout.id);
    if (isSaved) {
      setSavedLoadouts(savedLoadouts.filter(l => l.id !== loadout.id));
    } else {
      setSavedLoadouts([loadout, ...savedLoadouts]);
    }
  };

  const handleShare = async (loadout: Loadout) => {
    const text = `Teren | ${loadout.title}\nUkupna težina: ${loadout.totalWeight}\n\nKategorije:\n${loadout.categories.map(c => `- ${c.name} (${c.items.length} stavki)`).join('\n')}\n\nGenerirano putem Teren AI.`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Teren - ${loadout.title}`,
          text: text,
        });
      } catch (err) {
        console.log('Share cancelled or failed', err);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isCurrentSaved = currentLoadout ? savedLoadouts.some(l => l.id === currentLoadout.id) : false;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200 font-sans selection:bg-amber-900/40">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900/50">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer group"
            onClick={() => { setView('home'); setCurrentLoadout(null); }}
          >
            <div className="w-8 h-8 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center group-hover:border-amber-500/50 transition-colors">
              <Compass className="w-4 h-4 text-amber-500" />
            </div>
            <span className="font-display font-bold tracking-wide text-lg">TEREN</span>
          </div>
          
          <button 
            onClick={() => setView(view === 'saved' ? 'home' : 'saved')}
            className="text-xs font-mono uppercase tracking-widest text-zinc-400 hover:text-zinc-100 transition-colors flex items-center gap-2"
          >
            {view === 'saved' ? (
              <>
                <ArrowLeft className="w-3 h-3" /> Nazad
              </>
            ) : (
              <>
                Spremljeno ({savedLoadouts.length})
              </>
            )}
          </button>
        </div>
      </nav>

      <main className="pt-24 pb-20 px-6 max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          {view === 'home' && !currentLoadout && (
            <motion.div 
              key="home-input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="min-h-[70vh] flex flex-col items-center justify-center max-w-2xl mx-auto text-center"
            >
              <h1 className="font-display font-bold text-4xl md:text-6xl text-zinc-100 mb-6 leading-tight">
                Pripremite se za <span className="text-amber-500 italic">divljinu.</span>
              </h1>
              <p className="text-zinc-400 mb-12 text-lg font-light">
                Opišite svoju sljedeću avanturu. Naš AI će generirati premium, optimiziran popis opreme s kalkulacijom težine.
              </p>

              <form onSubmit={handleGenerate} className="w-full relative">
                <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl blur-xl opacity-50"></div>
                <div className="relative bg-zinc-900/50 border border-zinc-800 rounded-2xl p-2 flex flex-col sm:flex-row gap-2 backdrop-blur-sm focus-within:border-amber-500/50 transition-colors">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="npr. 3 dana zimskog bushcrafta na Velebitu..."
                    className="flex-1 bg-transparent border-none outline-none px-4 py-3 text-zinc-100 placeholder:text-zinc-600 font-light"
                    disabled={isGenerating}
                  />
                  <button
                    type="submit"
                    disabled={isGenerating || !prompt.trim()}
                    className="bg-zinc-100 text-zinc-950 px-6 py-3 rounded-xl font-medium hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analiza...
                      </>
                    ) : (
                      <>
                        Generiraj <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mt-6 flex items-center justify-center gap-2 text-zinc-500 text-sm font-light"
              >
                <div className="w-2 h-2 rounded-full bg-amber-500/80 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.6)]" />
                <span>Do sada generirano <strong className="text-zinc-300 font-medium">{generationCount.toLocaleString('hr-HR')}</strong> popisa opreme</span>
              </motion.div>

              {error && (
                <motion.p 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="text-red-400 mt-6 text-sm"
                >
                  {error}
                </motion.p>
              )}
            </motion.div>
          )}

          {view === 'home' && currentLoadout && (
            <motion.div
              key="loadout-result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              {/* Header */}
              <header className="space-y-6 border-b border-zinc-900 pb-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                  <div className="space-y-4 max-w-2xl">
                    <h1 className="font-display font-bold text-4xl md:text-5xl text-zinc-100 leading-tight">
                      {currentLoadout.title}
                    </h1>
                    <p className="text-zinc-400 text-lg font-light leading-relaxed">
                      {currentLoadout.description}
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-start md:items-end gap-4 shrink-0">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center justify-center min-w-[140px]">
                      <span className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">Ukupna Težina</span>
                      <span className="font-display font-bold text-3xl text-amber-500">{currentLoadout.totalWeight}</span>
                    </div>
                    
                    <div className="flex gap-2 w-full">
                      <button 
                        onClick={() => toggleSave(currentLoadout)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 hover:bg-zinc-900 transition-colors text-sm font-medium"
                      >
                        {isCurrentSaved ? <BookmarkCheck className="w-4 h-4 text-amber-500" /> : <Bookmark className="w-4 h-4" />}
                        {isCurrentSaved ? 'Spremljeno' : 'Spremi'}
                      </button>
                      <button 
                        onClick={() => handleShare(currentLoadout)}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-zinc-800 hover:bg-zinc-900 transition-colors text-sm font-medium"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Share2 className="w-4 h-4" />}
                        {copied ? 'Kopirano' : 'Podijeli'}
                      </button>
                    </div>
                  </div>
                </div>
              </header>

              {/* Categories Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {currentLoadout.categories.map((category, idx) => (
                  <div key={idx} className="space-y-4">
                    <div className="flex items-center gap-3 border-b border-zinc-900 pb-2">
                      <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400">
                        {getCategoryIcon(category.name)}
                      </div>
                      <h2 className="font-display font-bold text-xl text-zinc-100">{category.name}</h2>
                      <span className="ml-auto text-xs font-mono text-zinc-500">{category.items.length} stavki</span>
                    </div>
                    
                    <div className="space-y-3">
                      {category.items.map((item, i) => (
                        <div key={i} className="group bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-4 hover:bg-zinc-900/80 hover:border-zinc-700 transition-all">
                          <div className="flex justify-between items-start mb-2 gap-4">
                            <h3 className="font-medium text-zinc-200 group-hover:text-amber-500 transition-colors">{item.name}</h3>
                            <span className="shrink-0 text-xs font-mono bg-zinc-950 px-2 py-1 rounded text-zinc-400 border border-zinc-800">
                              {item.weight}
                            </span>
                          </div>
                          <p className="text-sm text-zinc-500 font-light leading-relaxed mb-3">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              item.importance === 'Visoka' ? "bg-red-500" : 
                              item.importance === 'Srednja' ? "bg-amber-500" : "bg-zinc-600"
                            )} />
                            <span className="text-[10px] uppercase tracking-widest text-zinc-500">
                              {item.importance} prioritet
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tips Section */}
              <div className="bg-amber-950/20 border border-amber-900/30 rounded-2xl p-6 md:p-8 mt-12">
                <div className="flex items-center gap-3 mb-6">
                  <Info className="w-5 h-5 text-amber-500" />
                  <h2 className="font-display font-bold text-2xl text-amber-500">Stručni Savjeti</h2>
                </div>
                <ul className="space-y-4">
                  {currentLoadout.tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-4 text-zinc-300 font-light">
                      <span className="font-mono text-amber-500/50 mt-0.5">0{idx + 1}</span>
                      <p className="leading-relaxed">{tip}</p>
                    </li>
                  ))}
                </ul>
              </div>
              
              {/* Bottom Action */}
              <div className="pt-12 pb-8 flex justify-center">
                 <button 
                    onClick={() => { setView('home'); setCurrentLoadout(null); setPrompt(''); }}
                    className="text-sm font-mono uppercase tracking-widest text-zinc-400 hover:text-zinc-100 transition-colors flex items-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" /> Nova Oprema
                  </button>
              </div>
            </motion.div>
          )}

          {view === 'saved' && (
            <motion.div
              key="saved-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              <header className="border-b border-zinc-900 pb-8">
                <h1 className="font-display font-bold text-4xl text-zinc-100">Spremljena Oprema</h1>
                <p className="text-zinc-500 mt-2 font-light">Vaši prethodno generirani popisi opreme.</p>
              </header>

              {savedLoadouts.length === 0 ? (
                <div className="text-center py-20">
                  <Bookmark className="w-12 h-12 text-zinc-800 mx-auto mb-4" />
                  <p className="text-zinc-500 font-light">Nemate spremljenih popisa opreme.</p>
                  <button 
                    onClick={() => setView('home')}
                    className="mt-6 text-amber-500 hover:text-amber-400 transition-colors text-sm"
                  >
                    Generiraj novi popis &rarr;
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {savedLoadouts.map((loadout) => (
                    <div 
                      key={loadout.id} 
                      className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-6 hover:border-zinc-700 transition-colors flex flex-col"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="font-display font-bold text-xl text-zinc-100 line-clamp-2 pr-4">{loadout.title}</h3>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSavedLoadouts(savedLoadouts.filter(l => l.id !== loadout.id));
                          }}
                          className="text-zinc-600 hover:text-red-400 transition-colors shrink-0"
                          title="Ukloni"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-sm text-zinc-500 font-light line-clamp-2 mb-6 flex-1">
                        {loadout.description}
                      </p>
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-800/50">
                        <span className="text-xs font-mono text-amber-500">{loadout.totalWeight}</span>
                        <button 
                          onClick={() => {
                            setCurrentLoadout(loadout);
                            setView('home');
                          }}
                          className="text-sm text-zinc-300 hover:text-white transition-colors flex items-center gap-1"
                        >
                          Pregledaj <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
