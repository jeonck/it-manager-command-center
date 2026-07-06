/* ─────────── In-view trigger (IntersectionObserver + manual fallback)
   IO doesn't deliver notifications while the document is hidden (background
   tab / embedded preview), so a manual viewport check backs it up. ─────────── */
const inViewWatchers = [];
function onInView(el, cb, ratio = 0.12) {
  const w = { el, cb, ratio, done: false };
  w.io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) fireWatcher(w); });
  }, { threshold: ratio });
  w.io.observe(el);
  inViewWatchers.push(w);
}
function fireWatcher(w) {
  if (w.done) return;
  w.done = true;
  w.io.disconnect();
  w.cb(w.el);
}
function manualInViewCheck() {
  const vh = window.innerHeight || document.documentElement.clientHeight;
  inViewWatchers.forEach((w) => {
    if (w.done) return;
    const r = w.el.getBoundingClientRect();
    const visible = Math.min(r.bottom, vh) - Math.max(r.top, 0);
    if (visible > 0 && r.height > 0 && visible >= r.height * Math.min(w.ratio, 0.5)) fireWatcher(w);
  });
}
["scroll", "resize", "visibilitychange", "pageshow"].forEach((ev) =>
  window.addEventListener(ev, manualInViewCheck, { passive: true })
);
setTimeout(manualInViewCheck, 150);
setTimeout(manualInViewCheck, 900);

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
document.querySelectorAll(".count").forEach((el) => onInView(el, animateCount, 0.5));

/* ─────────── Scroll-reveal ─────────── */
const revealTargets = document.querySelectorAll(
  ".kpi-card, .agent-card, .strip-item, .pillar-col, .flow, .roadmap-step, .table-wrap, .teaser-card, .kpi-strip-item, .widget-panel"
);
revealTargets.forEach((el) => {
  el.classList.add("reveal");
  onInView(el, () => el.classList.add("visible"));
});

/* ─────────── Terminal helpers ─────────── */
function termLine(body, srcClass, srcText, msgText, msgClass) {
  const row = document.createElement("span");
  const src = document.createElement("span");
  src.className = srcClass;
  src.textContent = srcText;
  const msg = document.createElement("span");
  if (msgClass) msg.className = msgClass;
  msg.textContent = msgText;
  row.appendChild(src);
  row.appendChild(msg);
  row.appendChild(document.createTextNode("\n"));
  body.appendChild(row);
  body.scrollTop = body.scrollHeight;
}

function playLines(body, lines, done) {
  let i = 0;
  function next() {
    if (i >= lines.length) { if (done) done(); return; }
    const l = lines[i];
    termLine(body, l.c, l.t, l.r, l.cls);
    i += 1;
    setTimeout(next, 420 + Math.random() * 380);
  }
  next();
}

/* ─────────── Incident console (auto on home, interactive on operations) ─────────── */
const PHASE_DETECT = [
  { c: "t-dim",   t: "[22:41:03] prometheus  ", r: "alert PAYMENT_API_P99_LATENCY > 1.8s (threshold 800ms) — firing", cls: "t-crit" },
  { c: "t-agent", t: "[22:41:04] triage-agent ", r: "severity=P2 · blast radius: checkout flow, ~14% of traffic", cls: "" },
  { c: "t-agent", t: "[22:41:06] triage-agent ", r: "collecting: pod logs, recent deploys, dependency latency deltas…", cls: "t-dim" },
  { c: "t-agent", t: "[22:41:11] triage-agent ", r: "correlated: deploy payment-api@9f3c2e1 (22:38) ↔ latency spike (22:39)", cls: "t-warn" },
  { c: "t-agent", t: "[22:41:12] triage-agent ", r: "probable cause: connection-pool size reduced in 9f3c2e1 (config diff attached)", cls: "" },
  { c: "t-agent", t: "[22:41:13] jira         ", r: "created INC-2847 with evidence bundle (logs, diff, timeline) ✓", cls: "t-ok" },
  { c: "t-agent", t: "[22:41:13] slack        ", r: "#incident-bridge briefed: cause, impact, suggested runbook RB-114 (rollback)", cls: "t-ok" },
];

