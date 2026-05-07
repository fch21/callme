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
        voiceEnabled={health.voice_enabled}
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
      onEnd={() => setMode("landing")}
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

  async function send(textOverride?: string) {
    const message = (textOverride ?? input).trim();
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
      if (data.audio_b64 && voiceEnabled) {
        playAudio(data.audio_b64);
      } else if (voiceEnabled) {
        console.warn(
          "[CallMe] Voice mode is on but the backend returned no audio. Check Railway logs for an ElevenLabs error.",
        );
      }
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

function useRecorder(onTranscribed: (text: string) => void) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  function cleanupStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function start() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        setRecording(false);
        cleanupStream();
        const blob = new Blob(chunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        if (blob.size === 0) return;

        setTranscribing(true);
        try {
          const ext = blob.type.includes("mp4") ? "mp4" : "webm";
          const formData = new FormData();
          formData.append("audio", blob, `recording.${ext}`);
          const res = await fetch(`${API_URL}/transcribe`, {
            method: "POST",
            body: formData,
          });
          if (!res.ok) throw new Error("transcribe failed");
          const data: { text: string } = await res.json();
          if (data.text) onTranscribed(data.text);
        } catch {
          setError("Couldn't transcribe — try again or type instead.");
        } finally {
          setTranscribing(false);
        }
      };

      recorder.start();
      setRecording(true);
    } catch {
      setError("Mic access denied. You can still type.");
    }
  }

  function stop() {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.stop();
    }
  }

  function toggle() {
    if (recording) stop();
    else start();
  }

  function cancel() {
    if (recorderRef.current && recorderRef.current.state === "recording") {
      recorderRef.current.onstop = null;
      recorderRef.current.stop();
    }
    cleanupStream();
    chunksRef.current = [];
    setRecording(false);
    setTranscribing(false);
  }

  return { recording, transcribing, error, toggle, cancel };
}

