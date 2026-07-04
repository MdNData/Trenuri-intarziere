import Link from "next/link";

export default function Drepturi() {
  return (
    <main className="min-h-screen flex flex-col justify-between p-6 md:p-12 max-w-4xl mx-auto">
      {/* Header */}
      <header className="flex justify-between items-center py-4 border-b border-zinc-900">
        <Link href="/" className="flex items-center gap-2 group">
          <img src="/logo.jpg" alt="Logo TrenÎntârziat" className="w-10 h-10 md:w-16 md:h-16 rounded-full border border-zinc-800 object-cover group-hover:border-cyan-500/50 transition-all" />
          <span className="text-xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Tren-Întârziat.ro
          </span>
        </Link>
        <Link href="/" className="text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors">
          ← Înapoi la căutare
        </Link>
      </header>

      {/* Main Content */}
      <div className="py-12 space-y-12">
        <div className="space-y-4">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            Drepturile tale ca pasager pe căile ferate din România
          </h1>
          <p className="text-lg text-zinc-400 leading-relaxed">
            Deși unii operatori (precum CFR Călători) beneficiază de derogări temporare care limitează despăgubirile automate pe rutele interne, regulamentele europene (Regulamentul UE 2021/782) prevăd drepturi clare pentru toți călătorii din România. Trimiterea unei reclamații oficiale către operatorul feroviar este calea legală pentru a obține compensații.
          </p>
        </div>

        {/* Compensation percentages */}
        <section className="grid md:grid-cols-2 gap-6">
          <div className="glass-card p-6 border border-zinc-800 space-y-3">
            <div className="inline-block px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-full text-xs font-semibold uppercase">
              Întârziere de 60 - 119 minute
            </div>
            <h2 className="text-2xl font-bold">Rambursare de 25%</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Dacă trenul ajunge la destinația finală cu o întârziere cuprinsă între 60 și 119 minute inclusiv, ai dreptul la o despăgubire egală cu 25% din prețul plătit pe bilet.
            </p>
          </div>

          <div className="glass-card p-6 border border-zinc-800 space-y-3">
            <div className="inline-block px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-semibold uppercase">
              Întârziere de peste 120 minute
            </div>
            <h2 className="text-2xl font-bold">Rambursare de 50%</h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Dacă întârzierea la sosirea la destinație este mai mare sau egală cu 120 de minute, compania de transport este obligată să îți returneze 50% din costul biletului.
            </p>
          </div>
        </section>

        {/* Detailed regulations list */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold">Detalii Importante și Excepții</h2>
          
          <div className="space-y-4">
            <div className="flex gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-850">
              <svg className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="font-bold text-zinc-200">Pragul minim de plată</h4>
                <p className="text-sm text-zinc-400 mt-1">
                  Operatorul nu efectuează plăți de despăgubire dacă valoarea calculată a aceastăia este mai mică decât echivalentul în lei a <strong className="text-zinc-200">4 Euro</strong>. Aceasta înseamnă că pentru bilete foarte ieftine, compensația s-ar putea să nu fie procesată.
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-850">
              <svg className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h4 className="font-bold text-zinc-200">Cunoașterea întârzierii înainte de cumpărare</h4>
                <p className="text-sm text-zinc-400 mt-1">
                  Nu ai dreptul la despăgubire dacă ai fost informat despre întârziere înainte de a achiziționa biletul de călătorie sau dacă întârzierea se datorează unor circumstanțe din afara controlului feroviar (forță majoră, condiții meteo extreme excepționale, etc.).
                </p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-xl bg-zinc-900/50 border border-zinc-850">
              <svg className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="font-bold text-zinc-200">Derogările operatorilor feroviari (Regulamentul UE 2021/782)</h4>
                <p className="text-sm text-zinc-400 mt-1">
                  Unii operatori au obținut scutiri repetate de la plata despăgubirilor automate pentru serviciile naționale de transport de călători. Cu toate acestea, ei sunt obligați să proceseze și să răspundă la reclamațiile depuse manual. De aceea, generarea unei cereri formale scrise prin e-mail este singura modalitate eficientă de acțiune.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How to submit claim */}
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Cum se trimite reclamația?</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            După ce găsești trenul tău întârziat pe site-ul nostru, folosește generatorul de e-mail pentru a pre-completa toate detaliile călătoriei (ora oficială, ora de sosire efectivă, numărul de minute de întârziere). Trimite e-mailul la adresa de contact a operatorului tău feroviar (indicată automat de aplicație în funcție de tren) și atașează o copie a biletului. Operatorul are obligația legală de a răspunde în termen de maximum 30 de zile.
          </p>
        </section>
      </div>

      {/* Footer */}
      <footer className="text-center text-xs text-zinc-650 py-6 border-t border-zinc-900">
        <p>© 2026 Tren-Întârziat.ro. Acest proiect este un instrument civic independent și nu este afiliat cu CFR Călători, InfoFer sau alți operatori feroviari.</p>
      </footer>
    </main>
  );
}
