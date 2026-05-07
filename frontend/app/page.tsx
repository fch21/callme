"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };
type Mode = "landing" | "call" | "chat";
type Health = { status: string; persona: string; voice_enabled: boolean };

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export default function Home() {
  const [health, setHealth] = useState<Health | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>("landing");

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((r) => {
        if (!r.ok) throw new Error("backend not ok");
        return r.json();
      })
      .then((data: Health) => {
        setHealth(data);
        if (!data.voice_enabled) setMode("chat");
      })
      .catch(() => setError(`Can't reach backend at ${API_URL}`));
  }, []);

  if (error) {
    return (
      <Centered>
        <div className="text-neutral-400 text-sm">{error}</div>
      </Centered>
    );
  }

  if (!health) {
    return (
      <Centered>
        <div className="text-neutral-600 text-sm">Loading…</div>
      </Centered>
    );
  }

  if (mode === "landing") {
    return (
      <LandingView
        personaName={health.persona}
        onCall={() => setMode("call")}
        onChat={() => setMode("chat")}
      />
    );
  }

  if (mode === "call") {
    return <CallView personaName={health.persona} onEnd={() => setMode("landing")} />;
  }

  return (
    <ChatView
      personaName={health.persona}
      onEnd={health.voice_enabled ? () => setMode("landing") : undefined}
    />
  );
}