const PHASE_APPROVE = (mttr) => [
  { c: "t-human", t: "[22:43:20] oncall (you) ", r: "approve rollback payment-api → 8d1b7aa", cls: "" },
  { c: "t-agent", t: "[22:43:21] remediation  ", r: "rollback executed via GitOps revert PR #1042 (RB-114 pattern, change record auto-filed)", cls: "t-ok" },
  { c: "t-dim",   t: "[22:45:02] prometheus  ", r: "PAYMENT_API_P99_LATENCY recovered → 240ms. alert resolved.", cls: "t-ok" },
  { c: "t-agent", t: "[22:45:04] rca-agent    ", r: `RCA draft posted to INC-2847 · MTTR ${mttr} · human minutes spent: <2`, cls: "t-agent" },
];

const PHASE_INVESTIGATE = [
  { c: "t-human", t: "[22:43:20] oncall (you) ", r: "request deeper diagnostics before acting", cls: "" },
  { c: "t-agent", t: "[22:43:22] triage-agent ", r: "pulling connection-pool metrics + heap profile from payment-api pods…", cls: "t-dim" },
  { c: "t-agent", t: "[22:44:05] triage-agent ", r: "pool size 10 → 2 in 9f3c2e1; queue depth 340, thread starvation confirmed", cls: "t-warn" },
  { c: "t-agent", t: "[22:44:07] triage-agent ", r: "hypothesis confidence: 97% · no other correlated changes found", cls: "" },
];

const heroTerminal = document.getElementById("hero-terminal");
const termBody = document.getElementById("term-body");
const isInteractiveTerm = heroTerminal && heroTerminal.dataset.interactive === "true";

function termActions(buttons) {
  const wrap = document.createElement("div");
  wrap.className = "term-actions";
  buttons.forEach((b) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "term-action-btn " + (b.variant || "");
    btn.textContent = b.label;
    btn.addEventListener("click", () => { wrap.remove(); b.onClick(); });
    wrap.appendChild(btn);
  });
  termBody.appendChild(wrap);
  termBody.scrollTop = termBody.scrollHeight;
}

function playAutoTerminal() {
  termBody.innerHTML = "";
  playLines(termBody, [...PHASE_DETECT, ...PHASE_APPROVE("4m01s")].map((l, idx) =>
    idx === 7 ? { ...l, t: "[22:43:20] oncall@kim   " } : l
  ));
}

function playInteractiveTerminal() {
  termBody.innerHTML = "";
  playLines(termBody, PHASE_DETECT, () => {
    termLine(termBody, "t-dim", "", "── you are on call. the agent is waiting for your decision ──", "t-dim");
    termActions([
      {
        label: "✅ Approve rollback (RB-114)",
        variant: "ok",
        onClick: () => playLines(termBody, PHASE_APPROVE("4m01s"), () =>
          termLine(termBody, "t-dim", "", "── fast path: trusted the evidence bundle. MTTR 4m01s ──", "t-ok")),
      },
      {
        label: "🔍 Request more diagnostics",
        variant: "",
        onClick: () => playLines(termBody, PHASE_INVESTIGATE, () => {
          termActions([{
            label: "✅ Approve rollback now",
            variant: "ok",
            onClick: () => playLines(termBody, PHASE_APPROVE("6m48s").map((l) =>
              l.t.includes("22:43:2") ? { ...l, t: l.t.replace("22:43:2", "22:45:2") } : l
            ), () =>
              termLine(termBody, "t-dim", "", "── careful path: verified before acting. MTTR 6m48s — still 10× faster than manual ──", "t-ok")),
          }]);
        }),
      },
    ]);
  });
}

if (termBody) {
  const play = isInteractiveTerm ? playInteractiveTerminal : playAutoTerminal;
  onInView(heroTerminal, play, 0.35);
  const replayBtn = document.getElementById("term-replay");
  if (replayBtn) replayBtn.addEventListener("click", play);
}

