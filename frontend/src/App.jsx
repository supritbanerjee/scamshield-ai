import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Copy,
  Database,
  Fingerprint,
  History,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Menu,
  MessageSquareText,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";

// API location priority:
// 1) Vite environment variable for a conventional deployment.
// 2) Hugging Face Static Space variable for the free hosted demo.
// 3) Relative /api path, proxied by Vite to Flask during local development.
const HF_API_URL = window.huggingface?.variables?.API_BASE_URL;
const API_BASE = (import.meta.env.VITE_API_URL || HF_API_URL || "").replace(/\/$/, "");

const examples = [
  {
    label: "KYC alert",
    tone: "danger",
    text: "URGENT! Your SBI account will be suspended today. Update KYC now at http://bit.ly/verify-kyc and enter your OTP.",
  },
  {
    label: "Prize message",
    tone: "danger",
    text: "Congratulations! You won ₹25 lakh in a lucky draw. Pay the ₹2,999 processing fee today to claim your prize.",
  },
  {
    label: "Delivery update",
    tone: "safe",
    text: "Your order has shipped and will arrive by Friday. Track delivery from the official shopping app.",
  },
];

const faqs = [
  {
    q: "How does ScamShield decide?",
    a: "A TF-IDF NLP model reads word and character patterns, while an explainable rule layer checks for urgency, suspicious links, credential requests, threats, and payment pressure.",
  },
  {
    q: "Are my messages private?",
    a: "Scans are stored only in your local SQLite history for this demo. No third-party AI API receives the message. You can erase the full history with one click.",
  },
  {
    q: "Can it be wrong?",
    a: "Yes. ScamShield is a decision-support tool, not a guarantee. Never rely on one score alone—verify unexpected requests through the organisation's official app, website, or phone number.",
  },
  {
    q: "What messages can I test?",
    a: "It is tuned for common English SMS and WhatsApp fraud patterns, including Indian banking, KYC, UPI, job, delivery, lottery, impersonation, and remote-access scams.",
  },
];

function Logo() {
  return (
    <a href="#top" className="brand" aria-label="ScamShield home">
      <span className="brand-mark"><ShieldCheck size={19} strokeWidth={2.4} /></span>
      <span>SCAMSHIELD<sup>AI</sup></span>
    </a>
  );
}

function Header() {
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);
  return (
    <header className="site-header">
      <div className="header-inner">
        <Logo />
        <nav className={open ? "nav-links open" : "nav-links"} aria-label="Main navigation">
          <a href="#scanner" onClick={close}>Detector</a>
          <a href="#how-it-works" onClick={close}>How it works</a>
          <a href="#history" onClick={close}>History</a>
          <a href="#faq" onClick={close}>FAQ</a>
        </nav>
        <a className="header-cta" href="#scanner">
          Scan a message <ArrowUpRight size={16} />
        </a>
        <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation">
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}

function Eyebrow({ number, children, light = false }) {
  return (
    <div className={`eyebrow ${light ? "light" : ""}`}>
      {number && <span>{number}</span>}
      <p>{children}</p>
    </div>
  );
}

