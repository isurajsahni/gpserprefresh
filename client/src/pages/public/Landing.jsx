import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck, Layers, MapPin, LayoutDashboard, Users, FolderKanban, User,
  Play, ArrowUpRight, ChevronLeft, ChevronRight,
} from 'lucide-react';
import './landing.css';

// Small circular arrow used inside buttons / module links.
const Arrow = () => (
  <span className="arrow">
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2.5 8h10.5M9.5 4.5 13 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </span>
);

const MODULES = [
  { cat: 'HR', name: 'Employees', desc: 'Directory, roles & reporting lines for the whole company.' },
  { cat: 'HR', name: 'Attendance', desc: 'Check-in/out & monthly summaries, automatically tracked.' },
  { cat: 'HR', name: 'Leaves', desc: 'Apply, approve and track balances with one click.' },
  { cat: 'Sales', name: 'Tenders', desc: 'Pipeline, value & deadlines for every bid in play.' },
  { cat: 'Delivery', name: 'Projects', desc: 'Boards, budgets & progress for telematics rollouts.' },
  { cat: 'Delivery', name: 'Tasks', desc: 'Assign, prioritise & log time across every project.' },
  { cat: 'Finance', name: 'Payroll', desc: 'Salary breakdowns & payslips, generated monthly.' },
  { cat: 'Finance', name: 'Finance', desc: 'Expense requests & approvals with a full audit trail.' },
  { cat: 'Marketing', name: 'Campaigns', desc: 'Marketing spend & results, tracked per channel.' },
  { cat: 'CRM', name: 'Leads', desc: 'CRM pipeline by stage, from first contact to close.' },
  { cat: 'Operations', name: 'Assets', desc: 'Inventory & assignment for devices and equipment.' },
  { cat: 'Brand', name: 'Design Library', desc: 'Versioned brand assets, always the latest files.' },
];

const MARQUEE = ['Employees', 'Attendance', 'Leaves', 'Tenders', 'Projects', 'Tasks', 'Payroll', 'Finance', 'Campaigns', 'Leads', 'Assets', 'Design Library'];