/* ─────────── Governance: Ask-the-Auditor console ─────────── */
const AUDIT_QA = [
  {
    q: "Who changed the prod firewall rule, and who approved it?",
    cmd: "git log -2 --format='%h %an %s' -- infra/network/firewall.tf",
    out: [
      "b41c9e2  s.park   tighten ingress to 443 only (PR #987)",
      "PR #987 · approved-by: j.kim (network lead) · policy-check: PASS",
      "merged 2026-05-14 22:03 UTC · deployed by ArgoCD sync #4412",
    ],
  },
  {
    q: "Which assets are missing encryption or mandatory tags?",
    cmd: "opa eval -d policies/ 'data.compliance.violations' | jq length",
    out: [
      "0",
      "violations are blocked pre-merge — non-compliant Terraform cannot reach main",
      "last attempted violation: PR #1019 (rejected automatically, author notified)",
    ],
  },
  {
    q: "Show every change to payment-api last quarter.",
    cmd: "git log --since='3 months' --oneline services/payment-api/ | wc -l",
    out: [
      "27",
      "27 changes · 27 reviewed PRs · 0 out-of-band edits · 0 unresolved drift events",
      "full evidence bundle: exportable as CSV/PDF for the audit binder",
    ],
  },
  {
    q: "Is the Datadog contract current, and who owns it?",
    cmd: "yq '.vendors[] | select(.name==\"datadog\")' registry/vendors.yaml",
    out: [
      "renewal: 2026-11-01 · owner: it-ops@company.com · seats: 84/100 used",
      "auto-alert scheduled 60 days before renewal → Jira PROC-231",
    ],
  },
];

const auditBody = document.getElementById("audit-body");
const auditButtons = document.getElementById("audit-questions");
if (auditBody && auditButtons) {
  AUDIT_QA.forEach((item) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "audit-q";
    btn.textContent = item.q;
    btn.addEventListener("click", () => {
      auditButtons.querySelectorAll(".audit-q").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      auditBody.innerHTML = "";
      termLine(auditBody, "t-human", "auditor> ", item.q, "");
      setTimeout(() => {
        termLine(auditBody, "t-agent", "$ ", item.cmd, "t-dim");
        let i = 0;
        (function next() {
          if (i >= item.out.length) {
            termLine(auditBody, "t-dim", "", "⏱ answered in 1.4s — the old way: ~3 weeks of interviews and spreadsheet archaeology", "t-ok");
            return;
          }
          termLine(auditBody, "t-dim", "  ", item.out[i], "");
          i += 1;
          setTimeout(next, 300);
        })();
      }, 450);
    });
    auditButtons.appendChild(btn);
  });
  auditButtons.querySelector(".audit-q").click();
}

/* ─────────── FinOps: savings calculator ─────────── */
const finSpend = document.getElementById("fin-spend");
if (finSpend) {
  const finIdle = document.getElementById("fin-idle");
  const finNonprod = document.getElementById("fin-nonprod");
  const fmt = (n) => "$" + Math.round(n).toLocaleString("en-US");

  function updateFin() {
    const spend = parseInt(finSpend.value, 10) * 1000;
    const idle = parseInt(finIdle.value, 10) / 100;
    const nonprod = parseInt(finNonprod.value, 10) / 100;

    const idleSave = spend * idle * 0.9;            // reap 90% of identified idle
    const schedSave = spend * nonprod * 0.45;        // non-prod sleeps nights + weekends (~65% of hours, compute share)
    const anomalySave = spend * 0.03;                // anomalies caught before month-end
    const total = idleSave + schedSave + anomalySave;
    const pct = (total / spend) * 100;

    document.getElementById("fin-spend-label").textContent = fmt(spend) + "/mo";
    document.getElementById("fin-idle-label").textContent = finIdle.value + "%";
    document.getElementById("fin-nonprod-label").textContent = finNonprod.value + "%";

    document.getElementById("fin-idle-save").textContent = fmt(idleSave);
    document.getElementById("fin-sched-save").textContent = fmt(schedSave);
    document.getElementById("fin-anomaly-save").textContent = fmt(anomalySave);
    document.getElementById("fin-total").textContent = fmt(total) + "/mo";
    document.getElementById("fin-annual").textContent = fmt(total * 12) + "/yr";
    document.getElementById("fin-pct").textContent = pct.toFixed(1) + "%";

    const maxBar = spend * 0.5;
    document.getElementById("bar-idle").style.width = Math.min((idleSave / maxBar) * 100, 100) + "%";
    document.getElementById("bar-sched").style.width = Math.min((schedSave / maxBar) * 100, 100) + "%";
    document.getElementById("bar-anomaly").style.width = Math.min((anomalySave / maxBar) * 100, 100) + "%";
  }

  [finSpend, finIdle, finNonprod].forEach((el) => el.addEventListener("input", updateFin));
  updateFin();
}

