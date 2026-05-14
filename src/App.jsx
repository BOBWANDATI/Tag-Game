import { useState, useEffect, useCallback, useRef } from "react";
import "./App.css";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const TEAM_LEFT  = { id: "L", name: "Fire", color: "#ff4422", glow: "#ff220088", accent: "#ffaa00", dark: "#aa2200" };
const TEAM_RIGHT = { id: "R", name: "Ice",  color: "#22aaff", glow: "#0066ff88", accent: "#00ffee", dark: "#004488" };

// WIN when rope position reaches ±WIN_POS (10 pulls of 10 = 100)
const WIN_POS    = 100;
const PULL_AMT   = 10;   // Each correct pull = 10% toward win (10 pulls to win)
const TIME_LIMIT = 12;   // 12 seconds per question

const DIFFICULTIES = {
  Easy:   { ops: ["+", "-"],       range: 10 },
  Medium: { ops: ["+", "-", "×"],  range: 20 },
  Hard:   { ops: ["+", "-", "×"],  range: 45 },
};

function makeQ(diff) {
  const { ops, range } = DIFFICULTIES[diff];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a = Math.floor(Math.random() * range) + 2;
  let b = Math.floor(Math.random() * range) + 2;
  if (op === "-" && b > a) [a, b] = [b, a];
  const ans = op === "+" ? a + b : op === "-" ? a - b : a * b;
  return { a, b, op, ans, str: `${a} ${op} ${b}` };
}

function makeOpts(ans) {
  const s = new Set([ans]);
  const pool = [-5,-4,-3,-2,-1,1,2,3,4,5,6,-6,7,-7,8,-8];
  let i = 0;
  while (s.size < 4) { s.add(ans + pool[i++ % pool.length]); }
  return [...s].sort(() => Math.random() - 0.5);
}

