import { useState, useRef, useEffect, useCallback } from "react";

const BASE_URL = "http://localhost:8000/api";

async function apiRequest(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || err.detail || "API error");
  }
  return res.json();
}

const FEATURES = [
  { id: "symptom",     icon: "🩺", label: "Symptom Checker",  color: "#0EA5E9" },
  { id: "medicine",    icon: "💊", label: "Medicine Info",     color: "#10B981" },
  { id: "firstaid",    icon: "🚑", label: "First Aid Guide",   color: "#F59E0B" },
  { id: "appointment", icon: "📅", label: "Book Appointment",  color: "#8B5CF6" },
  { id: "hospital",    icon: "🏥", label: "Nearby Hospitals",  color: "#EF4444" },
];

const WELCOME = `👋 Hello! I'm **MedAssist**, your AI-powered health companion.\n\nPowered by **Django + DRF + OpenAI GPT**.\n\nI can help you with:\n• 🩺 Symptom checking\n• 💊 Medicine information\n• 🚑 First aid guidance\n• 📅 Doctor appointment booking\n• 🏥 Finding nearby hospitals\n\nSelect a feature or type your question!`;

const SESSION_KEY = `medassist_${Date.now()}`;

const fmt = (text) =>
  text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, "<code style='background:#F1F5F9;padding:1px 6px;border-radius:4px;font-size:12px;font-family:monospace'>$1</code>")
    .replace(/^### (.*)/gm, "<h4 style='margin:8px 0 3px;font-size:14px;color:#0F172A'>$1</h4>")
    .replace(/^\d+\. (.*)/gm, "<div style='margin:3px 0;padding-left:4px'>🔹 $1</div>")
    .replace(/^[-•] (.*)/gm,  "<div style='margin:3px 0;padding-left:4px'>• $1</div>")
    .replace(/\n/g, "<br/>");

export default function App() {
  const [messages, setMessages]       = useState([{ role: "assistant", content: WELCOME, id: "init" }]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [activeFeature, setActiveFeature] = useState("general");
  const [sessionId, setSessionId]     = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [apiStatus, setApiStatus]     = useState("checking");
  const [tokenUsage, setTokenUsage]   = useState({ input: 0, output: 0 });
  const messagesEndRef = useRef(null);
  const textareaRef    = useRef(null);

  // Health check on mount
  useEffect(() => {
    apiRequest("/health/")
      .then(() => setApiStatus("ok"))
      .catch(() => setApiStatus("error"));
  }, []);

  // Auto scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");

    const userMsg = { role: "user", content: msg, id: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const data = await apiRequest("/chat/", {
        method: "POST",
        body: JSON.stringify({
          message: msg,
          feature: activeFeature,
          session_id: sessionId,
          session_key: SESSION_KEY,
        }),
      });

      if (!sessionId) setSessionId(data.session_id);
      setTokenUsage((prev) => ({
        input:  prev.input  + (data.usage?.input_tokens  || 0),
        output: prev.output + (data.usage?.output_tokens || 0),
      }));
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply, id: data.message_id, model: data.model },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `⚠️ **Error:** ${err.message}\n\nMake sure Django backend is running on \`http://localhost:8000\``,
          id: Date.now(),
        },
      ]);
    }
    setLoading(false);
  }, [input, loading, activeFeature, sessionId]);

  const selectFeature = (feature) => {
    setActiveFeature(feature.id);
    setSessionId(null);
    setMessages([{
      role: "assistant",
      content: `**${feature.icon} ${feature.label}** mode activated!\n\nHow can I help you today?`,
      id: Date.now(),
    }]);
  };

  const clearChat = () => {
    setMessages([{ role: "assistant", content: WELCOME, id: "init" }]);
    setSessionId(null);
    setActiveFeature("general");
    setTokenUsage({ input: 0, output: 0 });
  };

  const activeFeatureData = FEATURES.find((f) => f.id === activeFeature);

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", display: "flex", height: "100vh", background: "#EFF6FF", overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 10px; }
        .feat { transition: all 0.2s; border: none; cursor: pointer; text-align: left; width: 100%; }
        .feat:hover { transform: translateX(3px); }
        .sbtn { transition: all 0.15s; }
        .sbtn:hover:not(:disabled) { transform: scale(1.07); }
        .msg { animation: pop 0.25s ease; }
        @keyframes pop { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        .dot { animation: blink 1.2s infinite; display:inline-block; width:8px; height:8px; border-radius:50%; background:#0EA5E9; }
        .dot:nth-child(2) { animation-delay:0.2s; }
        .dot:nth-child(3) { animation-delay:0.4s; }
        @keyframes blink { 0%,80%,100%{opacity:0.2} 40%{opacity:1} }
        .inp:focus { outline:none; border-color:#0EA5E9; box-shadow:0 0 0 3px rgba(14,165,233,0.15); }
        .chip { transition:all 0.2s; cursor:pointer; }
        .chip:hover { transform:translateY(-1px); }
      `}</style>

      {/* Sidebar */}
      <div style={{ width: sidebarOpen ? 260 : 0, minWidth: sidebarOpen ? 260 : 0, background: "linear-gradient(180deg,#0F172A,#1E293B)", display: "flex", flexDirection: "column", transition: "all 0.3s", overflow: "hidden" }}>

        {/* Logo */}
        <div style={{ padding: "20px 16px 14px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 42, height: 42, borderRadius: 13, background: "linear-gradient(135deg,#0EA5E9,#6366F1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>⚕️</div>
            <div>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 17 }}>MedAssist</div>
              <div style={{ color: "#475569", fontSize: 11 }}>Django · DRF · OpenAI</div>
            </div>
          </div>
          {/* API Status */}
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderRadius: 8, background: apiStatus === "ok" ? "rgba(16,185,129,0.1)" : apiStatus === "error" ? "rgba(239,68,68,0.1)" : "rgba(100,116,139,0.1)" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: apiStatus === "ok" ? "#10B981" : apiStatus === "error" ? "#EF4444" : "#64748B", boxShadow: apiStatus === "ok" ? "0 0 5px #10B981" : "none" }} />
            <span style={{ color: apiStatus === "ok" ? "#10B981" : apiStatus === "error" ? "#EF4444" : "#64748B", fontSize: 11, fontWeight: 700 }}>
              {apiStatus === "ok" ? "Backend connected" : apiStatus === "error" ? "Backend offline" : "Connecting…"}
            </span>
          </div>
        </div>

        {/* Feature Buttons */}
        <div style={{ padding: "14px 10px", flex: 1, overflowY: "auto" }}>
          <div style={{ color: "#475569", fontSize: 10, fontWeight: 800, letterSpacing: "1.5px", padding: "0 8px 10px", textTransform: "uppercase" }}>Features</div>
          {FEATURES.map((f) => (
            <button key={f.id} className="feat" onClick={() => selectFeature(f)}
              style={{ padding: "10px 12px", borderRadius: 12, marginBottom: 4, background: activeFeature === f.id ? `${f.color}22` : "transparent", border: `1px solid ${activeFeature === f.id ? f.color + "44" : "transparent"}`, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18, width: 32, height: 32, borderRadius: 9, background: activeFeature === f.id ? f.color : "#1E293B", display: "flex", alignItems: "center", justifyContent: "center" }}>{f.icon}</span>
              <span style={{ color: activeFeature === f.id ? "#fff" : "#94A3B8", fontWeight: 700, fontSize: 13 }}>{f.label}</span>
            </button>
          ))}
        </div>

        {/* Token Usage + Clear */}
        <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          {(tokenUsage.input > 0) && (
            <div style={{ padding: "6px 10px", borderRadius: 8, background: "rgba(99,102,241,0.1)", marginBottom: 8 }}>
              <div style={{ color: "#818CF8", fontSize: 10, fontWeight: 700 }}>TOKENS USED</div>
              <div style={{ color: "#64748B", fontSize: 11 }}>↑ {tokenUsage.input} in · ↓ {tokenUsage.output} out</div>
            </div>
          )}
          <button className="feat" onClick={clearChat}
            style={{ padding: "9px 12px", borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#F87171", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            🗑️ Clear Chat
          </button>
          <div style={{ color: "#334155", fontSize: 10, textAlign: "center", marginTop: 8 }}>For informational purposes only</div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ background: "#fff", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 1px 10px rgba(0,0,0,0.06)", zIndex: 10 }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#64748B", padding: "5px 8px", borderRadius: 8 }}>☰</button>
          <span style={{ fontSize: 22 }}>{activeFeatureData?.icon || "⚕️"}</span>
          <div>
            <div style={{ fontWeight: 800, color: "#0F172A", fontSize: 15 }}>{activeFeatureData?.label || "MedAssist"}</div>
            <div style={{ color: "#94A3B8", fontSize: 11 }}>
              {sessionId ? `Session: ${String(sessionId).slice(0, 8)}…` : "New session"} · OpenAI GPT
            </div>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <div style={{ padding: "4px 10px", borderRadius: 20, background: apiStatus === "ok" ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${apiStatus === "ok" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}` }}>
              <span style={{ color: apiStatus === "ok" ? "#10B981" : "#EF4444", fontSize: 11, fontWeight: 700 }}>
                {apiStatus === "ok" ? "● API Online" : "● API Offline"}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Chips */}
        <div style={{ padding: "10px 20px", display: "flex", gap: 8, flexWrap: "wrap", background: "#fff", borderBottom: "1px solid #F1F5F9" }}>
          {FEATURES.map((f) => (
            <button key={f.id} className="chip sbtn" onClick={() => selectFeature(f)}
              style={{ padding: "5px 13px", borderRadius: 20, border: `1.5px solid ${activeFeature === f.id ? f.color : "#E2E8F0"}`, background: activeFeature === f.id ? f.color : "transparent", color: activeFeature === f.id ? "#fff" : f.color, fontSize: 12, fontWeight: 700 }}>
              {f.icon} {f.label}
            </button>
          ))}
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
          {messages.map((msg) => (
            <div key={msg.id} className="msg" style={{ display: "flex", justifyContent: msg.role === "user" ? "flex-end" : "flex-start", alignItems: "flex-end", gap: 8 }}>
              {msg.role === "assistant" && (
                <div style={{ width: 36, height: 36, borderRadius: 11, background: "linear-gradient(135deg,#0EA5E9,#6366F1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>⚕️</div>
              )}
              <div>
                <div style={{
                  maxWidth: "65vw", padding: "11px 15px",
                  borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: msg.role === "user" ? "linear-gradient(135deg,#0EA5E9,#0284C7)" : "#fff",
                  color: msg.role === "user" ? "#fff" : "#1E293B",
                  fontSize: 14, lineHeight: 1.7,
                  boxShadow: msg.role === "user" ? "0 4px 14px rgba(14,165,233,0.3)" : "0 2px 10px rgba(0,0,0,0.06)",
                }}
                  dangerouslySetInnerHTML={{ __html: fmt(msg.content) }} />
                {msg.model && (
                  <div style={{ color: "#94A3B8", fontSize: 10, marginTop: 3, paddingLeft: 4 }}>via {msg.model}</div>
                )}
              </div>
              {msg.role === "user" && (
                <div style={{ width: 36, height: 36, borderRadius: 11, background: "linear-gradient(135deg,#7C3AED,#4F46E5)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>👤</div>
              )}
            </div>
          ))}

          {loading && (
            <div className="msg" style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 11, background: "linear-gradient(135deg,#0EA5E9,#6366F1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>⚕️</div>
              <div style={{ padding: "13px 18px", borderRadius: "18px 18px 18px 4px", background: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,0.06)", display: "flex", gap: 5, alignItems: "center" }}>
                <span className="dot" /><span className="dot" /><span className="dot" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div style={{ background: "#fff", padding: "14px 20px", boxShadow: "0 -1px 10px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <textarea ref={textareaRef} className="inp" value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={`Ask about ${activeFeatureData?.label?.toLowerCase() || "your health"}… (Enter to send)`}
              rows={1}
              style={{ flex: 1, padding: "11px 15px", borderRadius: 14, border: "1.5px solid #E2E8F0", fontSize: 14, resize: "none", fontFamily: "inherit", color: "#1E293B", background: "#F8FAFC", lineHeight: 1.5, transition: "all 0.2s", overflowY: "auto" }} />
            <button className="sbtn" onClick={() => sendMessage()} disabled={loading || !input.trim()}
              style={{ width: 46, height: 46, borderRadius: 14, border: "none", cursor: loading || !input.trim() ? "not-allowed" : "pointer", background: !loading && input.trim() ? "linear-gradient(135deg,#0EA5E9,#0284C7)" : "#E2E8F0", color: "#fff", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: !loading && input.trim() ? "0 4px 14px rgba(14,165,233,0.4)" : "none" }}>
              {loading ? "⏳" : "➤"}
            </button>
          </div>
          <div style={{ textAlign: "center", color: "#94A3B8", fontSize: 11, marginTop: 7 }}>
            ⚠️ General information only — not a substitute for professional medical advice
          </div>
        </div>
      </div>
    </div>
  );
}