/* ─────────── Agent model: autonomy ladder ─────────── */
const LEVELS = [
  {
    name: "L0 · Observe",
    risk: "No risk", riskClass: "risk-none",
    perms: ["Read metrics, logs, traces", "Read config & deploy history", "Post summaries to Slack"],
    gates: "None needed — strictly read-only.",
    example: "Agent collects diagnostics and posts an incident briefing. A human does everything else.",
  },
  {
    name: "L1 · Recommend",
    risk: "No risk", riskClass: "risk-none",
    perms: ["Everything in L0", "Draft remediation plans", "Pre-fill tickets & PRs (unmerged)"],
    gates: "Human reviews and executes every action manually.",
    example: "Agent proposes “rollback to 8d1b7aa” with an evidence bundle. The engineer runs it.",
  },
  {
    name: "L2 · Act with approval",
    risk: "Gated risk", riskClass: "risk-gated",
    perms: ["Everything in L1", "Execute scoped actions after explicit approval", "Auto-file the change record"],
    gates: "One-click human approval per action · every action creates an audit-trailed change record.",
    example: "On-call clicks Approve; the agent executes the rollback via a GitOps revert PR and documents it.",
  },
  {
    name: "L3 · Auto-remediate (scoped)",
    risk: "Bounded risk", riskClass: "risk-bounded",
    perms: ["Proven low-blast-radius patterns only", "Restart crashed pods, reap idle volumes", "Rollback deploys matching a known signature"],
    gates: "Pattern must pass N supervised runs first · kill switch + rate limit + max scope · weekly human review of every auto-action.",
    example: "A zombie dev VM is stopped at 2 a.m. without waking anyone. The action report is in the morning digest.",
  },
];

const ladder = document.getElementById("autonomy-range");
if (ladder) {
  function updateLadder() {
    const lv = LEVELS[parseInt(ladder.value, 10)];
    document.getElementById("ladder-name").textContent = lv.name;
    const badge = document.getElementById("ladder-risk");
    badge.textContent = lv.risk;
    badge.className = "ladder-risk " + lv.riskClass;
    document.getElementById("ladder-perms").innerHTML = lv.perms.map((p) => `<li>${p}</li>`).join("");
    document.getElementById("ladder-gates").textContent = lv.gates;
    document.getElementById("ladder-example").textContent = lv.example;
    document.querySelectorAll(".ladder-tick").forEach((t, i) => {
      t.classList.toggle("active", i <= parseInt(ladder.value, 10));
    });
  }
  ladder.addEventListener("input", updateLadder);
  updateLadder();
}

/* ─────────── ITIL: table live filter ─────────── */
const itilSearch = document.getElementById("itil-search");
if (itilSearch) {
  const rows = Array.from(document.querySelectorAll(".itil-table tbody tr"));
  const countEl = document.getElementById("itil-count");
  function applyFilter() {
    const q = itilSearch.value.trim().toLowerCase();
    let shown = 0;
    rows.forEach((row) => {
      const hit = !q || row.textContent.toLowerCase().includes(q);
      row.style.display = hit ? "" : "none";
      if (hit) shown += 1;
    });
    if (countEl) countEl.textContent = shown + " of " + rows.length + " practices";
  }
  itilSearch.addEventListener("input", applyFilter);
  document.querySelectorAll(".itil-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      itilSearch.value = chip.dataset.q || "";
      applyFilter();
    });
  });
  applyFilter();
}

/* ─────────── Roadmap: expandable quarters ─────────── */
document.querySelectorAll(".roadmap-step[data-expandable]").forEach((step) => {
  const toggle = () => {
    step.classList.toggle("open");
    step.setAttribute("aria-expanded", step.classList.contains("open") ? "true" : "false");
  };
  step.addEventListener("click", toggle);
  step.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); }
  });
});