// ─── SVG HUMAN ───────────────────────────────────────────────────────────────
function Human({ team, state, flipped }) {
  const c = team.color;
  const a = team.accent;
  const isPulling  = state === "pulling"  || state === "correct";
  const isDragged  = state === "dragged";
  const isWrong    = state === "wrong";
  const isWinning  = state === "winning";

  const leanX = isPulling ? (flipped ? 4 : -4) : isDragged ? (flipped ? -6 : 6) : 0;

  return (
    <svg viewBox="0 0 80 160" style={{ width: "100%", height: "100%", transform: `${flipped ? "scaleX(-1)" : "scaleX(1)"} translateX(${leanX}px)`, overflow: "visible", transition: "transform 0.2s ease" }}>
      <ellipse cx="40" cy="155" rx="22" ry="5" fill="rgba(0,0,0,0.4)" />
      <line x1="34" y1="112" x2={isPulling ? 24 : isDragged ? 38 : 28} y2="148" stroke={c} strokeWidth="10" strokeLinecap="round"/>
      <ellipse cx={isPulling ? 22 : isDragged ? 38 : 26} cy="149" rx="11" ry="5" fill={a}/>
      <line x1="46" y1="112" x2={isPulling ? 58 : isDragged ? 42 : 52} y2="148" stroke={c} strokeWidth="10" strokeLinecap="round"/>
      <ellipse cx={isPulling ? 60 : isDragged ? 42 : 54} cy="149" rx="11" ry="5" fill={a}/>
      <rect x="19" y="72" width="42" height="44" rx="12" fill={c} />
      <rect x="19" y="81" width="42" height="7" rx="3" fill={a} opacity="0.5" />
      <rect x="19" y="93" width="42" height="5" rx="2" fill={a} opacity="0.3" />
      <line x1="19" y1="82" x2={isPulling ? -2 : isDragged ? 12 : 6} y2={isPulling ? 105 : isDragged ? 88 : 88} stroke={c} strokeWidth="11" strokeLinecap="round"/>
      <circle cx={isPulling ? -2 : isDragged ? 12 : 6} cy={isPulling ? 105 : isDragged ? 88 : 88} r="8" fill={a}/>
      <line x1="61" y1="82" x2={isPulling ? 72 : 70} y2={isPulling ? 96 : 88} stroke={c} strokeWidth="11" strokeLinecap="round"/>
      <circle cx={isPulling ? 72 : 70} cy={isPulling ? 96 : 88} r="8" fill={a}/>
      <rect x="33" y="59" width="14" height="15" rx="7" fill={c} />
      <circle cx="40" cy="46" r="25" fill={c} />
      <circle cx="31" cy="37" r="9" fill="rgba(255,255,255,0.16)" />
      <path d="M14 46 Q40 14 66 46" stroke={a} strokeWidth="6" fill="none" strokeLinecap="round" />
      <circle cx="14" cy="46" r="5" fill={a} />
      <circle cx="66" cy="46" r="5" fill={a} />

      {isWrong || isDragged ? (
        <>
          <line x1="28" y1="39" x2="36" y2="47" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"/>
          <line x1="36" y1="39" x2="28" y2="47" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"/>
          <line x1="44" y1="39" x2="52" y2="47" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"/>
          <line x1="52" y1="39" x2="44" y2="47" stroke="#fff" strokeWidth="3.5" strokeLinecap="round"/>
          <path d="M28 56 Q40 50 52 56" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
          <ellipse cx="58" cy="32" rx="3" ry="5" fill="#88ccff" opacity="0.7"/>
        </>
      ) : isWinning ? (
        <>
          <path d="M26 43 Q32 36 38 43" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round"/>
          <path d="M42 43 Q48 36 54 43" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round"/>
          <path d="M26 54 Q40 65 54 54" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round"/>
          <text x="60" y="28" fill="#f1c40f" fontSize="14">★</text>
          <text x="8" y="28" fill="#f1c40f" fontSize="10">✦</text>
        </>
      ) : isPulling ? (
        <>
          <ellipse cx="32" cy="43" rx="6" ry="3.5" fill="#fff"/>
          <ellipse cx="48" cy="43" rx="6" ry="3.5" fill="#fff"/>
          <ellipse cx="32" cy="43" rx="3" ry="2" fill="#111"/>
          <ellipse cx="48" cy="43" rx="3" ry="2" fill="#111"/>
          <rect x="28" y="52" width="24" height="7" rx="3" fill="#fff"/>
          <line x1="34" y1="52" x2="34" y2="59" stroke={c} strokeWidth="1.5"/>
          <line x1="40" y1="52" x2="40" y2="59" stroke={c} strokeWidth="1.5"/>
          <ellipse cx="58" cy="34" rx="3" ry="5" fill="#aaddff" opacity="0.7"/>
        </>
      ) : (
        <>
          <circle cx="32" cy="43" r="5.5" fill="#fff"/>
          <circle cx="48" cy="43" r="5.5" fill="#fff"/>
          <circle cx="33" cy="43" r="2.5" fill="#222"/>
          <circle cx="49" cy="43" r="2.5" fill="#222"/>
          <path d="M30 54 Q40 62 50 54" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
        </>
      )}
      {isPulling && (
        <>
          <circle cx="-2" cy="105" r="9" fill={a} stroke="#fff" strokeWidth="2"/>
          <line x1="-7" y1="102" x2="-7" y2="108" stroke={c} strokeWidth="1.5"/>
          <line x1="-2" y1="101" x2="-2" y2="109" stroke={c} strokeWidth="1.5"/>
        </>
      )}
    </svg>
  );
}