export default function Landing() {
  const rootRef = useRef(null);
  const trackRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Per-element reveal delays.
    root.querySelectorAll('.reveal[data-delay]').forEach((el) => {
      el.style.transitionDelay = `${el.dataset.delay}ms`;
    });
    // Stagger children of containers.
    root.querySelectorAll('[data-stagger]').forEach((c) => {
      const step = Number(c.dataset.stagger) || 100;
      Array.from(c.children).forEach((ch, i) => {
        if (ch.classList.contains('reveal')) ch.style.transitionDelay = `${i * step}ms`;
      });
    });

    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
      }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    root.querySelectorAll('.reveal').forEach((el) => io.observe(el));

    // Count-up numbers.
    const countIO = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        const target = Number(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        const t0 = performance.now();
        const tick = (t) => {
          const p = Math.min(1, (t - t0) / 1400);
          el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        countIO.unobserve(el);
      }),
      { threshold: 0.5 }
    );
    root.querySelectorAll('[data-count]').forEach((el) => countIO.observe(el));

    return () => { window.removeEventListener('scroll', onScroll); io.disconnect(); countIO.disconnect(); };
  }, []);

  const scrollCarousel = (dir) => {
    const t = trackRef.current;
    if (!t) return;
    const card = t.querySelector('.module-card');
    const w = card ? card.offsetWidth + 20 : 300;
    t.scrollBy({ left: dir * w * 1.2, behavior: 'smooth' });
  };

  const Logo = () => (
    <div className="nav-logo">
      <span className="logo-mark">G</span>
      <span className="logo-text">GPSFDK<span>.com</span></span>
    </div>
  );

  return (
    <div className="lp" ref={rootRef}>
      {/* Navigation */}
      <nav className={`nav${scrolled ? ' scrolled' : ''}`}>
        <div className="nav-inner">
          <Logo />
          <div className="nav-links">
            <a href="#platform">Platform</a>
            <a href="#modules">Modules</a>
            <a href="#access">Access</a>
            <a href="#stories">Stories</a>
          </div>
          <div className="nav-actions">
            <Link to="/login" className="nav-signin">Sign in</Link>
            <Link to="/register" className="btn btn-navy nav-cta">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="hero">
        <div className="container hero-grid">
          <div className="hero-text">
            <div className="kicker reveal">Enterprise Resource Planning</div>
            <h1 className="h-display h1 reveal" data-delay="100">Run your entire business from <em>one dashboard</em></h1>
            <p className="hero-desc reveal" data-delay="220">GPSFDK.com ERP brings people, projects, tenders, finance and your CRM together — with role-based access designed for a modern GPS fleet-tracking company.</p>
            <div className="hero-ctas reveal" data-delay="340">
              <Link to="/register" className="btn btn-navy">Get Started <Arrow /></Link>
              <Link to="/login" className="btn btn-outline">Sign in</Link>
            </div>
            <div className="hero-proof reveal" data-delay="460">
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div className="avatar-row">
                  <span className="avatar a1">FA</span>
                  <span className="avatar a2">SM</span>
                  <span className="avatar a3">KR</span>
                  <span className="avatar a4">+</span>
                </div>
                <div className="proof-text"><strong>The whole company</strong> works in one workspace</div>
              </div>
              <div className="proof-pill"><span className="star">✦</span> 100% role-aware access control</div>
            </div>
          </div>
          <div className="hero-visual reveal" data-delay="300">
            <div className="hero-img ph"><span className="ph-note">— dashboard preview —<br />(role-aware KPIs & charts)</span></div>
            <div className="float-chip chip-stat">
              <span className="num">13+</span>
              <span className="lbl">integrated modules in one workspace</span>
            </div>
            <Link to="/register" className="float-chip chip-play">
              <span className="play-circle"><Play size={12} fill="currentColor" /></span> Watch the tour
            </Link>
            <div className="orbit-badge">
              <svg viewBox="0 0 104 104">
                <defs>
                  <path id="orbit-circle" d="M 52,52 m -36,0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" />
                </defs>
                <text><textPath href="#orbit-circle">ONE DASHBOARD · GPSFDK ERP ·</textPath></text>
              </svg>
              <span className="orbit-core"><ArrowUpRight size={16} /></span>
            </div>
          </div>
        </div>
      </header>

      {/* Marquee */}
      <section className="marquee-section">
        <div className="marquee-label">13+ modules · one source of truth</div>
        <div className="marquee">
          <div className="marquee-track">
            {[...MARQUEE, ...MARQUEE].map((m, i) => <span key={i}>{m}</span>)}
          </div>
        </div>
      </section>

      {/* Platform panel */}
      <section className="section" id="platform" style={{ paddingTop: 40 }}>
        <div className="container">
          <div className="navy-panel reveal">
            <div className="kicker on-dark">Our core platform</div>
            <h2 className="h-display h2">One workspace for people,<br />projects &amp; <em>finance</em></h2>
            <div className="navy-cards" data-stagger="120">
              <div className="navy-card reveal">
                <div className="icon-sq"><ShieldCheck size={18} /></div>
                <h3>Role-based access</h3>
                <p>Five roles with a granular module matrix, enforced on the server and the UI.</p>
              </div>
              <div className="navy-card reveal">
                <div className="icon-sq"><Layers size={18} /></div>
                <h3>All-in-one</h3>
                <p>HR, projects, finance, CRM, assets and culture — one login, one dashboard.</p>
              </div>
              <div className="navy-card reveal">
                <div className="icon-sq"><MapPin size={18} /></div>
                <h3>Built for GPSFDK</h3>
                <p>Tailored to a GPS fleet-tracking business with tenders, telematics projects &amp; more.</p>
              </div>
            </div>
            <div className="navy-footer">
              <div className="note">Join in — <strong>Create account · Pick a role · Invite your team.</strong> Every workflow in one place.</div>
              <Link to="/register" className="btn btn-white">Get Started <Arrow /></Link>
            </div>
          </div>
        </div>
      </section>

      {/* About split */}
      <section className="section">
        <div className="container split">
          <div className="split-img ph reveal"><span className="ph-note">— team / workspace —</span></div>
          <div className="reveal" data-delay="150">
            <div className="kicker">What it replaces</div>
            <h2 className="h-display h2">We bring HR, projects &amp; finance into <em>one place</em></h2>
            <p className="section-sub">No more spreadsheets, email chains and disconnected tools. Every team at GPSFDK — from field operations to finance — works from the same source of truth, with access tuned to their role.</p>
            <div className="split-stats">
              <div className="split-stat"><span className="num" data-count="13" data-suffix="+">0</span><span className="lbl">Modules</span></div>
              <div className="split-stat"><span className="num" data-count="5">0</span><span className="lbl">User roles</span></div>
              <div className="split-stat"><span className="num" data-count="100" data-suffix="%">0</span><span className="lbl">Role-aware</span></div>
            </div>
            <Link to="/register" className="btn btn-navy">More about the platform <Arrow /></Link>
          </div>
        </div>
      </section>

      {/* Purpose */}
      <section className="section" style={{ paddingTop: 20 }}>
        <div className="container">
          <div className="center">
            <div className="kicker centered reveal">Our direction</div>
            <h2 className="h-display h2 reveal" data-delay="100">Built around how<br />GPSFDK <em>actually works</em></h2>
            <p className="section-sub reveal" data-delay="200">Every screen, permission and workflow is designed for a GPS fleet-tracking company — not a generic template.</p>
          </div>
          <div className="purpose-cards" data-stagger="150">
            <div className="purpose-card reveal">
              <div className="icon-ring"><LayoutDashboard size={18} /></div>
              <h3>For managers</h3>
              <p>Tenders, project boards, budgets and team attendance in a single view — approve leaves and expenses without leaving the dashboard.</p>
              <div className="ph"><span className="ph-note">— manager view —</span></div>
            </div>
            <div className="purpose-card reveal">
              <div className="icon-ring"><Users size={18} /></div>
              <h3>For teams</h3>
              <p>Check in, log time on tasks, apply for leave and see your payslips — everything an employee needs, with nothing they don't.</p>
              <div className="ph"><span className="ph-note">— employee view —</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Modules carousel */}
      <section className="section" id="modules">
        <div className="container">
          <div className="carousel-head">
            <div>
              <div className="kicker reveal">Modules &amp; capabilities</div>
              <h2 className="h-display h2 reveal" data-delay="100">Everything your<br />team <em>needs</em></h2>
            </div>
            <div className="carousel-nav reveal" data-delay="200">
              <button onClick={() => scrollCarousel(-1)} aria-label="Previous"><ChevronLeft size={16} /></button>
              <button onClick={() => scrollCarousel(1)} aria-label="Next"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="modules-track reveal" data-delay="150" ref={trackRef}>
            {MODULES.map((m) => (
              <div className="module-card" key={m.name}>
                <div className="ph"><span className="ph-note">— {m.name.toLowerCase()} —</span></div>
                <div className="module-card-body">
                  <div className="module-cat">{m.cat}</div>
                  <h3>{m.name}</h3>
                  <p>{m.desc}</p>
                  <Link to="/register" className="module-link">Learn more <Arrow /></Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Access (navy) */}
      <section className="section" id="access" style={{ paddingTop: 20 }}>
        <div className="container">
          <div className="navy-panel reveal">
            <div className="kicker on-dark">Role-based by design</div>
            <h2 className="h-display h2">Five roles,<br />one source of <em>truth</em></h2>
            <div className="numbered-grid" data-stagger="130">
              <div className="numbered-card reveal">
                <div className="step-head"><span className="num">01</span><span className="icon-sq"><ShieldCheck size={16} /></span></div>
                <h3>Admins see everything</h3>
                <p>Full visibility across modules, with controls to shape what every other role can reach.</p>
              </div>
              <div className="numbered-card reveal">
                <div className="step-head"><span className="num">02</span><span className="icon-sq"><FolderKanban size={16} /></span></div>
                <h3>Managers see their world</h3>
                <p>Projects, tenders, team attendance and approvals — scoped to what they run.</p>
              </div>
              <div className="numbered-card reveal">
                <div className="step-head"><span className="num">03</span><span className="icon-sq"><User size={16} /></span></div>
                <h3>Staff see what matters</h3>
                <p>Personal attendance, tasks, leaves and payslips — a clean, focused workspace.</p>
              </div>
            </div>
            <div className="navy-footer">
              <div className="note">Permissions are enforced <strong>on the server and in the UI</strong> — no accidental access.</div>
              <Link to="/register" className="btn btn-white">Explore access <Arrow /></Link>
            </div>
          </div>
        </div>
      </section>

      {/* Milestones */}
      <section className="section">
        <div className="container center">
          <div className="kicker centered reveal">By the numbers</div>
          <h2 className="h-display h2 reveal" data-delay="100">Numbers that<br />run the <em>business</em></h2>
          <p className="section-sub reveal" data-delay="200">A snapshot of the workspace your team signs into every day.</p>
          <div className="milestones" data-stagger="140">
            <div className="milestone reveal"><span className="num" data-count="13" data-suffix="+">0</span><span className="lbl">Integrated modules</span></div>
            <div className="milestone reveal"><span className="num" data-count="5">0</span><span className="lbl">User roles</span></div>
            <div className="milestone reveal"><span className="num" data-count="100" data-suffix="%">0</span><span className="lbl">Role-aware access</span></div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="section" id="stories" style={{ paddingTop: 20 }}>
        <div className="container">
          <div className="center">
            <div className="kicker centered reveal">Stories from the team</div>
            <h2 className="h-display h2 reveal" data-delay="100">What working in one<br />workspace <em>feels like</em></h2>
          </div>
          <div className="testimonial-grid" data-stagger="140">
            {[
              { q: 'Consolidating five separate tools into one ERP cut our admin overhead by 60%. Onboarding a new hire used to take a full day — now it takes twenty minutes.', a: 'FA', n: 'Faisal A.', r: 'Operations Director' },
              { q: "Leave approvals used to take three days and a chain of emails. Now it's one click with automated workflows and a full audit trail.", a: 'SM', n: 'Sara M.', r: 'HR Manager' },
              { q: 'One dashboard where I can see tenders, projects and financials at a glance. Decision-making went from weekly meetings to real-time.', a: 'KR', n: 'Khalid R.', r: 'CEO' },
            ].map((t) => (
              <div className="testimonial-card reveal" key={t.n}>
                <div className="quote-mark">“</div>
                <div className="quote">{t.q}</div>
                <div className="stars">✦✦✦✦✦</div>
                <div className="testimonial-author">
                  <span className="avatar-c">{t.a}</span>
                  <div><div className="name">{t.n}</div><div className="role">{t.r}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How you start */}
      <section className="section" style={{ paddingTop: 20 }}>
        <div className="container">
          <div className="kicker reveal">Join the workspace</div>
          <h2 className="h-display h2 reveal" data-delay="100">How you get <em>started</em></h2>
          <p className="section-sub reveal" data-delay="200">However your team works, getting set up takes minutes — not migrations.</p>
          <div className="steps-grid" data-stagger="140">
            <div className="step-card reveal">
              <span className="num">01</span>
              <h3>Create your account</h3>
              <p>Sign up and land in a role-aware workspace in seconds — no setup wizard, no configuration maze.</p>
              <Link to="/register" className="btn btn-navy">Get Started <Arrow /></Link>
            </div>
            <div className="step-card reveal">
              <span className="num">02</span>
              <h3>Pick your role</h3>
              <p>Super Admin, Web Developer, Designer, Marketing or Operations — your dashboard shapes itself around what you do.</p>
              <Link to="/register" className="btn btn-outline">See roles <Arrow /></Link>
            </div>
            <div className="step-card reveal">
              <span className="num">03</span>
              <h3>Run everything</h3>
              <p>People, projects, tenders, payroll and CRM — one login, one source of truth, every day.</p>
              <a href="#modules" className="btn btn-outline">Explore modules <Arrow /></a>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="section" style={{ paddingTop: 20 }}>
        <div className="container">
          <div className="cta-panel reveal">
            <h2 className="h-display h2">Ready to streamline <em>GPSFDK?</em></h2>
            <p>Create your account and explore a role-aware workspace in seconds.</p>
            <Link to="/register" className="btn btn-blue" style={{ padding: '16px 34px', fontSize: 15 }}>Get Started <Arrow /></Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container footer-inner">
          <Logo />
          <div className="footer-links">
            <a href="#platform">Platform</a>
            <a href="#modules">Modules</a>
            <a href="#access">Access</a>
            <a href="#stories">Stories</a>
          </div>
          <div className="footer-copy">© {new Date().getFullYear()} GPSFDK.com · Enterprise Resource Planning</div>
        </div>
      </footer>
    </div>
  );
}
