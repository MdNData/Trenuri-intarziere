"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [trainNumber, setTrainNumber] = useState("");
  const [date, setDate] = useState("");
  const [dbStatus, setDbStatus] = useState("Se verifică conexiunea...");
  const [isConnected, setIsConnected] = useState(false);
  const [maxDateStr, setMaxDateStr] = useState("");
  
  const [savedTrains, setSavedTrains] = useState<{ trainNumber: string; trainType: string }[]>([]);
  const [filteredTrains, setFilteredTrains] = useState<{ trainNumber: string; trainType: string }[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);

  // Date validation state
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [dateError, setDateError] = useState<string | null>(null);

  const validateDate = (selectedDateStr: string, datesList: string[] = availableDates) => {
    if (!selectedDateStr) {
      setDateError(null);
      return true;
    }

    const [y, m, d] = selectedDateStr.split("-").map(Number);
    const selected = new Date(y, m - 1, d);
    selected.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // If it's today, yesterday or in the future, it is allowed
    if (selected.getTime() >= yesterday.getTime()) {
      setDateError(null);
      return true;
    }

    // Convert selected to DD.MM.YYYY format
    const dd = String(selected.getDate()).padStart(2, '0');
    const mm = String(selected.getMonth() + 1).padStart(2, '0');
    const yyyy = selected.getFullYear();
    const formatted = `${dd}.${mm}.${yyyy}`;

    // If it's in the DB, it is allowed
    if (datesList.includes(formatted)) {
      setDateError(null);
      return true;
    }

    // Otherwise, show a nice warning
    setDateError(
      `Data ${formatted} este în trecut. CFR păstrează istoricul live doar pentru azi și ieri. Deoarece nu avem această dată în baza noastră de date, nu o putem descărca.`
    );
    return false;
  };

  useEffect(() => {
    // Check DB status via API
    fetch("http://localhost:3002/health")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "ok") {
          setDbStatus("Conectat la Database 🟢");
          setIsConnected(true);
        } else {
          setDbStatus("Eroare de conexiune la Database 🔴");
        }
      })
      .catch(() => {
        setDbStatus("API Backend inaccesibil 🔴");
      });

    // Fetch registered trains for autocomplete
    fetch("http://localhost:3002/api/trains")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Keep unique trains by type + number
          const trainMap = new Map();
          data.forEach((t: any) => {
            const key = `${t.trainType}-${t.trainNumber}`;
            if (!trainMap.has(key)) {
              trainMap.set(key, { trainNumber: t.trainNumber, trainType: t.trainType });
            }
          });
          setSavedTrains(Array.from(trainMap.values()));
        }
      })
      .catch((err) => console.error("Failed to load registered trains for autocomplete", err));

    // Fetch unique dates where we already have trains saved
    fetch("http://localhost:3002/api/available-dates")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.dates)) {
          setAvailableDates(data.dates);
          // Run initial validation for default selected today's date
          const todayStr = new Date().toISOString().split("T")[0];
          validateDate(todayStr, data.dates);
        }
      })
      .catch((err) => console.error("Failed to load available dates from DB", err));

    // Set date bounds (max is today + 30 days for future schedule searches)
    const today = new Date();
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 30);

    setMaxDateStr(maxDate.toISOString().split("T")[0]);
    setDate(today.toISOString().split("T")[0]);
  }, []);

  const handleInputChange = (val: string) => {
    const cleaned = val.replace(/\s+/g, "");
    setTrainNumber(cleaned);
    
    if (cleaned.trim() === "") {
      setFilteredTrains([]);
      return;
    }

    // Filter trains matching trainNumber or trainType (e.g., IRN or 12992)
    const filtered = savedTrains.filter(
      (t) =>
        t.trainNumber.toLowerCase().includes(cleaned.toLowerCase()) ||
        t.trainType.toLowerCase().includes(cleaned.toLowerCase()) ||
        `${t.trainType}${t.trainNumber}`.toLowerCase().includes(cleaned.toLowerCase())
    );
    setFilteredTrains(filtered);
  };

  const handleSelectTrain = (number: string) => {
    setTrainNumber(number);
    setShowDropdown(false);
  };

  const handleDateChange = (val: string) => {
    setDate(val);
    validateDate(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainNumber || !date || dateError) return;

    // Clean train number to extract only digits (e.g. IRN12990 -> 12990)
    const cleanedTrainNumber = trainNumber.replace(/\D/g, "");
    if (!cleanedTrainNumber) return;

    // Convert YYYY-MM-DD to DD.MM.YYYY
    const [year, month, day] = date.split("-");
    const formattedDate = `${day}.${month}.${year}`;

    // Navigate to the dynamic train page
    router.push(`/tren/${cleanedTrainNumber}/${formattedDate}`);
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(34,211,238,0.16),_transparent_24%)]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-3 pb-8 pt-3 sm:px-6 sm:pt-4 md:px-8 lg:px-10">
      {/* Header */}
      <header className="sticky top-2 z-20 mb-3 rounded-2xl border border-zinc-900/80 bg-zinc-950/80 px-3 py-3 backdrop-blur-xl sm:px-4">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <img src="/logo.jpg" alt="Logo TrenÎntârziat" className="h-10 w-10 rounded-full border border-zinc-800 object-cover transition-all group-hover:border-cyan-500/50 sm:h-12 sm:w-12" />
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-base font-extrabold tracking-tight text-transparent sm:text-xl md:text-2xl">
              Tren-Întârziat.ro
            </span>
          </Link>
          <Link href="/drepturi" className="rounded-full border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm font-semibold text-zinc-300 transition-colors hover:border-cyan-500/30 hover:text-white">
            Drepturile Tale
          </Link>
        </div>
      </header>

      {/* Hero & Search Form */}
      <div className="my-auto py-12 flex flex-col md:flex-row gap-12 items-center">
        <div className="flex-1 space-y-6 text-center md:text-left">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-none">
            Vezi mersul real al trenurilor și <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">cere-ți banii înapoi</span>
          </h1>
          <p className="text-lg md:text-xl text-zinc-400 max-w-lg mx-auto md:mx-0">
            Verifică orarul adevărat, vezi întârzierile live din România bazate pe statistici din ultimele 3 luni și generează automat cererea legală de despăgubire.
          </p>
          <div className="flex flex-col sm:flex-row justify-center md:justify-start gap-2 sm:gap-3">
            <div className="flex items-center gap-2 text-sm text-zinc-500 font-semibold justify-center md:justify-start">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse shrink-0"></span>
              Arhivă permanentă (din 02.07.2026)
            </div>
            <span className="text-zinc-700 hidden sm:block">{"\u2022"}</span>
            <div className="flex items-center gap-2 text-sm text-zinc-500 font-semibold justify-center md:justify-start">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0"></span>
              Fără urmărire & 100% legal
            </div>
          </div>
        </div>

        <div className="flex-1 w-full max-w-md">
          <div className="glass-card p-6 md:p-8 space-y-6 shadow-xl relative overflow-visible">
            {/* Top gradient border helper (clips the flat line to the rounded corners of the card) */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
              <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-blue-500 to-cyan-400"></div>
            </div>
            <h2 className="text-xl font-bold">Mersul Real & Calculator Despăgubiri</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2 relative">
                <label htmlFor="train" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Număr Tren
                </label>
                <input
                  id="train"
                  type="text"
                  placeholder="Ex: 12992, 16534, 15930"
                  required
                  autoComplete="off"
                  value={trainNumber}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                  onChange={(e) => handleInputChange(e.target.value)}
                />

                {/* Autocomplete Dropdown */}
                {showDropdown && filteredTrains.length > 0 && (
                  <ul className="absolute z-10 w-full mt-1 bg-zinc-900 border border-zinc-800 rounded-xl max-h-60 overflow-y-auto shadow-2xl divide-y divide-zinc-850">
                    {filteredTrains.map((t) => (
                      <li
                        key={`${t.trainType}-${t.trainNumber}`}
                        onClick={() => handleSelectTrain(t.trainNumber)}
                        className="px-4 py-3 hover:bg-zinc-800 cursor-pointer flex justify-between items-center transition-colors"
                      >
                        <span className="font-bold text-zinc-200">
                          {t.trainType} {t.trainNumber}
                        </span>
                        <span className="text-xs text-zinc-500 uppercase font-semibold">Selectează</span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[11px] text-zinc-550 mt-1 leading-relaxed">
                  Găsești numărul trenului pe bilet, pe display-urile din gară, sau în aplicația CFR Călători.
                </p>
              </div>

              <div className="space-y-2">
                <label htmlFor="date" className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Data Călătoriei
                </label>
                <input
                  id="date"
                  type="date"
                  required
                  max={maxDateStr}
                  value={date}
                  onChange={(e) => handleDateChange(e.target.value)}
                />
                
                {/* Real-time date constraint validation feedback */}
                {dateError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/25 text-[11px] text-red-400 leading-normal animate-fade-in mt-1 flex items-start gap-1.5">
                    <svg className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <span>{dateError}</span>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={!!dateError}
                className="w-full py-3 rounded-xl font-bold text-zinc-950 bg-gradient-to-r from-blue-400 to-cyan-400 hover:from-blue-300 hover:to-cyan-300 transition-all shadow-lg hover:shadow-cyan-500/10 active:scale-[0.98] transform cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Caută și Calculează
              </button>
            </form>
          </div>

          {/* Popular / Recently Tracked Trains */}
          {savedTrains.length > 0 && (
            <div className="mt-4 space-y-2">
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Trenuri monitorizate recent</span>
              <div className="flex flex-wrap gap-2">
                {savedTrains.slice(0, 8).map((t) => {
                  const todayStr = new Date().toISOString().split("T")[0];
                  const [y, m, d] = todayStr.split("-");
                  const formattedDate = `${d}.${m}.${y}`;
                  return (
                    <button
                      key={`${t.trainType}-${t.trainNumber}`}
                      onClick={() => router.push(`/tren/${t.trainNumber}/${formattedDate}`)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-900/60 border border-zinc-850 hover:bg-zinc-800 hover:border-zinc-700 transition-all text-zinc-300 cursor-pointer flex items-center gap-1.5"
                    >
                      <span className="text-cyan-400 text-[10px] font-extrabold">{t.trainType}</span>
                      {t.trainNumber}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Platform Values / Why Us */}
      <section className="py-12 border-t border-zinc-900 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">De ce Tren-Întârziat.ro?</h2>
          <p className="text-sm text-zinc-400 max-w-lg mx-auto">Suntem o inițiativă civică independentă creată pentru a proteja pasagerii pe căile ferate din România.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-850 space-y-3 hover:border-zinc-800 transition-all">
            <div className="text-cyan-400 text-sm font-bold">1. Mersul Real & Estimări</div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
              Află orarul adevărat al trenurilor din România, calculat pe baza întârzierilor live și a statisticilor noastre din ultimele 3 luni.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-850 space-y-3 hover:border-zinc-800 transition-all">
            <div className="text-blue-400 text-sm font-bold">2. Despăgubire Rapidă</div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
              Calculezi compensația legală de 25% sau 50% și generezi fișierul PDF oficial CFR pre-completat, gata de semnat și trimis.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-850 space-y-3 hover:border-zinc-800 transition-all">
            <div className="text-emerald-400 text-sm font-bold">3. 100% Legal & Privat</div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
              Nu colectăm, stocăm sau vindem datele tale personale. Funcționăm complet independent, respectând dreptul de autor și legislația feroviară în vigoare.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-zinc-900/40 border border-zinc-850 space-y-3 hover:border-zinc-800 transition-all">
            <div className="text-amber-400 text-sm font-bold">4. Apărare Civic-Tech</div>
            <p className="text-[11px] text-zinc-400 leading-relaxed font-medium">
              Susținem pasagerii de rând în relația cu operatorii feroviari. Oferim sprijin gratuit pentru a simplifica aplicarea Regulamentului European 2021/782.
            </p>
          </div>
        </div>
      </section>

      {/* Info Cards */}
      <section className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 py-10 border-t border-zinc-900">
        <div className="space-y-2">
          <div className="text-cyan-400 font-semibold text-lg">60 - 119 minute</div>
          <h3 className="text-base font-bold">Compensație 25%</h3>
          <p className="text-sm text-zinc-400">
            Dacă trenul a întârziat între o oră și două ore, ai dreptul la un sfert din valoarea biletului înapoi.
          </p>
        </div>
        <div className="space-y-2">
          <div className="text-blue-400 font-semibold text-lg">Peste 120 minute</div>
          <h3 className="text-base font-bold">Compensație 50%</h3>
          <p className="text-sm text-zinc-400">
            Dacă întârzierea depășește două ore, compania este obligată să îți returneze jumătate din prețul biletului.
          </p>
        </div>
        <div className="space-y-2">
          <div className="text-emerald-400 font-semibold text-lg">Prag de 4 Euro</div>
          <h3 className="text-base font-bold">Valoare Minimă</h3>
          <p className="text-sm text-zinc-400">
            Companiile feroviare nu plătesc despăgubiri dacă valoarea calculată a compensației este mai mică de echivalentul a 4 Euro (aprox. 20 RON).
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-8 border-t border-zinc-900 py-6 text-center text-xs text-zinc-650">
        <p>© 2026 Tren-Întârziat.ro. Acest proiect este un instrument civic independent și nu este afiliat cu CFR Călători, InfoFer sau alți operatori feroviari.</p>
      </footer>
      </div>
    </main>
  );
}
