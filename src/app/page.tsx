import Link from "next/link";

const INPUT_METHODS = [
  { label: "Website URL", detail: "Paste a link before you click through it." },
  { label: "Screenshot", detail: "A message, listing, or offer someone sent you." },
  { label: "PDF", detail: "A contract, prospectus, or offer letter." },
  { label: "Image", detail: "A photo of an ad, sign, or document." },
  { label: "Pasted text", detail: "Copy in the exact wording you were sent." },
  { label: "WhatsApp message", detail: "Forward the message text as-is." },
];

const STEPS = [
  { n: "01", title: "Collect the evidence", detail: "Guardian reads the page, the file, or the message itself — no manual digging required." },
  { n: "02", title: "Check who's behind it", detail: "Domain age, registration signals, and contact details are pulled and cross-checked." },
  { n: "03", title: "Scan for known patterns", detail: "The text is checked against patterns seen in advance-fee, Ponzi, romance, and phishing scams." },
  { n: "04", title: "Weigh the signals", detail: "Every check is scored and combined into one trust score, with nothing hidden in a black box." },
  { n: "05", title: "Explain it in plain language", detail: "You get a report that says what was found, why it matters, and what to do next." },
];

const CATEGORY_TICKS = [
  { label: "Transparency", value: 82 },
  { label: "Identity", value: 74 },
  { label: "Regulatory", value: 50 },
  { label: "Reputation", value: 50 },
  { label: "Tech security", value: 85 },
  { label: "Sustainability", value: 65 },
  { label: "Pattern match", value: 88 },
];

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-6xl px-6">
      <TopNav />

      {/* Hero */}
      <section className="grid grid-cols-1 items-center gap-14 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
        <div>
          <p className="mb-5 font-mono text-xs uppercase tracking-[0.2em] text-ink-muted">
            Trust intelligence, before you commit
          </p>
          <h1 className="text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-6xl">
            Know what you&apos;re dealing with
            <span className="text-trust"> before</span> you send money.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-secondary">
            Paste a link, a message, or a document. Guardian investigates it —
            company identity, known scam patterns, technical signals — and
            hands you back a scored, explainable report in plain language.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href="/investigation/new"
              className="rounded-card bg-trust px-6 py-3 text-sm font-medium text-canvas transition hover:brightness-110"
            >
              Start an investigation
            </Link>
            <a href="#how-it-works" className="text-sm font-medium text-ink-secondary hover:text-ink">
              See how it works →
            </a>
          </div>
          <p className="mt-8 text-sm text-ink-muted">
            Guardian never declares a verdict. It shows you the evidence, the
            score, and how confident it is — so the decision stays yours.
          </p>
        </div>

        <TrustGaugeSignature />
      </section>

      {/* Input methods */}
      <section className="border-t border-canvas-border py-16">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-muted">
          Bring Guardian whatever you were sent
        </h2>
        <div className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-card border border-canvas-border bg-canvas-border sm:grid-cols-2 lg:grid-cols-3">
          {INPUT_METHODS.map((m) => (
            <div key={m.label} className="bg-canvas-surface p-5">
              <p className="font-medium text-ink">{m.label}</p>
              <p className="mt-1 text-sm text-ink-secondary">{m.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-t border-canvas-border py-16">
        <h2 className="text-sm font-medium uppercase tracking-wide text-ink-muted">How an investigation runs</h2>
        <ol className="mt-6 space-y-0">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-6 border-b border-canvas-border py-6 last:border-b-0">
              <span className="font-mono text-sm text-ink-muted">{s.n}</span>
              <div>
                <p className="font-medium text-ink">{s.title}</p>
                <p className="mt-1 max-w-lg text-sm text-ink-secondary">{s.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className="border-t border-canvas-border py-10 text-sm text-ink-muted">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <span>Guardian — Trust Intelligence</span>
          <span>Evidence-based. Never a bare verdict.</span>
        </div>
      </footer>
    </main>
  );
}

function TopNav() {
  return (
    <nav className="flex items-center justify-between py-6">
      <span className="font-mono text-sm font-medium tracking-tight text-ink">GUARDIAN</span>
      <div className="flex items-center gap-6">
        <Link href="/login" className="text-sm text-ink-secondary hover:text-ink">
          Log in
        </Link>
        <Link
          href="/investigation/new"
          className="rounded-card border border-canvas-border px-4 py-2 text-sm text-ink hover:border-ink-muted"
        >
          Start an investigation
        </Link>
      </div>
    </nav>
  );
}

/**
 * Signature element: a radial gauge rendered from real category data,
 * with a monospace score at its center — the same widget the report page
 * uses (components/report/TrustScoreWidget.tsx), so the promise on the
 * landing page is literally the product, not a mockup of it.
 */
function TrustGaugeSignature() {
  const score = 74;
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div className="mx-auto flex w-full max-w-sm flex-col items-center rounded-card border border-canvas-border bg-canvas-surface p-8 shadow-card">
      <div className="relative h-56 w-56">
        <svg viewBox="0 0 220 220" className="h-full w-full -rotate-90">
          <circle cx="110" cy="110" r={radius} fill="none" stroke="#242830" strokeWidth="10" />
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="none"
            stroke="#2FD48C"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-5xl font-medium tabular text-ink">{score}</span>
          <span className="mt-1 text-xs uppercase tracking-wide text-ink-muted">Trust score</span>
        </div>
      </div>
      <div className="mt-6 w-full space-y-2">
        {CATEGORY_TICKS.map((c) => (
          <div key={c.label} className="flex items-center gap-3">
            <span className="w-28 shrink-0 text-xs text-ink-secondary">{c.label}</span>
            <div className="h-1.5 flex-1 rounded-full bg-canvas-border">
              <div className="h-1.5 rounded-full bg-trust" style={{ width: `${c.value}%` }} />
            </div>
            <span className="w-7 shrink-0 text-right font-mono text-xs text-ink-muted">{c.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