function LandingView({
  personaName,
  voiceEnabled,
  onCall,
  onChat,
}: {
  personaName: string;
  voiceEnabled: boolean;
  onCall: () => void;
  onChat: () => void;
}) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-10 bg-[radial-gradient(ellipse_at_top,#1a1a1a,#000_70%)]">
      <div className="flex flex-col items-center gap-6">
        <Photo personaName={personaName} />
        <div className="text-center">
          <h1 className="text-3xl font-medium tracking-tight">{personaName}</h1>
          <p className="text-sm text-neutral-500 mt-1">AI version</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        {voiceEnabled && (
          <button
            onClick={onCall}
            className="flex items-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 px-8 py-4 rounded-full font-medium text-lg transition shadow-lg shadow-emerald-500/20 w-60 justify-center"
          >
            <PhoneIcon />
            Call
          </button>
        )}
        <button
          onClick={onChat}
          className="flex items-center gap-3 bg-neutral-100 hover:bg-white text-neutral-950 px-8 py-3 rounded-full font-medium transition w-60 justify-center"
        >
          <ChatIcon />
          Chat
        </button>
      </div>

      <p className="text-xs text-neutral-400 text-center max-w-xs">
        You're chatting with an AI trained on {personaName}'s career and background.
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
  const recorder = useRecorder((text) => chat.send(text));
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chat.history, chat.loading]);

  function end() {
    recorder.cancel();
    chat.reset();
    onEnd();
  }

  const status = chat.speaking
    ? "Speaking…"
    : chat.loading
    ? "Thinking…"
    : recorder.transcribing
    ? "Transcribing…"
    : recorder.recording
    ? "Listening…"
    : "On call";

  const micHint = recorder.recording
    ? "Tap to send"
    : recorder.transcribing
    ? "Transcribing…"
    : "Tap to talk";

  return (
    <main className="h-dvh flex flex-col bg-[radial-gradient(ellipse_at_top,#1a1a1a,#000_70%)] relative">
      <button
        onClick={end}
        aria-label="End call"
        className="absolute top-4 right-4 z-10 text-neutral-400 hover:text-neutral-100 p-2 rounded-full transition"
      >
        <CloseIcon />
      </button>

      <section className="flex flex-col items-center pt-12 pb-6 px-6 gap-5 shrink-0">
        <CallPhoto personaName={personaName} speaking={chat.speaking} />
        <div className="text-center flex flex-col items-center gap-1.5">
          <h1 className="text-2xl font-medium tracking-tight">{personaName}</h1>
          <div className="text-sm flex items-center gap-2">
            <span className="text-neutral-500">AI version</span>
            <span className="text-neutral-700">·</span>
            <span className="text-emerald-400 flex items-center gap-1.5">
              <span
                className={`w-1.5 h-1.5 rounded-full bg-emerald-500 ${
                  chat.speaking || chat.loading || recorder.recording || recorder.transcribing
                    ? "animate-pulse"
                    : ""
                }`}
              />
              {status}
            </span>
          </div>
        </div>
      </section>

      <div ref={transcriptRef} className="flex-1 min-h-0 overflow-y-auto px-6 py-2">
        <div className="max-w-xl mx-auto flex flex-col gap-2.5 text-sm">
          {chat.history.length === 0 && (
            <div className="text-center text-neutral-600 py-6">
              Tap the microphone or type to start the conversation
            </div>
          )}
          {chat.history.map((m, i) => {
            const isLatest = i === chat.history.length - 1;
            const opacity = isLatest ? "opacity-100" : "opacity-50";
            return (
              <div
                key={i}
                className={`leading-relaxed transition-opacity ${opacity} ${
                  m.role === "user"
                    ? "self-end text-neutral-200 italic max-w-[85%]"
                    : "self-start text-neutral-400 max-w-[90%]"
                }`}
              >
                {m.content}
              </div>
            );
          })}
        </div>
      </div>

      <footer className="px-4 pt-3 pb-6 flex flex-col items-center gap-3 shrink-0">
        <button
          onClick={recorder.toggle}
          disabled={chat.loading || chat.speaking || recorder.transcribing}
          aria-label={recorder.recording ? "Stop recording" : "Start recording"}
          className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            recorder.recording
              ? "bg-red-500 shadow-lg shadow-red-500/40"
              : "bg-neutral-100 hover:bg-white text-neutral-950"
          }`}
        >
          {recorder.recording && (
            <span className="absolute inset-0 rounded-full bg-red-500/40 animate-ping" />
          )}
          <MicIcon active={recorder.recording} />
        </button>
        <p className="text-xs text-neutral-500">{micHint}</p>
        {recorder.error && (
          <p className="text-xs text-red-400 text-center max-w-xs">{recorder.error}</p>
        )}

        <div className="max-w-xl mx-auto w-full flex gap-2 mt-2">
          <input
            value={chat.input}
            onChange={(e) => chat.setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && chat.send()}
            placeholder="Or type a message…"
            className="flex-1 bg-neutral-900 border border-neutral-800 text-sm rounded-full px-4 py-2.5 outline-none focus:border-neutral-700"
          />
          <button
            onClick={() => chat.send()}
            disabled={chat.loading || !chat.input.trim()}
            className="bg-neutral-100 text-neutral-900 text-sm rounded-full px-5 py-2.5 font-medium disabled:opacity-40 transition"
          >
            Send
          </button>
        </div>
      </footer>
    </main>
  );
}

function CallPhoto({
  personaName,
  speaking,
}: {
  personaName: string;
  speaking: boolean;
}) {
  const [hasPhoto, setHasPhoto] = useState(true);

  return (
    <div className="relative flex items-center justify-center w-32 h-32 md:w-40 md:h-40">
      {speaking && (
        <>
          <span
            className="absolute inset-0 rounded-full bg-emerald-500/25 animate-ping"
            style={{ animationDuration: "1.6s" }}
          />
          <span
            className="absolute -inset-3 rounded-full bg-emerald-500/15 animate-ping"
            style={{ animationDuration: "2s", animationDelay: "0.3s" }}
          />
          <span
            className="absolute -inset-6 rounded-full bg-emerald-500/10 animate-ping"
            style={{ animationDuration: "2.4s", animationDelay: "0.6s" }}
          />
        </>
      )}
      <div
        className={`relative w-full h-full rounded-full bg-gradient-to-br from-neutral-700 to-neutral-900 flex items-center justify-center overflow-hidden transition-all duration-300 ${
          speaking
            ? "ring-2 ring-emerald-500/70 shadow-[0_0_60px_-10px_rgba(16,185,129,0.55)]"
            : "ring-1 ring-neutral-700"
        }`}
      >
        {hasPhoto ? (
          <img
            src={`${API_URL}/me/photo`}
            alt={personaName}
            className="w-full h-full object-cover"
            onError={() => setHasPhoto(false)}
          />
        ) : (
          <span className="text-sm text-neutral-500">photo</span>
        )}
      </div>
    </div>
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
    <main className="h-dvh flex flex-col bg-[radial-gradient(ellipse_at_top,#1a1a1a,#000_70%)]">
      <header className="flex items-center gap-4 px-6 py-4 border-b border-neutral-900">
        {onEnd && (
          <button
            onClick={end}
            aria-label="Back"
            className="text-neutral-400 hover:text-neutral-100 p-2 -ml-2 rounded-full transition"
          >
            <ArrowLeftIcon />
          </button>
        )}
        <Photo small personaName={personaName} />
        <div className="flex-1">
          <div className="font-medium">{personaName}</div>
          <div className="text-xs flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-neutral-500">AI version ·</span>
            <span className="text-emerald-500">Online</span>
          </div>
        </div>
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
    <div ref={ref} className="flex-1 min-h-0 overflow-y-auto px-4 py-6">
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

function CloseIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

function MicIcon({ active }: { active: boolean }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill={active ? "white" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={active ? "text-white" : "text-neutral-950"}
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
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
