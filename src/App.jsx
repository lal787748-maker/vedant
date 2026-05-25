import { useState, useEffect, useRef, useCallback } from "react";

/* ─── Constants ─────────────────────────────────────────────────────── */
const CATEGORY = {
  Critical: { color: "#F87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.28)", label: "CRITICAL",      order: 0 },
  High:     { color: "#FB923C", bg: "rgba(251,146,60,0.1)",  border: "rgba(251,146,60,0.28)",  label: "HIGH PRIORITY", order: 1 },
  Moderate: { color: "#FCD34D", bg: "rgba(252,211,77,0.1)",  border: "rgba(252,211,77,0.28)",  label: "MODERATE",      order: 2 },
  Routine:  { color: "#4ADE80", bg: "rgba(74,222,128,0.1)",  border: "rgba(74,222,128,0.28)",  label: "ROUTINE",       order: 3 },
};

const HOURS = [9,10,11,12,13,14,15,16,17];

const INITIAL_PATIENTS = {
  9:  [
    { id:"p1", name:"Priya Sharma",  category:"Critical", urgencyScore:9, primarySymptoms:"Severe chest pain, shortness of breath",        visitType:"first",    requiresSpecialist:true,  requiresLongerConsult:true,  estimatedDuration:60, doctorSummary:"45F presenting with acute chest pain and dyspnea. No prior cardiac history. Urgent ECG and troponin recommended. Cardiology referral advised.", referralType:"self-referred", preExistingConditions:"None known", medications:"None", recommendedSlot:"9" },
    { id:"p2", name:"Arun Mehta",    category:"High",     urgencyScore:7, primarySymptoms:"Persistent headache, blurred vision (3 days)",   visitType:"follow-up", requiresSpecialist:false, requiresLongerConsult:false, estimatedDuration:45, doctorSummary:"62M hypertensive on Amlodipine 5mg OD. Severe headache and new-onset vision blurring. Last BP 162/104. Hypertensive emergency to be ruled out; fundoscopy indicated.", referralType:"doctor-referred", preExistingConditions:"Hypertension (10 yrs)", medications:"Amlodipine 5mg OD", recommendedSlot:"9" },
  ],
  10: [{ id:"p3", name:"Sunita Patel", category:"Moderate", urgencyScore:4, primarySymptoms:"Persistent fatigue, elevated fasting glucose", visitType:"follow-up", requiresSpecialist:false, requiresLongerConsult:false, estimatedDuration:30, doctorSummary:"55F with T2DM, routine review. HbA1c 8.2% three months ago. On Metformin 500mg BD. Reports fatigue and diet difficulty. Medication review and nutrition counseling warranted.", referralType:"doctor-referred", preExistingConditions:"Type 2 Diabetes Mellitus", medications:"Metformin 500mg BD", recommendedSlot:"10" }],
  11: [{ id:"p4", name:"Rajan Desai",  category:"Routine",  urgencyScore:2, primarySymptoms:"Annual health checkup, no complaints",         visitType:"first",    requiresSpecialist:false, requiresLongerConsult:false, estimatedDuration:30, doctorSummary:"38M, no comorbidities. Presenting for routine annual check. BP, fasting glucose, CBC, and lipid panel indicated. Low clinical risk.", referralType:"self-referred", preExistingConditions:"None", medications:"None", recommendedSlot:"11" }],
  14: [{ id:"p5", name:"Kavita Joshi", category:"High",     urgencyScore:6, primarySymptoms:"Acute lower back pain radiating to left leg",  visitType:"first",    requiresSpecialist:true,  requiresLongerConsult:false, estimatedDuration:45, doctorSummary:"42F with 5-day LBP and left leg radiation with paresthesia. L4/L5 herniation suspected. MRI lumbar spine recommended. Orthopedic referral warranted.", referralType:"self-referred", preExistingConditions:"None", medications:"Ibuprofen 400mg PRN", recommendedSlot:"14" }],
};

const SYSTEM_PROMPT = `You are ARIA, the AI receptionist for Vedant Imaging Center. You conduct warm, efficient intake questionnaires.

Your tone is caring, professional, and concise — like an excellent medical receptionist who genuinely cares about patients.

Gather these details naturally (combine related questions where appropriate):
1. Full name
2. Reason for visit and primary symptoms
3. Urgency/pain level (1–10 scale)
4. Pre-existing conditions or chronic illnesses
5. First visit or follow-up
6. Current medications or recent procedures
7. Doctor-referred or self-referred

Categorize as:
- Critical: Urgency 8–10, acute or life-threatening
- High: Urgency 6–7, significant symptoms
- Moderate: Urgency 3–5, subacute or ongoing
- Routine: Urgency 1–2, preventive or wellness

Also determine: requiresSpecialist, requiresLongerConsult, estimatedDuration (30/45/60), recommendedSlot (9–17).

When intake is complete, give ONE warm closing sentence. Then append exactly:

[INTAKE_COMPLETE]
{"patientName":"Full Name","category":"Critical","urgencyScore":8,"primarySymptoms":"...","preExistingConditions":"...","visitType":"first","medications":"...","referralType":"self-referred","requiresSpecialist":false,"requiresLongerConsult":false,"estimatedDuration":30,"doctorSummary":"2–3 sentence clinical briefing: demographics, key symptoms, history, suggested next steps.","recommendedSlot":"10"}

Exact category values: Critical, High, Moderate, Routine`;

