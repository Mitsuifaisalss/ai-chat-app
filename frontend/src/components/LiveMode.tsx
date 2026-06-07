import React, { useEffect, useRef, useState } from "react";
import { Stage } from "../types";

// Polyfill for SpeechRecognition
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

export function LiveMode({
  onClose,
  onSend,
  isStreaming,
  stage,
  lastAssistantMessage,
}: {
  onClose: () => void;
  onSend: (text: string) => void;
  isStreaming: boolean;
  stage: Stage;
  lastAssistantMessage: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef(window.speechSynthesis);

  // Initialize Voices
  useEffect(() => {
    const updateVoices = () => setVoices(synthRef.current.getVoices());
    updateVoices();
    if (synthRef.current.onvoiceschanged !== undefined) {
      synthRef.current.onvoiceschanged = updateVoices;
    }
  }, []);

  // Initialize Camera
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then((s) => {
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      })
      .catch((err) => console.error("Camera access denied:", err));

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Initialize Speech Recognition
  useEffect(() => {
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      // Default to auto-detect or rely on OS, but we can't easily auto-detect input without multiple recognizers.
      // We will let the OS handle input language detection if possible.
      
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript.trim()) {
          onSend(transcript);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, [onSend]);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      synthRef.current.cancel();
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  // Speak assistant response when it finishes streaming with correct accent
  useEffect(() => {
    if (!isStreaming && lastAssistantMessage && synthRef.current) {
      const text = lastAssistantMessage.replace(/[*#]/g, "");
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Detect Japanese characters to set correct voice
      const isJapanese = /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff]/.test(text);
      const targetLang = isJapanese ? "ja" : "en";
      utterance.lang = isJapanese ? "ja-JP" : "en-US";
      
      // Find highest quality voice for language
      const available = voices.filter(v => v.lang.startsWith(targetLang));
      const bestVoice = available.find(v => v.name.includes("Premium") || v.name.includes("Enhanced") || v.name.includes("Google")) || available[0];
      
      if (bestVoice) {
        utterance.voice = bestVoice;
      }
      
      synthRef.current.speak(utterance);
    }
  }, [isStreaming, lastAssistantMessage, voices]);

  const isSpeaking = !isStreaming && lastAssistantMessage && synthRef.current.speaking;

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-zinc-900 to-black flex flex-col items-center justify-center p-4 overflow-hidden">
      
      {/* Background Ambient Glow */}
      <div className={`absolute inset-0 opacity-30 transition-all duration-1000 ${isSpeaking ? 'bg-emerald-900/40' : isStreaming ? 'bg-blue-900/40' : isListening ? 'bg-red-900/40' : 'bg-zinc-900/40'}`} />

      <button 
        onClick={() => {
          synthRef.current.cancel();
          onClose();
        }}
        className="absolute top-6 right-6 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition-all z-10"
        aria-label="Close"
      >
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Main Visualizer (Gemini Orb Style) */}
      <div className="relative flex-1 w-full flex items-center justify-center z-10">
        <div className={`relative flex items-center justify-center w-64 h-64 rounded-full transition-all duration-700 ease-in-out ${
          isSpeaking 
            ? "animate-[pulse_1s_ease-in-out_infinite] scale-110 shadow-[0_0_100px_40px_rgba(16,185,129,0.4)] bg-emerald-500/20" 
            : isStreaming
              ? "animate-[spin_4s_linear_infinite] scale-100 shadow-[0_0_80px_20px_rgba(59,130,246,0.3)] bg-blue-500/20"
              : isListening
                ? "scale-105 shadow-[0_0_60px_20px_rgba(239,68,68,0.3)] bg-red-500/20"
                : "scale-100 shadow-[0_0_40px_10px_rgba(255,255,255,0.05)] bg-white/5"
        }`}>
          {/* Inner Core */}
          <div className={`w-32 h-32 rounded-full blur-xl transition-all duration-500 ${
            isSpeaking ? "bg-emerald-400" : isStreaming ? "bg-blue-400" : isListening ? "bg-red-400" : "bg-white/20"
          }`} />
        </div>
      </div>

      {/* PiP Camera (Bottom Right) */}
      <div className="absolute bottom-28 right-6 w-32 md:w-48 aspect-[3/4] md:aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10 z-10">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="w-full h-full object-cover scale-x-[-1]"
        />
      </div>

      {/* Status Text */}
      <div className="absolute bottom-32 left-0 right-0 text-center z-10 pointer-events-none">
        <div className="text-zinc-400 text-lg tracking-widest uppercase font-semibold">
          {stage !== "idle" ? stage : isListening ? "Listening..." : isSpeaking ? "Speaking" : "Ready"}
        </div>
      </div>

      {/* Controls Overlay */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center gap-6 z-10">
        <button
          onClick={toggleListening}
          disabled={isStreaming}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all transform hover:scale-105 shadow-xl ${
            isListening 
              ? "bg-red-500 text-white animate-pulse shadow-red-500/50" 
              : isStreaming 
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed" 
                : "bg-white text-zinc-900 hover:bg-zinc-200"
          }`}
        >
          {isListening ? (
             <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          ) : (
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
          )}
        </button>
      </div>
    </div>
  );
}