function Hero() {
  return (
    <main id="top">
      <section className="hero section-shell">
        <div className="hero-topline">
          <span>AI MESSAGE INTELLIGENCE</span>
          <span className="hero-topline-center"><i /> TRAINED FOR REAL-WORLD SCAMS</span>
          <span>MUMBAI · INDIA</span>
        </div>
        <div className="hero-grid">
          <div className="hero-copy">
            <p className="hero-kicker"><Sparkles size={15} /> Your second opinion, in seconds.</p>
            <h1>
              <span>SCAMS LIE.</span>
              <span>SIGNALS</span>
              <span className="outline-word">DON'T.</span>
            </h1>
            <div className="hero-actions">
              <a href="#scanner" className="button button-dark">
                Check a message <ArrowDownRight size={19} />
              </a>
              <p>Paste a suspicious SMS or WhatsApp message. Get a clear verdict, confidence score, and the red flags behind it.</p>
            </div>
          </div>

          <div className="hero-visual-wrap">
            <div className="hero-visual">
              <img src="/shield-orbit.png" alt="Glass security shield with chrome rings" />
              <span className="corner corner-tl" /><span className="corner corner-tr" />
              <span className="corner corner-bl" /><span className="corner corner-br" />
              <div className="floating-pill pill-one"><span className="pulse-dot" /> LIVE NLP</div>
              <div className="floating-pill pill-two"><Fingerprint size={14} /> EXPLAINABLE</div>
            </div>
            <div className="visual-caption">
              <span>[ SAFETY, WITHOUT THE GUESSWORK ]</span>
              <span>01 / 03</span>
            </div>
          </div>
        </div>
      </section>

      <div className="ticker" aria-label="Supported scam types">
        <div className="ticker-track">
          {["KYC FRAUD", "UPI SCAMS", "FAKE JOBS", "PHISHING LINKS", "LOTTERY TRAPS", "IMPERSONATION", "KYC FRAUD", "UPI SCAMS", "FAKE JOBS", "PHISHING LINKS", "LOTTERY TRAPS", "IMPERSONATION"].map((item, index) => (
            <span key={`${item}-${index}`}>{item}<i>✳</i></span>
          ))}
        </div>
      </div>
    </main>
  );
}

function EmptyResult() {
  return (
    <div className="result-empty">
      <div className="radar">
        <span className="radar-ring ring-one" />
        <span className="radar-ring ring-two" />
        <span className="radar-line" />
        <ScanLine size={30} />
      </div>
      <h3>Waiting for a message</h3>
      <p>Your result will appear here with a confidence score and plain-English signals.</p>
      <div className="empty-metrics">
        <div><span>MODEL</span><strong>TF–IDF + LR</strong></div>
        <div><span>OUTPUT</span><strong>EXPLAINABLE</strong></div>
      </div>
    </div>
  );
}