const DEMO_STEPS = [
  "Meera Iyer",
  "I've been having really bad migraines for the past week, sometimes with nausea.",
  "I'd say about a 6 out of 10. The pain is behind my eyes mostly.",
  "No chronic conditions that I know of.",
  "This is my first visit here.",
  "I take paracetamol occasionally but nothing regular.",
  "I came on my own, not referred by a doctor.",
];

let nextId = 20;

/* ─── Icons ─────────────────────────────────────────────────────────── */
const Icon = ({ d, size = 16, color = "currentColor", fill = "none", strokeWidth = 2, points, cx, cy, r, type }) => {
  const props = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth, strokeLinecap: "round", strokeLinejoin: "round" };
  if (type === "activity")   return <svg {...props}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
  if (type === "alert")      return <svg {...props}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
  if (type === "arrowup")    return <svg {...props}><circle cx="12" cy="12" r="10"/><polyline points="16 12 12 8 8 12"/><line x1="12" y1="16" x2="12" y2="8"/></svg>;
  if (type === "minus")      return <svg {...props}><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;
  if (type === "check")      return <svg {...props}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
  if (type === "mic")        return <svg {...props}><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;
  if (type === "micoff")     return <svg {...props}><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>;
  if (type === "vol")        return <svg {...props}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>;
  if (type === "voloff")     return <svg {...props}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>;
  if (type === "chevron")    return <svg {...props}><polyline points="9 18 15 12 9 6"/></svg>;
  if (type === "x")          return <svg {...props}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
  if (type === "stethoscope")return <svg {...props}><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>;
  if (type === "zap")        return <svg {...props}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
  return <svg {...props}><path d={d} fill={fill}/></svg>;
};

const CatIcon = ({ category, size = 16 }) => {
  const color = CATEGORY[category]?.color || "#fff";
  if (category === "Critical") return <Icon type="alert" size={size} color={color}/>;
  if (category === "High")     return <Icon type="arrowup" size={size} color={color}/>;
  if (category === "Moderate") return <Icon type="minus" size={size} color={color}/>;
  return <Icon type="check" size={size} color={color}/>;
};

/* ─── ARIA Face ──────────────────────────────────────────────────────── */
function ARIAFace({ state }) {
  const [blink, setBlink] = useState(false);
  const [mouthRy, setMouthRy] = useState(2);

  useEffect(() => {
    let t;
    const doBlink = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 110);
      t = setTimeout(doBlink, 2800 + Math.random() * 4000);
    };
    t = setTimeout(doBlink, 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (state !== "speaking") { setMouthRy(2); return; }
    const iv = setInterval(() => setMouthRy(Math.random() > 0.25 ? 4 + Math.random() * 8 : 1.5), 110 + Math.random() * 60);
    return () => clearInterval(iv);
  }, [state]);

  const stateColor = { idle:"#4ADE80", thinking:"#FCD34D", listening:"#F87171", speaking:"#38BDF8" }[state] || "#4ADE80";
  const ringColor  = state === "listening" ? "rgba(248,113,113,0.5)" : "rgba(56,189,248,0.45)";
  const ringColor2 = state === "listening" ? "rgba(248,113,113,0.2)" : "rgba(56,189,248,0.2)";
  const showRings  = state === "listening" || state === "speaking";

  return (
    <div style={{ position:"relative", width:170, height:200, margin:"0 auto" }}>
      {showRings && <>
        <div style={{ position:"absolute", inset:-18, borderRadius:"50%", border:`1.5px solid ${ringColor}`, animation:"ariaRing1 1.6s ease-out infinite", pointerEvents:"none" }}/>
        <div style={{ position:"absolute", inset:-34, borderRadius:"50%", border:`1px solid ${ringColor2}`, animation:"ariaRing2 1.6s ease-out 0.5s infinite", pointerEvents:"none" }}/>
      </>}
      <svg width="170" height="200" viewBox="0 0 170 200">
        <defs>
          <radialGradient id="fg" cx="50%" cy="38%" r="62%">
            <stop offset="0%" stopColor="#1b344f"/><stop offset="100%" stopColor="#080f1c"/>
          </radialGradient>
          <radialGradient id="eyeG" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#a0f0ff"/><stop offset="55%" stopColor="#38BDF8"/><stop offset="100%" stopColor="#0c6b8c"/>
          </radialGradient>
          <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="3" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="softG" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="5" result="b"/>
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <rect x="68" y="172" width="34" height="26" rx="5" fill="#080f1c" stroke="rgba(56,189,248,0.18)" strokeWidth="0.8"/>
        <ellipse cx="85" cy="96" rx="68" ry="80" fill="url(#fg)" stroke="#38BDF8" strokeWidth="1.2"/>
        <ellipse cx="85" cy="46" rx="30" ry="14" fill="rgba(56,189,248,0.06)"/>
        <path d="M22 87 L42 87 L47 82 L63 82" stroke="rgba(56,189,248,0.14)" strokeWidth="0.7" fill="none"/>
        <path d="M148 87 L128 87 L123 82 L107 82" stroke="rgba(56,189,248,0.14)" strokeWidth="0.7" fill="none"/>
        <circle cx="42" cy="87" r="1.8" fill="rgba(56,189,248,0.35)"/>
        <circle cx="128" cy="87" r="1.8" fill="rgba(56,189,248,0.35)"/>
        <ellipse cx="60" cy="90" rx="14" ry={blink ? 0.8 : 15} fill="#040a14" style={{ transition:"ry 0.08s ease" }}/>
        <ellipse cx="110" cy="90" rx="14" ry={blink ? 0.8 : 15} fill="#040a14" style={{ transition:"ry 0.08s ease" }}/>
        {!blink && <>
          <circle cx="60" cy="90" r="9" fill="url(#eyeG)" filter="url(#glow)"/>
          <circle cx="110" cy="90" r="9" fill="url(#eyeG)" filter="url(#glow)"/>
          <circle cx="60" cy="90" r="4.5" fill="#040e1c"/>
          <circle cx="110" cy="90" r="4.5" fill="#040e1c"/>
          <circle cx="62.5" cy="87" r="2.5" fill="rgba(255,255,255,0.88)"/>
          <circle cx="112.5" cy="87" r="2.5" fill="rgba(255,255,255,0.88)"/>
          <circle cx="60" cy="90" r="9" fill="none" stroke="rgba(160,240,255,0.25)" strokeWidth="1"/>
          <circle cx="110" cy="90" r="9" fill="none" stroke="rgba(160,240,255,0.25)" strokeWidth="1"/>
          <path d="M46 84 Q60 80 74 84" stroke="rgba(56,189,248,0.25)" strokeWidth="0.8" fill="none"/>
          <path d="M96 84 Q110 80 124 84" stroke="rgba(56,189,248,0.25)" strokeWidth="0.8" fill="none"/>
        </>}
        <path d="M82 112 Q85 120 88 112" stroke="rgba(56,189,248,0.22)" strokeWidth="1" fill="none" strokeLinecap="round"/>
        <ellipse cx="85" cy="140" rx="19" ry={mouthRy}
          fill={mouthRy > 3 ? "rgba(4,10,20,0.95)" : "none"}
          stroke="#38BDF8" strokeWidth="1.1"
          style={{ transition:"ry 0.09s ease" }}/>
        <ellipse cx="85" cy="172" rx="28" ry="5" fill="rgba(56,189,248,0.05)"/>
        <circle cx="85" cy="24" r="4" fill={stateColor} filter="url(#softG)"
          style={{ animation: state !== "idle" ? "ledPulse 0.9s ease infinite" : "none" }}/>
        <circle cx="85" cy="24" r="2" fill="white" opacity="0.5"/>
        {state === "thinking" && [0,1,2].map(i => (
          <circle key={i} cx={72+i*13} cy="162" r="3.5" fill="#FCD34D" opacity="0.8"
            style={{ animation:`thinkDot 1.1s ease ${i*0.22}s infinite` }}/>
        ))}
      </svg>
    </div>
  );
}