function useChat(voiceEnabled: boolean) {
  const [history, setHistory] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function playAudio(b64: string) {
    audioRef.current?.pause();
    const audio = new Audio(`data:audio/mpeg;base64,${b64}`);
    audioRef.current = audio;
    setSpeaking(true);
    audio.onended = () => setSpeaking(false);
    audio.onerror = () => setSpeaking(false);
    audio.play().catch(() => setSpeaking(false));
  }

  async function send() {
    const message = input.trim();
    if (!message || loading) return;

    setInput("");
    setLoading(true);
    const next: Message[] = [...history, { role: "user", content: message }];
    setHistory(next);

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, voice: voiceEnabled }),
      });
      const data: { reply: string; audio_b64?: string } = await res.json();
      setHistory([...next, { role: "assistant", content: data.reply }]);
      if (data.audio_b64 && voiceEnabled) playAudio(data.audio_b64);
    } catch {
      setHistory([
        ...next,
        { role: "assistant", content: "Connection error — is the backend running?" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    audioRef.current?.pause();
    audioRef.current = null;
    setHistory([]);
    setInput("");
    setSpeaking(false);
  }

  return { history, input, setInput, loading, speaking, send, reset };
}

function LandingView({
  personaName,
  onCall,
  onChat,
}: {
  personaName: string;
  onCall: () => void;
  onChat: () => void;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-10 bg-[radial-gradient(ellipse_at_top,#1a1a1a,#000_70%)]">
      <div className="flex flex-col items-center gap-6">
        <Photo personaName={personaName} />
        <div className="text-center">
          <h1 className="text-3xl font-medium tracking-tight">{personaName}</h1>
          <p className="text-sm text-neutral-500 mt-1">Available now</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          onClick={onCall}
          className="flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 px-8 py-4 rounded-full font-medium text-lg transition shadow-lg shadow-emerald-500/20 w-60 justify-center"
        >
          <PhoneIcon />
          Call
        </button>
        <button
          onClick={onChat}
          className="flex items-center gap-3 bg-neutral-100 hover:bg-white text-neutral-950 px-8 py-3 rounded-full font-medium transition w-60 justify-center"
        >
          <ChatIcon />
          Chat
        </button>
      </div>

      <p className="text-xs text-neutral-600 text-center max-w-xs">
        Talk to an AI version of {personaName}, trained on their LinkedIn and bio.
      </p>
    </main>
  );
}

function CallView({
  personaName,
  onEnd,
}: {
  personaName: string;
  onEnd: () => void;
}) {
  const chat = useChat(true);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chat.history, chat.loading]);

  function end() {
    chat.reset();
    onEnd();
  }

  return (
    <main className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,#1a1a1a,#000_70%)]">
      <header className="flex items-center gap-4 px-6 py-4 border-b border-neutral-900">
        <Photo small speaking={chat.speaking} personaName={personaName} />
        <div className="flex-1">
          <div className="font-medium">{personaName}</div>
          <div className="text-xs text-emerald-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {chat.speaking ? "Speaking…" : "On call"}
          </div>
        </div>
        <button
          onClick={end}
          className="bg-red-500/90 hover:bg-red-500 text-white text-sm font-medium px-4 py-2 rounded-full"
        >
          End
        </button>
      </header>

      <Transcript
        ref={transcriptRef}
        history={chat.history}
        loading={chat.loading}
        emptyHint="Say something to start the conversation"
      />

      <MessageInput
        value={chat.input}
        onChange={chat.setInput}
        onSend={chat.send}
        disabled={chat.loading}
      />
    </main>
  );
}

function ChatView({
  personaName,
  onEnd,
}: {
  personaName: string;
  onEnd?: () => void;
}) {
  const chat = useChat(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chat.history, chat.loading]);

  function end() {
    chat.reset();
    onEnd?.();
  }

  return (
    <main className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,#1a1a1a,#000_70%)]">
      <header className="flex items-center gap-4 px-6 py-4 border-b border-neutral-900">
        <Photo small personaName={personaName} />
        <div className="flex-1">
          <div className="font-medium">{personaName}</div>
          <div className="text-xs text-emerald-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Online
          </div>
        </div>
        {onEnd && (
          <button
            onClick={end}
            className="text-neutral-400 hover:text-neutral-100 text-sm font-medium px-3 py-2 rounded-full"
          >
            ← Back
          </button>
        )}
      </header>

      <Transcript
        ref={transcriptRef}
        history={chat.history}
        loading={chat.loading}
        emptyHint={`Ask ${personaName} anything`}
      />

      <MessageInput
        value={chat.input}
        onChange={chat.setInput}
        onSend={chat.send}
        disabled={chat.loading}
      />
    </main>
  );
}

function Transcript({
  ref,
  history,
  loading,
  emptyHint,
}: {
  ref: React.RefObject<HTMLDivElement | null>;
  history: Message[];
  loading: boolean;
  emptyHint: string;
}) {
  return (
    <div ref={ref} className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-2xl mx-auto flex flex-col gap-3">
        {history.length === 0 && (
          <div className="text-center text-neutral-600 text-sm py-12">{emptyHint}</div>
        )}
        {history.map((m, i) => (
          <div
            key={i}
            className={`rounded-2xl px-4 py-3 max-w-[85%] leading-relaxed ${
              m.role === "user"
                ? "self-end bg-neutral-100 text-neutral-900"
                : "self-start bg-neutral-900 border border-neutral-800"
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="self-start bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3">
            <span className="inline-flex gap-1">
              <Dot />
              <Dot delay={150} />
              <Dot delay={300} />
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function MessageInput({
  value,
  onChange,
  onSend,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled: boolean;
}) {
  return (
    <footer className="border-t border-neutral-900 px-4 py-4">
      <div className="max-w-2xl mx-auto flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSend()}
          placeholder="Type a message…"
          autoFocus
          className="flex-1 bg-neutral-900 border border-neutral-800 rounded-full px-5 py-3 outline-none focus:border-neutral-700"
        />
        <button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className="bg-neutral-100 text-neutral-900 rounded-full px-6 py-3 font-medium disabled:opacity-40 transition"
        >
          Send
        </button>
      </div>
    </footer>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,#1a1a1a,#000_70%)]">
      {children}
    </main>
  );
}

function Photo({
  small = false,
  speaking = false,
  personaName,
}: {
  small?: boolean;
  speaking?: boolean;
  personaName: string;
}) {
  const size = small ? "w-12 h-12" : "w-48 h-48";
  const [hasPhoto, setHasPhoto] = useState(true);

  return (
    <div className="relative">
      {speaking && (
        <span className={`absolute inset-0 rounded-full bg-emerald-500/30 animate-ping ${size}`} />
      )}
      <div
        className={`${size} relative rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 ring-1 ring-neutral-700 flex items-center justify-center overflow-hidden`}
      >
        {hasPhoto ? (
          <img
            src={`${API_URL}/me/photo`}
            alt={personaName}
            className="w-full h-full object-cover"
            onError={() => setHasPhoto(false)}
          />
        ) : (
          <span
            className={small ? "text-[10px] text-neutral-500" : "text-sm text-neutral-500"}
          >
            photo
          </span>
        )}
      </div>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-bounce"
      style={{ animationDelay: `${delay}ms` }}
    />
  );
}