function ResultCard({ result, onReset }) {
  const isScam = result.verdict === "SCAM";
  const confidence = Math.round(result.confidence);
  return (
    <div className={`result-content ${isScam ? "is-scam" : "is-legit"}`}>
      <div className="result-heading">
        <div>
          <p className="result-overline"><span /> ANALYSIS COMPLETE</p>
          <h3>{isScam ? "Likely a scam." : "Looks legitimate."}</h3>
        </div>
        <div
          className="score-ring"
          style={{ "--score": `${confidence * 3.6}deg` }}
          aria-label={`${result.confidence}% confidence`}
        >
          <div><strong>{confidence}</strong><span>% confidence</span></div>
        </div>
      </div>

      <div className="verdict-strip">
        <div className="verdict-icon">{isScam ? <CircleAlert /> : <CheckCircle2 />}</div>
        <div><span>VERDICT</span><strong>{result.verdict}</strong></div>
        <div><span>RISK LEVEL</span><strong>{result.risk_level}</strong></div>
        <div><span>SCAM PROB.</span><strong>{result.scam_probability}%</strong></div>
      </div>

      <div className="signals">
        <div className="signals-title">
          <span>WHY THIS RESULT</span>
          <span>{result.signals.length} SIGNAL{result.signals.length !== 1 ? "S" : ""}</span>
        </div>
        {result.signals.map((signal, index) => (
          <div className={`signal-item ${signal.kind}`} key={`${signal.label}-${index}`}>
            <span className="signal-number">0{index + 1}</span>
            <div>
              <strong>{signal.label}</strong>
              <p>{signal.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="advice-box">
        <ShieldCheck size={19} />
        <p>{result.advice}</p>
      </div>
      <button className="reset-button" onClick={onReset}><RotateCcw size={15} /> Check another message</button>
    </div>
  );
}

function Scanner({ onScanSaved }) {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const analyze = async () => {
    if (!message.trim()) {
      setError("Paste a message before you scan.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not analyze the message.");
      setResult(data);
      onScanSaved?.();
    } catch (err) {
      setError(err.message === "Failed to fetch" ? "Could not reach the Flask API. Check the hosted backend, or start it on port 5000 locally." : err.message);
    } finally {
      setLoading(false);
    }
  };

  const useExample = (text) => {
    setMessage(text);
    setResult(null);
    setError("");
    document.getElementById("message-input")?.focus();
  };

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setMessage(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1300);
    } catch {
      setError("Clipboard access was blocked. Paste with Ctrl/Cmd + V instead.");
    }
  };

  const reset = () => {
    setResult(null);
    setMessage("");
    setError("");
  };

  return (
    <section className="scanner-section" id="scanner">
      <div className="section-shell">
        <div className="section-intro scanner-intro">
          <Eyebrow number="01" light>LIVE DETECTOR</Eyebrow>
          <h2>PASTE THE PITCH.<br /><span>WE'LL FIND THE PRESSURE.</span></h2>
          <p>No jargon. No black-box answer. Just a verdict and the signals that shaped it.</p>
        </div>

        <div className="scanner-workspace">
          <div className="composer-panel">
            <div className="panel-bar">
              <span>MESSAGE INPUT</span>
              <span><i className="online-dot" /> LOCAL MODEL READY</span>
            </div>
            <div className="input-wrap">
              <textarea
                id="message-input"
                value={message}
                onChange={(event) => { setMessage(event.target.value); setError(""); }}
                placeholder="Paste the SMS or WhatsApp message here…"
                maxLength={5000}
                aria-label="Message to analyze"
              />
              <button className="paste-button" onClick={pasteFromClipboard} type="button">
                {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "PASTED" : "PASTE"}
              </button>
              <span className="char-count">{message.length} / 5000</span>
            </div>
            {error && <p className="error-message"><CircleAlert size={15} /> {error}</p>}
            <div className="composer-footer">
              <div className="privacy-note"><LockKeyhole size={16} /><span>Processed by the project's Flask server.<br />No external AI API.</span></div>
              <button className="analyze-button" onClick={analyze} disabled={loading}>
                {loading ? <><LoaderCircle className="spin" size={18} /> ANALYZING</> : <>ANALYZE MESSAGE <ArrowRight size={18} /></>}
              </button>
            </div>

            <div className="examples-wrap">
              <span>TRY AN EXAMPLE</span>
              <div className="example-chips">
                {examples.map((example) => (
                  <button key={example.label} onClick={() => useExample(example.text)} className={example.tone}>
                    <span /> {example.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="result-panel" aria-live="polite">
            <div className="panel-bar result-bar"><span>AI ASSESSMENT</span><span>SCAMSHIELD / 1.0</span></div>
            {result ? <ResultCard result={result} onReset={reset} /> : <EmptyResult />}
          </div>
        </div>
        <p className="scanner-disclaimer">SCAMSHIELD IS A DECISION-SUPPORT TOOL, NOT A GUARANTEE. VERIFY HIGH-STAKES REQUESTS THROUGH OFFICIAL CHANNELS.</p>
      </div>
    </section>
  );
}

function ProcessCard({ number, title, text, icon: Icon, image, dark = false, accent = false }) {
  return (
    <article className={`process-card ${dark ? "dark" : ""} ${accent ? "accent" : ""}`}>
      <div className="process-card-top">
        <span>/{number}</span>
        <Icon size={22} strokeWidth={1.8} />
      </div>
      {image && <div className="process-image"><img src={image} alt="" /></div>}
      <div className="process-copy">
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </article>
  );
}

function HowItWorks() {
  return (
    <section className="process-section section-shell" id="how-it-works">
      <div className="process-heading">
        <Eyebrow number="02">UNDER THE HOOD</Eyebrow>
        <h2>ONE MESSAGE.<br />THREE SMART MOVES.</h2>
        <p>A compact machine-learning pipeline built to be fast enough for everyday checks and clear enough to explain in an interview.</p>
      </div>
      <div className="process-grid">
        <ProcessCard number="01" title="You paste." text="Drop in any suspicious SMS or WhatsApp copy. The API validates and cleans the input." icon={MessageSquareText} image="/message-scan.png" />
        <ProcessCard number="02" title="AI reads the signals." text="Word and character TF-IDF features meet logistic regression and a scam-pattern rule layer." icon={BrainCircuit} image="/privacy-core.png" dark />
        <ProcessCard number="03" title="You decide with context." text="See a confidence score, risk level, and human-readable evidence—not just a label." icon={ShieldCheck} image="/shield-orbit.png" accent />
      </div>
    </section>
  );
}

function MetricStrip() {
  const metrics = [
    ["02", "N-GRAM VIEWS", "word + character"],
    ["10+", "RISK SIGNALS", "links to pressure"],
    ["0", "CLOUD AI CALLS", "privacy by design"],
    ["< 1s", "TYPICAL SCAN", "on local hardware"],
  ];
  return (
    <section className="metrics-section">
      <div className="section-shell metrics-grid">
        {metrics.map(([value, label, sub]) => (
          <div className="metric" key={label}>
            <strong>{value}</strong>
            <div><span>{label}</span><p>{sub}</p></div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HistorySection({ refreshToken }) {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ total: 0, scams: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/history?limit=30`);
      if (!response.ok) throw new Error("Could not load scan history.");
      const data = await response.json();
      setItems(data.items || []);
      setSummary(data.summary || { total: 0, scams: 0 });
      setError("");
    } catch (err) {
      setError(err.message === "Failed to fetch" ? "Start the Flask API to view saved scans." : err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadHistory(); }, [refreshToken]);

  const deleteItem = async (id) => {
    try {
      await fetch(`${API_BASE}/api/history/${id}`, { method: "DELETE" });
      loadHistory();
    } catch { setError("Could not delete this scan."); }
  };

  const clearAll = async () => {
    if (!items.length || !window.confirm("Clear all scan history?")) return;
    try {
      await fetch(`${API_BASE}/api/history`, { method: "DELETE" });
      loadHistory();
    } catch { setError("Could not clear history."); }
  };

  const scamRate = summary.total ? Math.round((summary.scams / summary.total) * 100) : 0;

  return (
    <section className="history-section" id="history">
      <div className="section-shell">
        <div className="history-header">
          <div>
            <Eyebrow number="03">YOUR SCAN LOG</Eyebrow>
            <h2>HISTORY, NOT<br /><span>HIDDEN.</span></h2>
          </div>
          <div className="history-summary">
            <div><strong>{String(summary.total).padStart(2, "0")}</strong><span>TOTAL SCANS</span></div>
            <div><strong>{scamRate}%</strong><span>FLAGGED</span></div>
            <button onClick={clearAll} disabled={!items.length}><Trash2 size={15} /> CLEAR ALL</button>
          </div>
        </div>

        <div className="history-table-wrap">
          <div className="history-table-head">
            <span>NO.</span><span>MESSAGE</span><span>VERDICT</span><span>CONFIDENCE</span><span>SCANNED</span><span />
          </div>
          {loading ? (
            <div className="history-status"><LoaderCircle className="spin" /> Loading scans…</div>
          ) : error ? (
            <div className="history-status error"><CircleAlert /> {error}</div>
          ) : !items.length ? (
            <div className="history-empty">
              <History size={28} />
              <div><strong>No scans yet.</strong><p>Your latest checks will be saved here.</p></div>
              <a href="#scanner">RUN FIRST SCAN <ArrowUpRight size={15} /></a>
            </div>
          ) : (
            items.map((item, index) => {
              const date = new Date(item.created_at);
              return (
                <div className="history-row" key={item.id}>
                  <span className="row-number">{String(items.length - index).padStart(2, "0")}</span>
                  <div className="history-message"><MessageSquareText size={16} /><p>{item.message}</p></div>
                  <span className={`verdict-badge ${item.verdict.toLowerCase()}`}><i /> {item.verdict}</span>
                  <div className="confidence-cell"><span>{Math.round(item.confidence)}%</span><i><b style={{ width: `${item.confidence}%` }} /></i></div>
                  <div className="date-cell"><strong>{date.toLocaleDateString(undefined, { day: "2-digit", month: "short" })}</strong><span>{date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span></div>
                  <button className="delete-row" onClick={() => deleteItem(item.id)} aria-label="Delete scan"><X size={16} /></button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}

function TechSection() {
  return (
    <section className="tech-section section-shell">
      <div className="tech-art">
        <img src="/privacy-core.png" alt="Glowing privacy core sculpture" />
        <div className="tech-stamp"><ShieldCheck size={28} /><span>BUILT<br />RESPONSIBLY</span></div>
        <span className="tech-coordinate">19.076° N / 72.878° E</span>
      </div>
      <div className="tech-copy">
        <Eyebrow number="04">BUILT TO EXPLAIN</Eyebrow>
        <h2>SMALL MODEL.<br />CLEAR THINKING.</h2>
        <p className="tech-lead">A recruiter-friendly full-stack project with real NLP, persistent data, REST endpoints, and an original responsive interface.</p>
        <div className="tech-list">
          <div><span><BrainCircuit /></span><div><h3>Explainable NLP</h3><p>Dual TF-IDF feature sets and logistic regression blend with transparent safety rules.</p></div></div>
          <div><span><Zap /></span><div><h3>Fast Flask API</h3><p>Validation, JSON responses, CORS, security headers, and clean error handling.</p></div></div>
          <div><span><Database /></span><div><h3>Persistent history</h3><p>SQLite keeps recent scans with individual delete and clear-all controls.</p></div></div>
        </div>
      </div>
    </section>
  );
}

function FAQ() {
  const [open, setOpen] = useState(0);
  return (
    <section className="faq-section" id="faq">
      <div className="section-shell faq-grid">
        <div className="faq-title">
          <Eyebrow number="05" light>GOOD QUESTIONS</Eyebrow>
          <h2>BEFORE YOU<br />TRUST THE<br /><span>SCORE.</span></h2>
          <p>Use the model as a signal—not a substitute for common sense or official verification.</p>
        </div>
        <div className="faq-list">
          {faqs.map((faq, index) => (
            <button className={`faq-item ${open === index ? "open" : ""}`} onClick={() => setOpen(open === index ? -1 : index)} key={faq.q}>
              <div><span>0{index + 1}</span><strong>{faq.q}</strong><ChevronDown /></div>
              <p>{faq.a}</p>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      <div className="footer-cta section-shell">
        <p><span className="pulse-dot" /> READY WHEN THE MESSAGE FEELS OFF.</p>
        <h2>PAUSE. PASTE.<br /><span>PROTECT.</span></h2>
        <a href="#scanner">SCAN A MESSAGE <ArrowUpRight /></a>
      </div>
      <div className="footer-bottom section-shell">
        <Logo />
        <p>AI SCAM MESSAGE DETECTOR<br />A THIRD-YEAR FULL-STACK NLP PROJECT.</p>
        <div className="footer-links"><a href="#scanner">DETECTOR</a><a href="#history">HISTORY</a><a href="#faq">FAQ</a></div>
        <div className="footer-meta"><span>PYTHON · FLASK · REACT · NLP</span><span>© 2026 SCAMSHIELD AI</span></div>
      </div>
    </footer>
  );
}

export default function App() {
  const [historyRefresh, setHistoryRefresh] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("revealed")),
      { threshold: 0.08 }
    );
    document.querySelectorAll("section").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Header />
      <Hero />
      <Scanner onScanSaved={() => setHistoryRefresh((value) => value + 1)} />
      <HowItWorks />
      <MetricStrip />
      <HistorySection refreshToken={historyRefresh} />
      <TechSection />
      <FAQ />
      <Footer />
    </>
  );
}
