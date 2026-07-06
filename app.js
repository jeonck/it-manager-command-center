/* ─────────── Animated KPI counters ─────────── */
function animateCount(el) {
  const target = parseInt(el.dataset.target, 10);
  const duration = 1400;
  const start = performance.now();
  function tick(now) {
    const p = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - p, 3);
    el.textContent = Math.round(target * eased);
    if (p < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      animateCount(e.target);
      counterObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll(".count").forEach((el) => counterObserver.observe(el));

/* ─────────── Scroll-reveal ─────────── */
const revealTargets = document.querySelectorAll(
  ".kpi-card, .agent-card, .strip-item, .pillar-col, .flow, .roadmap-step, .table-wrap"
);
revealTargets.forEach((el) => el.classList.add("reveal"));
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      e.target.classList.add("visible");
      revealObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
revealTargets.forEach((el) => revealObserver.observe(el));

/* ─────────── Simulated agent incident console ─────────── */
const SCRIPT = [
  { c: "t-dim",   t: "[22:41:03] prometheus  " , r: "alert PAYMENT_API_P99_LATENCY > 1.8s (threshold 800ms) — firing" , cls: "t-crit" },
  { c: "t-agent", t: "[22:41:04] triage-agent " , r: "severity=P2 · blast radius: checkout flow, ~14% of traffic" , cls: "" },
  { c: "t-agent", t: "[22:41:06] triage-agent " , r: "collecting: pod logs, recent deploys, dependency latency deltas…" , cls: "t-dim" },
  { c: "t-agent", t: "[22:41:11] triage-agent " , r: "correlated: deploy payment-api@9f3c2e1 (22:38) ↔ latency spike (22:39)" , cls: "t-warn" },
  { c: "t-agent", t: "[22:41:12] triage-agent " , r: "probable cause: connection-pool size reduced in 9f3c2e1 (config diff attached)" , cls: "" },
  { c: "t-agent", t: "[22:41:13] jira         " , r: "created INC-2847 with evidence bundle (logs, diff, timeline) ✓" , cls: "t-ok" },
  { c: "t-agent", t: "[22:41:13] slack        " , r: "#incident-bridge briefed: cause, impact, suggested runbook RB-114 (rollback)" , cls: "t-ok" },
  { c: "t-human", t: "[22:43:20] oncall@kim   " , r: "approve rollback payment-api → 8d1b7aa" , cls: "" },
  { c: "t-agent", t: "[22:43:21] remediation  " , r: "rollback executed via GitOps revert PR #1042 (auto-approved: RB-114 pattern)" , cls: "t-ok" },
  { c: "t-dim",   t: "[22:45:02] prometheus  " , r: "PAYMENT_API_P99_LATENCY recovered → 240ms. alert resolved." , cls: "t-ok" },
  { c: "t-agent", t: "[22:45:04] rca-agent    " , r: "RCA draft posted to INC-2847 · MTTR 4m01s · human minutes spent: <2" , cls: "t-agent" },
];

const termBody = document.getElementById("term-body");
let termTimer = null;

function playTerminal() {
  if (!termBody) return;
  clearTimeout(termTimer);
  termBody.innerHTML = "";
  let i = 0;
  function next() {
    if (i >= SCRIPT.length) return;
    const line = SCRIPT[i];
    const row = document.createElement("span");
    const src = document.createElement("span");
    src.className = line.c;
    src.textContent = line.t;
    const msg = document.createElement("span");
    if (line.cls) msg.className = line.cls;
    msg.textContent = line.r;
    row.appendChild(src);
    row.appendChild(msg);
    row.appendChild(document.createTextNode("\n"));
    termBody.appendChild(row);
    i += 1;
    termTimer = setTimeout(next, i === 1 ? 500 : 420 + Math.random() * 380);
  }
  next();
}

const termObserver = new IntersectionObserver((entries) => {
  entries.forEach((e) => {
    if (e.isIntersecting) {
      playTerminal();
      termObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.35 });
if (termBody) termObserver.observe(document.getElementById("hero-terminal"));

const replayBtn = document.getElementById("term-replay");
if (replayBtn) replayBtn.addEventListener("click", playTerminal);