// ─── ROPE ─────────────────────────────────────────────────────────────────────
function Rope({ ropePos, tick, leftX, rightX }) {
  const sag = 18 + Math.abs(ropePos) * 0.04;
  const wave = (tick || 0) * 0.15;
  const pts = [];
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    const x = leftX + t * (rightX - leftX);
    const y = 50 + Math.sin(t * Math.PI) * sag + Math.sin(t * Math.PI * 6 + wave) * 1.5;
    pts.push(`${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`);
  }
  const d = pts.join(" ");
  const flagT = 0.5;
  const flagX = leftX + flagT * (rightX - leftX);
  const flagY = 50 + Math.sin(flagT * Math.PI) * sag;
  const flagCol = ropePos < -12 ? TEAM_LEFT.color : ropePos > 12 ? TEAM_RIGHT.color : "#f1c40f";

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: "100%", height: "100%", position: "absolute", top: 0, left: 0 }}>
      <path d={d} stroke="rgba(0,0,0,0.45)" strokeWidth="4.5" fill="none" transform="translate(0,5)" />
      <path d={d} stroke="#6b4510" strokeWidth="5" fill="none" strokeLinecap="round"/>
      <path d={d} stroke="#c88820" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeDasharray="9,5"/>
      <path d={d} stroke="#f0c040" strokeWidth="1.4" fill="none" strokeLinecap="round" strokeDasharray="5,9" strokeDashoffset="5"/>
      <line x1="50" y1="10" x2="50" y2="90" stroke="rgba(255,255,255,0.25)" strokeWidth="0.8" strokeDasharray="4,3"/>
      <line x1={flagX} y1={flagY - 14} x2={flagX} y2={flagY + 4} stroke="#fff" strokeWidth="1.6"/>
      <polygon points={`${flagX},${flagY - 14} ${flagX + 14},${flagY - 7} ${flagX},${flagY}`} fill={flagCol} stroke="rgba(255,255,255,0.8)" strokeWidth="0.5"/>
    </svg>
  );
}

// ─── TIMER RING ───────────────────────────────────────────────────────────────
function TimerRing({ timeLeft }) {
  const pct = timeLeft / TIME_LIMIT;
  const circ = 2 * Math.PI * 16;
  const col = timeLeft > 7 ? "#2ecc71" : timeLeft > 4 ? "#f1c40f" : "#ff3333";
  return (
    <svg viewBox="0 0 40 40" style={{ width: 48, height: 48 }}>
      <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3.5"/>
      <circle cx="20" cy="20" r="16" fill="none" stroke={col} strokeWidth="3.5"
        strokeDasharray={`${pct * circ} ${circ}`} strokeDashoffset={circ * 0.25} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.2s linear, stroke 0.3s" }}/>
      <text x="20" y="25" textAnchor="middle" fill={col} fontSize="12" fontWeight="900">{timeLeft}</text>
    </svg>
  );
}