/* ─── Main App ───────────────────────────────────────────────────────── */
export default function App() {
  const [messages, setMessages] = useState([
    { role:"assistant", content:"Hello! I'm ARIA, your AI receptionist at Vedant Imaging Center. I'm here to help get you checked in quickly. Could you start by telling me your full name?" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState(INITIAL_PATIENTS);
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const [avatarState, setAvatarState] = useState("idle");
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [voiceMsg, setVoiceMsg] = useState("");
  const [demoIdx, setDemoIdx] = useState(0);

  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const demoTimerRef = useRef(null);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading, interim]);

  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  /* ── TTS ── */
  const speak = useCallback((text) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(text);
    utt.rate = 1.0; utt.pitch = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => /Samantha|Karen|Moira|Victoria|Susan|Zoe|Emma|Amy|Alice/i.test(v.name))
                   || voices.find(v => v.lang.startsWith("en")) || voices[0];
    if (preferred) utt.voice = preferred;
    utt.onstart = () => setAvatarState("speaking");
    utt.onend   = () => setAvatarState("idle");
    utt.onerror = () => setAvatarState("idle");
    window.speechSynthesis.speak(utt);
  }, [ttsEnabled]);

  const prevLen = useRef(1);
  useEffect(() => {
    if (messages.length <= prevLen.current) return;
    prevLen.current = messages.length;
    const last = messages[messages.length - 1];
    if (last?.role === "assistant") speak(last.content);
  }, [messages, speak]);

  useEffect(() => { if (loading) setAvatarState("thinking"); }, [loading]);

  /* ── Speech Recognition ── */
  const SpeechRec = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const startListening = useCallback(async () => {
    if (!SpeechRec) { setVoiceMsg("⚠ Use Chrome or Edge for voice input."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch {
      setVoiceMsg("🔒 Mic blocked — click the 🔒 icon in the address bar, allow microphone, then try again.");
      return;
    }
    window.speechSynthesis?.cancel();
    setAvatarState("listening");
    setVoiceMsg("");
    setInterim("");
    const rec = new SpeechRec();
    rec.lang = "en-IN"; rec.continuous = false; rec.interimResults = true;
    rec.onresult = (e) => {
      let final = "", inter = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        e.results[i].isFinal ? (final += t) : (inter += t);
      }
      if (final) { setInput(final.trim()); setInterim(""); setTimeout(() => sendTextDirect(final.trim()), 400); }
      else setInterim(inter);
    };
    rec.onerror = (e) => {
      setIsListening(false); setAvatarState("idle"); setInterim("");
      if (e.error === "not-allowed") setVoiceMsg("🔒 Mic denied — allow microphone in browser settings.");
      else if (e.error === "no-speech") setVoiceMsg("No speech detected. Tap mic and try again.");
      else if (e.error !== "aborted") setVoiceMsg(`Voice error: ${e.error}`);
    };
    rec.onend = () => { setIsListening(false); setAvatarState(s => s === "listening" ? "idle" : s); setInterim(""); };
    rec.start();
    recognitionRef.current = rec;
    setIsListening(true);
  }, [SpeechRec]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setIsListening(false); setAvatarState("idle"); setInterim("");
  }, []);

  /* ── API call ── */
  const parseIntake = (text) => {
    const idx = text.indexOf("[INTAKE_COMPLETE]");
    if (idx === -1) return null;
    try { return JSON.parse(text.slice(idx + 17).trim()); } catch { return null; }
  };

  const addToSchedule = (data, display) => {
    const id = `p${nextId++}`;
    const slot = Math.min(17, Math.max(9, parseInt(data.recommendedSlot) || 10));
    const patient = { id, name: data.patientName, ...data };
    setSchedule(prev => {
      const upd = { ...prev };
      upd[slot] = [...(upd[slot] || []), patient].sort((a,b) => CATEGORY[a.category].order - CATEGORY[b.category].order);
      return upd;
    });
    setToast(patient); setSelected(patient);
    setTimeout(() => setToast(null), 5000);
    setTimeout(() => {
      setMessages([{ role:"assistant", content:"Hello! I'm ARIA, your AI receptionist at Vedant Imaging Center. I'm here to help get you checked in quickly. Could you start by telling me your full name?" }]);
      setDemoIdx(0); setVoiceMsg(""); prevLen.current = 1;
    }, 5500);
  };

  const sendTextDirect = async (text) => {
    const trimmed = text?.trim();
    if (!trimmed || loading) return;
    setMessages(prev => {
      const history = [...prev, { role:"user", content: trimmed }];
      doApiCall(history);
      return history;
    });
    setInput("");
    setLoading(true);
  };

  const doApiCall = async (history) => {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: history.map(m => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      const raw = data.content?.[0]?.text || "Sorry, I couldn't process that. Please try again.";
      const intake = parseIntake(raw);
      const display = intake ? raw.slice(0, raw.indexOf("[INTAKE_COMPLETE]")).trim() : raw;
      setMessages(prev => [...prev, { role:"assistant", content: display, done: !!intake }]);
      if (intake) addToSchedule(intake, display);
    } catch {
      setMessages(prev => [...prev, { role:"assistant", content:"Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const sendText = () => {
    if (!input.trim() || loading) return;
    sendTextDirect(input);
  };

  /* ── Demo ── */
  const runDemoStep = () => {
    if (demoIdx >= DEMO_STEPS.length || loading) return;
    const response = DEMO_STEPS[demoIdx];
    setDemoIdx(p => p + 1);
    setVoiceMsg(`🎭 Demo: "${response}"`);
    let i = 0;
    setInput("");
    if (demoTimerRef.current) clearInterval(demoTimerRef.current);
    demoTimerRef.current = setInterval(() => {
      i++;
      setInput(response.slice(0, i));
      if (i >= response.length) {
        clearInterval(demoTimerRef.current);
        setTimeout(() => sendTextDirect(response), 400);
      }
    }, 22);
  };

  /* ── Helpers ── */
  const formatHour = h => h === 12 ? "12 PM" : h > 12 ? `${h-12} PM` : `${h} AM`;
  const currentHour = new Date().getHours();
  const allPts = Object.values(schedule).flat();
  const totalPts = allPts.length;
  const critCount = allPts.filter(p => p.category === "Critical").length;

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    ::-webkit-scrollbar { width: 3px; }
    ::-webkit-scrollbar-thumb { background: #172437; border-radius: 2px; }
    ::-webkit-scrollbar-track { background: transparent; }
    @keyframes ariaRing1 { 0% { transform:scale(1);opacity:.85 } 100% { transform:scale(1.5);opacity:0 } }
    @keyframes ariaRing2 { 0% { transform:scale(1);opacity:.5  } 100% { transform:scale(1.6);opacity:0 } }
    @keyframes ledPulse   { 0%,100% { opacity:1 } 50% { opacity:.35 } }
    @keyframes thinkDot   { 0%,100% { transform:translateY(0);opacity:.8 } 50% { transform:translateY(-5px);opacity:1 } }
    @keyframes micPulse   { 0%,100% { box-shadow:0 0 0 0 rgba(248,113,113,.6) } 70% { box-shadow:0 0 0 10px rgba(248,113,113,0) } }
    @keyframes waveBar    { 0%,100% { transform:scaleY(.3) } 50% { transform:scaleY(1) } }
    @keyframes speakBar   { 0%,100% { opacity:.5 } 50% { opacity:1 } }
    @keyframes fadeIn     { from { opacity:0;transform:translateY(4px) } to { opacity:1;transform:translateY(0) } }
    @keyframes blink      { 0%,100% { opacity:1 } 50% { opacity:.25 } }
    @keyframes toastIn    { from { opacity:0;transform:translateY(16px) } to { opacity:1;transform:translateY(0) } }
  `;

  return (
    <>
      <style>{css}</style>
      <div style={{ fontFamily:"'IBM Plex Sans',system-ui,sans-serif", background:"#07101F", color:"#DDE6F0", height:"100vh", display:"flex", flexDirection:"column", fontSize:14, overflow:"hidden" }}>

        {/* Header */}
        <header style={{ background:"#0C1828", borderBottom:"1px solid #172437", padding:"0 20px", height:54, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:30, height:30, borderRadius:7, background:"linear-gradient(135deg,#38BDF8,#3B82F6)", display:"flex", alignItems:"center", justifyContent:"center" }}>
              <Icon type="activity" size={15} color="#fff"/>
            </div>
            <div>
              <div style={{ fontWeight:600, fontSize:13.5, letterSpacing:"0.01em" }}>Vedant Imaging Center</div>
              <div style={{ fontSize:9.5, color:"#3A5570", fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.07em" }}>AI SCHEDULING SYSTEM</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:20, alignItems:"center" }}>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:17, fontWeight:600, fontFamily:"'IBM Plex Mono',monospace" }}>{totalPts}</div>
              <div style={{ fontSize:8.5, color:"#3A5570", letterSpacing:"0.05em" }}>PATIENTS</div>
            </div>
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:17, fontWeight:600, fontFamily:"'IBM Plex Mono',monospace", color:"#F87171" }}>{critCount}</div>
              <div style={{ fontSize:8.5, color:"#3A5570", letterSpacing:"0.05em" }}>CRITICAL</div>
            </div>
            <div style={{ fontSize:10.5, fontFamily:"'IBM Plex Mono',monospace", color:"#38BDF8", background:"rgba(56,189,248,0.08)", border:"1px solid rgba(56,189,248,0.18)", borderRadius:5, padding:"3px 9px" }}>
              {new Date().toLocaleDateString("en-IN",{ weekday:"short", day:"numeric", month:"short", year:"numeric" })}
            </div>
          </div>
        </header>

        <div style={{ display:"flex", flex:1, overflow:"hidden" }}>

          {/* ── ARIA Panel ── */}
          <div style={{ width:"36%", display:"flex", flexDirection:"column", borderRight:"1px solid #172437", background:"#080f1c" }}>

            {/* Avatar */}
            <div style={{ padding:"18px 16px 10px", borderBottom:"1px solid #172437", background:"linear-gradient(180deg,#0a1628 0%,#080f1c 100%)", flexShrink:0 }}>
              <ARIAFace state={avatarState}/>
              <div style={{ textAlign:"center", marginTop:10 }}>
                <div style={{ fontSize:15, fontWeight:600, letterSpacing:"0.04em" }}>ARIA</div>
                <div style={{ fontSize:9.5, color:"#3A5570", fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.08em", marginTop:2 }}>
                  {avatarState==="listening"?"● LISTENING":avatarState==="speaking"?"● SPEAKING":avatarState==="thinking"?"● PROCESSING":"AI RECEPTIONIST"}
                </div>
              </div>
              <div style={{ display:"flex", justifyContent:"center", marginTop:10 }}>
                <button onClick={() => { setTtsEnabled(p=>!p); window.speechSynthesis?.cancel(); setAvatarState("idle"); }}
                  style={{ background:ttsEnabled?"rgba(56,189,248,0.1)":"#101D2E", border:`1px solid ${ttsEnabled?"rgba(56,189,248,0.3)":"#172437"}`, borderRadius:6, padding:"4px 10px", cursor:"pointer", color:ttsEnabled?"#38BDF8":"#3A5570", fontSize:9.5, fontFamily:"'IBM Plex Mono',monospace", display:"flex", alignItems:"center", gap:5 }}>
                  {ttsEnabled ? <Icon type="vol" size={11}/> : <Icon type="voloff" size={11}/>}
                  {ttsEnabled ? "AI VOICE ON" : "AI VOICE OFF"}
                </button>
              </div>
            </div>

            {voiceMsg && (
              <div style={{ padding:"8px 14px", background:"rgba(251,146,60,0.07)", borderBottom:"1px solid rgba(251,146,60,0.18)", fontSize:10.5, color:"#FB923C", lineHeight:1.55, animation:"fadeIn 0.2s ease" }}>
                {voiceMsg}
              </div>
            )}
            {interim && (
              <div style={{ padding:"6px 14px", background:"rgba(248,113,113,0.05)", borderBottom:"1px solid rgba(248,113,113,0.12)", fontSize:11.5, color:"rgba(248,113,113,0.75)", fontStyle:"italic" }}>
                "{interim}"
              </div>
            )}

            {/* Chat */}
            <div style={{ flex:1, overflowY:"auto", padding:"12px 14px", display:"flex", flexDirection:"column", gap:8 }}>
              {messages.map((m, i) => (
                <div key={i} style={{ display:"flex", justifyContent:m.role==="assistant"?"flex-start":"flex-end", animation:"fadeIn 0.2s ease" }}>
                  <div style={{ maxWidth:"88%", background:m.role==="assistant"?"#0d1c2e":"rgba(56,189,248,0.09)", border:`1px solid ${m.role==="assistant"?"#172437":"rgba(56,189,248,0.2)"}`, borderRadius:m.role==="assistant"?"3px 9px 9px 9px":"9px 3px 9px 9px", padding:"9px 12px", fontSize:12.5, lineHeight:1.68, color:"#C8D8E8" }}>
                    {m.content}
                    {m.done && <div style={{ marginTop:7, paddingTop:7, borderTop:"1px solid #172437", fontSize:9.5, color:"#4ADE80", fontFamily:"'IBM Plex Mono',monospace" }}>✓ INTAKE COMPLETE — SCHEDULED</div>}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display:"flex", gap:5, padding:"9px 12px", background:"#0d1c2e", border:"1px solid #172437", borderRadius:"3px 9px 9px 9px", width:"fit-content" }}>
                  {[0,1,2].map(i => <div key={i} style={{ width:5, height:5, borderRadius:"50%", background:"#3A5570", animation:`blink 1.2s ease ${i*0.22}s infinite` }}/>)}
                </div>
              )}
              <div ref={chatEndRef}/>
            </div>

            {/* Input */}
            <div style={{ padding:"10px 14px 12px", borderTop:"1px solid #172437", flexShrink:0 }}>
              {isListening && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:3, height:20, marginBottom:8 }}>
                  {[0,1,2,3,4,5,6].map(i => <div key={i} style={{ width:3, height:18, background:"#F87171", borderRadius:2, transformOrigin:"bottom", animation:`waveBar 0.6s ease-in-out ${(i*0.1).toFixed(1)}s infinite` }}/>)}
                </div>
              )}
              {avatarState==="speaking" && !isListening && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:3, height:20, marginBottom:8 }}>
                  {[10,18,13,16].map((h,i) => <div key={i} style={{ width:3, height:h, background:"#38BDF8", borderRadius:2, animation:`speakBar 0.7s ease-in-out ${(i*0.18).toFixed(2)}s infinite` }}/>)}
                </div>
              )}
              <div style={{ display:"flex", gap:5 }}>
                <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendText()} disabled={loading}
                  placeholder={isListening?"Listening… speak now":"Type or use voice…"}
                  style={{ flex:1, background:"#101D2E", border:`1px solid ${isListening?"rgba(248,113,113,0.5)":"#172437"}`, borderRadius:7, padding:"8px 11px", color:"#DDE6F0", fontSize:12, fontFamily:"inherit", outline:"none" }}
                  onFocus={e=>!isListening&&(e.target.style.borderColor="#38BDF8")}
                  onBlur={e=>!isListening&&(e.target.style.borderColor="#172437")}
                />
                <button onClick={()=>isListening?stopListening():startListening()} disabled={loading}
                  style={{ width:36, height:36, borderRadius:7, border:"none", flexShrink:0, cursor:loading?"default":"pointer", background:isListening?"#EF4444":"rgba(248,113,113,0.12)", color:isListening?"#fff":"#F87171", display:"flex", alignItems:"center", justifyContent:"center", animation:isListening?"micPulse 1.3s ease infinite":"none", transition:"all 0.18s" }}>
                  {isListening ? <Icon type="micoff" size={14}/> : <Icon type="mic" size={14}/>}
                </button>
                <button onClick={sendText} disabled={!input.trim()||loading}
                  style={{ width:36, height:36, borderRadius:7, border:"none", flexShrink:0, cursor:input.trim()&&!loading?"pointer":"default", background:input.trim()&&!loading?"#38BDF8":"#172437", color:input.trim()&&!loading?"#07101F":"#3A5570", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.15s" }}>
                  <Icon type="chevron" size={16}/>
                </button>
              </div>
              <button onClick={runDemoStep} disabled={loading||demoIdx>=DEMO_STEPS.length}
                style={{ width:"100%", marginTop:7, background:"rgba(252,211,77,0.07)", border:"1px solid rgba(252,211,77,0.2)", borderRadius:6, padding:"6px 0", color:demoIdx>=DEMO_STEPS.length?"#3A5570":"#FCD34D", fontSize:9.5, fontFamily:"'IBM Plex Mono',monospace", cursor:loading||demoIdx>=DEMO_STEPS.length?"default":"pointer", letterSpacing:"0.05em", display:"flex", alignItems:"center", justifyContent:"center", gap:5, transition:"all 0.15s" }}>
                <Icon type="zap" size={10}/>
                {demoIdx>=DEMO_STEPS.length?"DEMO COMPLETE":`DEMO VOICE STEP ${demoIdx+1}/${DEMO_STEPS.length}`}
              </button>
              <div style={{ fontSize:9, color:"#243040", fontFamily:"'IBM Plex Mono',monospace", textAlign:"center", marginTop:4 }}>
                Demo simulates voice flow • Mic works in this browser tab
              </div>
            </div>
          </div>

          {/* ── Schedule Panel ── */}
          <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
            <div style={{ padding:"11px 16px", borderBottom:"1px solid #172437", display:"flex", alignItems:"center", justifyContent:"space-between", background:"#0C1828", flexShrink:0 }}>
              <div style={{ fontSize:10, fontFamily:"'IBM Plex Mono',monospace", color:"#38BDF8", letterSpacing:"0.07em" }}>HOURLY SCHEDULE</div>
              <div style={{ display:"flex", gap:12 }}>
                {Object.entries(CATEGORY).map(([k,v]) => (
                  <div key={k} style={{ display:"flex", alignItems:"center", gap:4, fontSize:9.5 }}>
                    <div style={{ width:5, height:5, borderRadius:"50%", background:v.color }}/>
                    <span style={{ color:"#3A5570", fontFamily:"'IBM Plex Mono',monospace" }}>{v.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display:"flex", flex:1, overflow:"hidden" }}>
              <div style={{ flex:1, overflowY:"auto", padding:"14px 16px" }}>
                {HOURS.map(h => {
                  const patients = schedule[h] || [];
                  const isPast = h < currentHour;
                  const isCurrent = h === currentHour;
                  const totalMins = patients.reduce((s,p)=>s+(p.estimatedDuration||30),0);
                  const load = Math.min(100, Math.round((totalMins/60)*100));
                  const loadColor = load>90?"#F87171":load>70?"#FB923C":"#38BDF8";
                  return (
                    <div key={h} style={{ display:"flex", gap:10, marginBottom:9, opacity:isPast?0.42:1 }}>
                      <div style={{ width:50, flexShrink:0, paddingTop:9, textAlign:"right" }}>
                        <div style={{ fontSize:10.5, fontFamily:"'IBM Plex Mono',monospace", color:isCurrent?"#38BDF8":"#3A5570" }}>{formatHour(h)}</div>
                        {isCurrent && <div style={{ fontSize:7.5, color:"#38BDF8", marginTop:1, letterSpacing:"0.06em" }}>NOW</div>}
                      </div>
                      <div style={{ flex:1 }}>
                        {patients.length===0 ? (
                          <div style={{ border:"1px dashed #172437", borderRadius:7, padding:"9px 12px", fontSize:10.5, color:"#243040", fontFamily:"'IBM Plex Mono',monospace" }}>— Available</div>
                        ) : <>
                          <div style={{ display:"flex", alignItems:"center", gap:7, marginBottom:5 }}>
                            <div style={{ flex:1, height:2, background:"#172437", borderRadius:1 }}>
                              <div style={{ width:`${load}%`, height:"100%", background:loadColor, borderRadius:1, transition:"width 0.4s ease" }}/>
                            </div>
                            <span style={{ fontSize:9, fontFamily:"'IBM Plex Mono',monospace", color:"#3A5570", flexShrink:0 }}>{totalMins}m/60m</span>
                          </div>
                          <div style={{ display:"flex", flexDirection:"column", gap:5 }}>
                            {patients.map(p => {
                              const cat = CATEGORY[p.category];
                              const isSel = selected?.id===p.id;
                              const isNew = toast?.id===p.id;
                              return (
                                <div key={p.id} onClick={()=>setSelected(prev=>prev?.id===p.id?null:p)}
                                  style={{ background:isSel?cat.bg:"#0C1828", border:`1px solid ${isNew||isSel?cat.color:"#172437"}`, borderRadius:7, padding:"8px 11px", cursor:"pointer", display:"flex", alignItems:"center", gap:9, transition:"all 0.18s", boxShadow:isNew?`0 0 12px ${cat.color}28`:"none" }}>
                                  <div style={{ color:cat.color, flexShrink:0, display:"flex" }}><CatIcon category={p.category}/></div>
                                  <div style={{ flex:1, minWidth:0 }}>
                                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                                      <span style={{ fontWeight:500, fontSize:12.5 }}>{p.name}</span>
                                      {p.requiresSpecialist && <span style={{ fontSize:8.5, background:"rgba(251,146,60,0.12)", color:"#FB923C", border:"1px solid rgba(251,146,60,0.25)", borderRadius:3, padding:"1px 5px", fontFamily:"'IBM Plex Mono',monospace" }}>SPECIALIST</span>}
                                    </div>
                                    <div style={{ fontSize:11, color:"#3A5570", marginTop:1.5, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{p.primarySymptoms}</div>
                                  </div>
                                  <div style={{ flexShrink:0, textAlign:"right" }}>
                                    <div style={{ fontSize:9, fontFamily:"'IBM Plex Mono',monospace", color:cat.color }}>{cat.label}</div>
                                    <div style={{ fontSize:10, color:"#3A5570", marginTop:1 }}>{p.estimatedDuration}m</div>
                                  </div>
                                  <div style={{ width:22, height:22, borderRadius:5, background:cat.bg, border:`1px solid ${cat.border}`, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, fontSize:10.5, fontFamily:"'IBM Plex Mono',monospace", fontWeight:600, color:cat.color }}>
                                    {p.urgencyScore}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Detail Panel */}
              {selected && (
                <div style={{ width:"41%", borderLeft:"1px solid #172437", overflowY:"auto", padding:"18px 16px", background:"#0C1828" }}>
                  {(() => {
                    const p = selected;
                    const cat = CATEGORY[p.category];
                    return (
                      <div>
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                          <div>
                            <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:4 }}>
                              <CatIcon category={p.category} size={12}/>
                              <span style={{ fontSize:9.5, fontFamily:"'IBM Plex Mono',monospace", color:cat.color, letterSpacing:"0.05em" }}>{cat.label}</span>
                            </div>
                            <div style={{ fontSize:16.5, fontWeight:600 }}>{p.name}</div>
                          </div>
                          <button onClick={()=>setSelected(null)} style={{ background:"none", border:"1px solid #172437", color:"#3A5570", cursor:"pointer", width:28, height:28, borderRadius:5, display:"flex", alignItems:"center", justifyContent:"center" }}>
                            <Icon type="x" size={13}/>
                          </button>
                        </div>
                        <div style={{ background:cat.bg, border:`1px solid ${cat.border}`, borderRadius:7, padding:"10px 12px", marginBottom:14 }}>
                          <div style={{ fontSize:9, fontFamily:"'IBM Plex Mono',monospace", color:cat.color, marginBottom:5, letterSpacing:"0.05em" }}>URGENCY SCORE</div>
                          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                            <span style={{ fontSize:24, fontWeight:600, fontFamily:"'IBM Plex Mono',monospace", color:cat.color }}>{p.urgencyScore}</span>
                            <span style={{ fontSize:11, color:"#3A5570" }}>/10</span>
                            <div style={{ flex:1, height:3, background:"#172437", borderRadius:1.5, marginLeft:5 }}>
                              <div style={{ width:`${p.urgencyScore*10}%`, height:"100%", background:cat.color, borderRadius:1.5 }}/>
                            </div>
                          </div>
                        </div>
                        {[
                          ["PRIMARY SYMPTOMS", p.primarySymptoms],
                          p.preExistingConditions && p.preExistingConditions!=="None" && ["PRE-EXISTING CONDITIONS", p.preExistingConditions],
                          ["VISIT TYPE", p.visitType==="first"?"First Visit":"Follow-up Appointment"],
                          p.medications && p.medications!=="None" && ["CURRENT MEDICATIONS", p.medications],
                          ["REFERRAL", p.referralType==="doctor-referred"?"Doctor Referred":"Self-referred"],
                        ].filter(Boolean).map(([label,val]) => (
                          <div key={label} style={{ marginBottom:10 }}>
                            <div style={{ fontSize:9, fontFamily:"'IBM Plex Mono',monospace", color:"#3A5570", marginBottom:2.5, letterSpacing:"0.06em" }}>{label}</div>
                            <div style={{ fontSize:12.5, color:"#C4D4E0" }}>{val}</div>
                          </div>
                        ))}
                        <div style={{ display:"flex", flexWrap:"wrap", gap:5, margin:"12px 0" }}>
                          {p.requiresSpecialist    && <span style={{ fontSize:9, fontFamily:"'IBM Plex Mono',monospace", color:"#FB923C", background:"rgba(251,146,60,0.08)", border:"1px solid rgba(251,146,60,0.3)", borderRadius:4, padding:"2px 7px" }}>Specialist Required</span>}
                          {p.requiresLongerConsult && <span style={{ fontSize:9, fontFamily:"'IBM Plex Mono',monospace", color:"#FCD34D", background:"rgba(252,211,77,0.08)", border:"1px solid rgba(252,211,77,0.3)", borderRadius:4, padding:"2px 7px" }}>Extended Consult</span>}
                          <span style={{ fontSize:9, fontFamily:"'IBM Plex Mono',monospace", color:"#3A5570", background:"rgba(58,85,112,0.1)", border:"1px solid rgba(58,85,112,0.3)", borderRadius:4, padding:"2px 7px" }}>{p.estimatedDuration} min slot</span>
                        </div>
                        <div style={{ background:"#101D2E", border:"1px solid #172437", borderRadius:7, padding:"12px" }}>
                          <div style={{ fontSize:9, fontFamily:"'IBM Plex Mono',monospace", color:"#38BDF8", marginBottom:7, letterSpacing:"0.07em", display:"flex", alignItems:"center", gap:5 }}>
                            <Icon type="stethoscope" size={10}/> DOCTOR BRIEFING
                          </div>
                          <div style={{ fontSize:12, color:"#A8BCCF", lineHeight:1.75 }}>{p.doctorSummary}</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Toast */}
        {toast && (() => {
          const cat = CATEGORY[toast.category];
          const slot = Math.min(17,Math.max(9,parseInt(toast.recommendedSlot)||10));
          return (
            <div style={{ position:"fixed", bottom:18, right:18, background:"#0C1828", border:`1px solid ${cat.color}`, borderRadius:10, padding:"11px 15px", maxWidth:272, boxShadow:"0 8px 28px rgba(0,0,0,0.5)", zIndex:99, animation:"toastIn 0.3s ease" }}>
              <div style={{ fontSize:9, fontFamily:"'IBM Plex Mono',monospace", color:cat.color, marginBottom:3, letterSpacing:"0.06em" }}>✓ PATIENT SCHEDULED</div>
              <div style={{ fontWeight:600, fontSize:13.5 }}>{toast.name}</div>
              <div style={{ fontSize:11, color:"#3A5570", marginTop:2 }}>{cat.label} · {formatHour(slot)} block · {toast.estimatedDuration}min</div>
            </div>
          );
        })()}
      </div>
    </>
  );
}