// ─── QUESTION CARD with BIGGER BUTTONS ────────────────────────────────────────
function QCard({ team, q, opts, onAnswer, timeLeft, answered, correct, side }) {
  return (
    <div className={`qpanel qpanel-${side} ${answered ? (correct ? "qp-ok" : "qp-no") : ""}`}
      style={{ "--tc": team.color, "--ta": team.accent, "--tg": team.glow }}>
      <div className="qp-header">
        <div className="qp-name" style={{ color: team.color }}>{team.name}</div>
        {!answered && <TimerRing timeLeft={timeLeft} />}
      </div>
      {!answered ? (
        <>
          <div className="qp-eq">
            {q.str} <span className="qp-eq-eq">=</span> <span className="qp-q">?</span>
          </div>
          <div className="qp-opts">
            {opts.map(o => (
              <button key={o} className="qp-btn" onClick={() => onAnswer(o)}>
                {o}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="qp-done">
          {correct ? <div className="qp-win">💪 PULL!</div> : <div className="qp-lose">❌ Wrong!</div>}
          <div className="qp-reveal">{q.str} = <strong>{q.ans}</strong></div>
        </div>
      )}
    </div>
  );
}

// ─── HUD BAR ─────────────────────────────────────────────────────────────────
function HudBar({ ropePos, scoreL, scoreR }) {
  const markerPct = ((ropePos + WIN_POS) / (WIN_POS * 2)) * 100;
  const pullsNeededL = Math.ceil((WIN_POS + ropePos) / PULL_AMT);
  const pullsNeededR = Math.ceil((WIN_POS - ropePos) / PULL_AMT);
  
  return (
    <div className="hud">
      <div className="hud-s" style={{ color: TEAM_LEFT.color, textShadow: `0 0 14px ${TEAM_LEFT.color}` }}>
        {scoreL}
        <div className="hud-pulls">{pullsNeededL} pulls</div>
      </div>
      <div className="hud-mid">
        <div className="hud-tug">
          <div className="hud-tug-fill-l" style={{ width: `${100 - markerPct}%` }}/>
          <div className="hud-tug-fill-r" style={{ width: `${markerPct}%` }}/>
          <div className="hud-marker" style={{ left: `${markerPct}%` }}>▼</div>
          <div className="hud-goal-l" /><div className="hud-goal-r" />
        </div>
        <div className="hud-lbls">
          <span style={{ color: TEAM_LEFT.color }}>🔥 {TEAM_LEFT.name}</span>
          <span style={{ color: TEAM_RIGHT.color }}>❄️ {TEAM_RIGHT.name}</span>
        </div>
      </div>
      <div className="hud-s" style={{ color: TEAM_RIGHT.color, textShadow: `0 0 14px ${TEAM_RIGHT.color}` }}>
        {scoreR}
        <div className="hud-pulls">{pullsNeededR} pulls</div>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("menu");
  const [diff, setDiff] = useState("Medium");
  const [ropePos, setRopePos] = useState(0);
  const [scoreL, setScoreL] = useState(0);
  const [scoreR, setScoreR] = useState(0);
  const [qL, setQL] = useState(null);
  const [qR, setQR] = useState(null);
  const [oL, setOL] = useState([]);
  const [oR, setOR] = useState([]);
  const [timeLeftL, setTimeLeftL] = useState(TIME_LIMIT);
  const [timeLeftR, setTimeLeftR] = useState(TIME_LIMIT);
  const [answeredL, setAnsweredL] = useState(false);
  const [answeredR, setAnsweredR] = useState(false);
  const [correctL, setCorrectL] = useState(false);
  const [correctR, setCorrectR] = useState(false);
  const [stateL, setStateL] = useState("idle");
  const [stateR, setStateR] = useState("idle");
  const [banner, setBanner] = useState("");
  const [showBan, setShowBan] = useState(false);
  const [winner, setWinner] = useState(null);
  const [tick, setTick] = useState(0);
  const [gameActive, setGameActive] = useState(true);
  const [processingPull, setProcessingPull] = useState(false);

  const timerLRef = useRef(null);
  const timerRRef = useRef(null);

  // Rope tick animation
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 75);
    return () => clearInterval(id);
  }, []);

  // Generate new question for a specific side
  const refreshQuestion = useCallback((side) => {
    const newQ = makeQ(diff);
    if (side === "L") {
      setQL(newQ);
      setOL(makeOpts(newQ.ans));
      setTimeLeftL(TIME_LIMIT);
      setAnsweredL(false);
      setCorrectL(false);
      setStateL("idle");
      // Restart timer for left side
      if (timerLRef.current) clearInterval(timerLRef.current);
      timerLRef.current = setInterval(() => {
        setTimeLeftL(prev => { if (prev <= 1) { clearInterval(timerLRef.current); return 0; } return prev - 1; });
      }, 1000);
    } else {
      setQR(newQ);
      setOR(makeOpts(newQ.ans));
      setTimeLeftR(TIME_LIMIT);
      setAnsweredR(false);
      setCorrectR(false);
      setStateR("idle");
      // Restart timer for right side
      if (timerRRef.current) clearInterval(timerRRef.current);
      timerRRef.current = setInterval(() => {
        setTimeLeftR(prev => { if (prev <= 1) { clearInterval(timerRRef.current); return 0; } return prev - 1; });
      }, 1000);
    }
  }, [diff]);

  // Start a new game
  const startGame = useCallback(() => {
    // Clean up all timers
    if (timerLRef.current) clearInterval(timerLRef.current);
    if (timerRRef.current) clearInterval(timerRRef.current);
    
    setRopePos(0);
    setScoreL(0);
    setScoreR(0);
    setWinner(null);
    setShowBan(false);
    setGameActive(true);
    setProcessingPull(false);
    setStateL("idle");
    setStateR("idle");
    
    // Generate fresh questions for both sides
    const newQL = makeQ(diff);
    const newQR = makeQ(diff);
    setQL(newQL);
    setQR(newQR);
    setOL(makeOpts(newQL.ans));
    setOR(makeOpts(newQR.ans));
    setTimeLeftL(TIME_LIMIT);
    setTimeLeftR(TIME_LIMIT);
    setAnsweredL(false);
    setAnsweredR(false);
    setCorrectL(false);
    setCorrectR(false);
    
    setScreen("game");
    
    // Start timers independently
    timerLRef.current = setInterval(() => {
      setTimeLeftL(prev => { if (prev <= 1) { clearInterval(timerLRef.current); return 0; } return prev - 1; });
    }, 1000);
    timerRRef.current = setInterval(() => {
      setTimeLeftR(prev => { if (prev <= 1) { clearInterval(timerRRef.current); return 0; } return prev - 1; });
    }, 1000);
  }, [diff]);

  // Handle timer expiration
  useEffect(() => {
    if (!gameActive || screen !== "game") return;
    if (timeLeftL === 0 && !answeredL && !processingPull) {
      setAnsweredL(true);
      setCorrectL(false);
      setStateL("wrong");
    }
  }, [timeLeftL, gameActive, screen, answeredL, processingPull]);

  useEffect(() => {
    if (!gameActive || screen !== "game") return;
    if (timeLeftR === 0 && !answeredR && !processingPull) {
      setAnsweredR(true);
      setCorrectR(false);
      setStateR("wrong");
    }
  }, [timeLeftR, gameActive, screen, answeredR, processingPull]);

  // Process pull when a player answers
  const processPull = useCallback((side) => {
    if (!gameActive || processingPull) return;
    
    const isLeft = side === "L";
    const answered = isLeft ? answeredL : answeredR;
    const correct = isLeft ? correctL : correctR;
    
    if (!answered) return;
    
    setProcessingPull(true);
    
    // Determine pull direction
    let delta = 0;
    
    if (correct) {
      // Correct answer - pull toward this team
      if (isLeft) {
        delta = -PULL_AMT;
        setScoreL(prev => prev + 1);
        setStateL("pulling");
        setStateR("dragged");
        setTimeout(() => setStateL("idle"), 500);
        setTimeout(() => setStateR("idle"), 700);
      } else {
        delta = +PULL_AMT;
        setScoreR(prev => prev + 1);
        setStateR("pulling");
        setStateL("dragged");
        setTimeout(() => setStateR("idle"), 500);
        setTimeout(() => setStateL("idle"), 700);
      }
    } else {
      // Wrong answer - opponent pulls
      if (isLeft) {
        delta = +PULL_AMT;
        setScoreR(prev => prev + 1);
        setStateR("pulling");
        setStateL("dragged");
        setTimeout(() => setStateR("idle"), 500);
        setTimeout(() => setStateL("idle"), 700);
      } else {
        delta = -PULL_AMT;
        setScoreL(prev => prev + 1);
        setStateL("pulling");
        setStateR("dragged");
        setTimeout(() => setStateL("idle"), 500);
        setTimeout(() => setStateR("idle"), 700);
      }
    }
    
    // Update rope position
    const newRopePos = Math.max(-WIN_POS, Math.min(WIN_POS, ropePos + delta));
    setRopePos(newRopePos);
    
    // Show banner message
    let msg = "";
    if (correct) {
      msg = isLeft ? "🔥 FIRE PULLS! Ice gets dragged!" : "❄️ ICE PULLS! Fire gets dragged!";
    } else {
      msg = isLeft ? "❌ Fire missed! Ice counter-pulls!" : "❌ Ice missed! Fire counter-pulls!";
    }
    setBanner(msg);
    setShowBan(true);
    setTimeout(() => setShowBan(false), 1200);
    
    // Check win condition
    if (newRopePos <= -WIN_POS) {
      setGameActive(false);
      setStateL("winning");
      setStateR("dragged");
      setWinner(TEAM_LEFT);
      setTimeout(() => setScreen("result"), 1200);
      return;
    }
    if (newRopePos >= WIN_POS) {
      setGameActive(false);
      setStateR("winning");
      setStateL("dragged");
      setWinner(TEAM_RIGHT);
      setTimeout(() => setScreen("result"), 1200);
      return;
    }
    
    // Refresh the question for the side that answered
    refreshQuestion(side);
    
    setTimeout(() => {
      setProcessingPull(false);
    }, 800);
  }, [gameActive, processingPull, answeredL, answeredR, correctL, correctR, ropePos, refreshQuestion]);

  // Watch for answers
  useEffect(() => {
    if (answeredL && gameActive && !processingPull && screen === "game") {
      processPull("L");
    }
  }, [answeredL, gameActive, processingPull, screen, processPull]);

  useEffect(() => {
    if (answeredR && gameActive && !processingPull && screen === "game") {
      processPull("R");
    }
  }, [answeredR, gameActive, processingPull, screen, processPull]);

  const handleAnswer = useCallback((side, value) => {
    if (!gameActive || processingPull) return;
    
    if (side === "L") {
      if (answeredL) return;
      const isCorrect = value === qL?.ans;
      setCorrectL(isCorrect);
      setAnsweredL(true);
      setStateL(isCorrect ? "correct" : "wrong");
      if (timerLRef.current) clearInterval(timerLRef.current);
    } else {
      if (answeredR) return;
      const isCorrect = value === qR?.ans;
      setCorrectR(isCorrect);
      setAnsweredR(true);
      setStateR(isCorrect ? "correct" : "wrong");
      if (timerRRef.current) clearInterval(timerRRef.current);
    }
  }, [gameActive, processingPull, answeredL, answeredR, qL, qR]);

  const goToMenu = useCallback(() => {
    if (timerLRef.current) clearInterval(timerLRef.current);
    if (timerRRef.current) clearInterval(timerRRef.current);
    setScreen("menu");
    setGameActive(false);
    setProcessingPull(false);
  }, []);

  const norm = ropePos / WIN_POS;
  const leftCharPct = 18 + Math.max(0, norm) * 30;
  const rightCharPct = 82 + Math.min(0, norm) * 30;

  // ── MENU ─────────────────────────────────────────────────────────────────
  if (screen === "menu") return (
    <div className="app menu">
      <div className="menu-bg" />
      <div className="menu-glow-l" />
      <div className="menu-glow-r" />
      <div className="menu-stage">
        <div className="menu-char-l"><Human team={TEAM_LEFT} state="idle" /></div>
        <div className="menu-rope-preview"><Rope ropePos={0} tick={tick} leftX={22} rightX={78} /></div>
        <div className="menu-char-r"><Human team={TEAM_RIGHT} state="idle" flipped /></div>
        <div className="menu-floor" />
      </div>
      <h1 className="menu-title">
        <span className="mt-fire">MATH</span>
        <span className="mt-mid"> TUG </span>
        <span className="mt-ice">OF WAR</span>
      </h1>
      <p className="menu-sub">⚡ ANSWER FAST — PULL HARD — DRAG THEM TO THE LINE! ⚡</p>
      <div className="menu-card">
        <div className="mc-row">
          <div className="mc-col">
            <div className="mc-label">⚙ DIFFICULTY</div>
            <div className="mc-pills">
              {Object.keys(DIFFICULTIES).map(d => (
                <button key={d} className={`mpill ${diff === d ? "mpill-on" : ""}`} onClick={() => setDiff(d)}>{d}</button>
              ))}
            </div>
          </div>
        </div>
        <button className="start-btn" onClick={startGame}>⚡ START TUG OF WAR ⚡</button>
        <div className="mc-rules">
          <b>🔥 HOW TO WIN:</b> Answer your math question correctly to PULL the rope!<br/>
          ⚡ <strong>NO WAITING:</strong> The moment you answer, the pull happens instantly!<br/>
          💪 Each correct pull drags your opponent <strong>10%</strong> toward the center line.<br/>
          🏆 <strong>10 PULLS = VICTORY!</strong> First to drag the enemy past the center line WINS!<br/>
          ❌ Wrong answer = you get dragged instead. Don't let the timer run out!
        </div>
      </div>
      <div className="footer-credit">Created by Abob Wandati — Software Engineer</div>
    </div>
  );

  // ── RESULT ───────────────────────────────────────────────────────────────
  if (screen === "result") {
    const isDraw = winner === "draw";
    const wt = !isDraw ? winner : null;
    return (
      <div className="app result">
        <div className="res-glow" style={{ background: wt ? `radial-gradient(ellipse at center, ${wt.glow} 0%, transparent 60%)` : "none" }} />
        <div className="res-card">
          <div className="res-confetti">🏆 🎉 🎆 🥇 🎊</div>
          <h2 className="res-title" style={{ color: wt ? wt.color : "#f1c40f", textShadow: `0 0 40px ${wt ? wt.color : "#f1c40f"}` }}>
            {isDraw ? "DRAW! 🤝" : `🎉 ${wt.name.toUpperCase()} WINS! 🎉`}
          </h2>
          <div className="res-stage">
            <div className="res-char" style={{ width: "100px", height: "180px" }}>
              <Human team={TEAM_LEFT} state={wt === TEAM_LEFT ? "winning" : wt === TEAM_RIGHT ? "dragged" : "idle"} />
              <div className="res-score" style={{ color: TEAM_LEFT.color }}>{scoreL}</div>
            </div>
            <div className="res-rope" style={{ height: "100px", flex: 1 }}>
              <Rope ropePos={ropePos} tick={tick} leftX={20} rightX={80} />
            </div>
            <div className="res-char" style={{ width: "100px", height: "180px" }}>
              <Human team={TEAM_RIGHT} state={wt === TEAM_RIGHT ? "winning" : wt === TEAM_LEFT ? "dragged" : "idle"} flipped />
              <div className="res-score" style={{ color: TEAM_RIGHT.color }}>{scoreR}</div>
            </div>
          </div>
          <div className="res-btns">
            <button className="start-btn" onClick={startGame}>🔄 PLAY AGAIN</button>
            <button className="outline-btn" onClick={goToMenu}>🏠 MENU</button>
          </div>
        </div>
        <div className="footer-credit">Created by Abob Wandati — Software Engineer</div>
      </div>
    );
  }

  // ── GAME ─────────────────────────────────────────────────────────────────
  return (
    <div className="app game">
      <div className="game-bg" />
      <div className="game-glow-l" />
      <div className="game-glow-r" />
      <HudBar ropePos={ropePos} scoreL={scoreL} scoreR={scoreR} />
      <div className="arena">
        <div className="arena-floor" />
        <div className="arena-floor-line" />
        <div className="arena-rope">
          <Rope ropePos={ropePos} tick={tick} leftX={leftCharPct + 1.5} rightX={rightCharPct - 1.5} />
        </div>
        <div className={`arena-char arena-char-l ${stateL === "pulling" ? "char-lunge-l" : ""}`} style={{ left: `${leftCharPct}%`, position: "relative" }}>
          <Human team={TEAM_LEFT} state={stateL} />
          {stateL === "pulling" && <div className="dust dust-l" />}
        </div>
        <div className={`arena-char arena-char-r ${stateR === "pulling" ? "char-lunge-r" : ""}`} style={{ left: `${rightCharPct}%`, position: "relative" }}>
          <Human team={TEAM_RIGHT} state={stateR} flipped />
          {stateR === "pulling" && <div className="dust dust-r" />}
        </div>
      </div>
      {showBan && <div className="banner">{banner}</div>}
      <div className="panels">
        {qL && <QCard team={TEAM_LEFT} q={qL} opts={oL} onAnswer={v => handleAnswer("L", v)} timeLeft={timeLeftL} answered={answeredL} correct={correctL} side="left" />}
        {qR && <QCard team={TEAM_RIGHT} q={qR} opts={oR} onAnswer={v => handleAnswer("R", v)} timeLeft={timeLeftR} answered={answeredR} correct={correctR} side="right" />}
      </div>
      <div className="footer-credit game-credit">Created by Abob Wandati — Software Engineer</div>
    </div>
  );
}
