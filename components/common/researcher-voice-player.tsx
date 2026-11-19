'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Play,
  Pause,
  Trash2,
  Mic,
} from 'lucide-react';

interface ResearcherVoicePlayerProps {
  audioUrl?: string | null;
  durationSeconds?: number;
  researcherName?: string;
  fileName?: string;
  transcriptHint?: string;
  compact?: boolean;
  onDelete?: () => void;
  onReRecord?: () => void;
  className?: string;
}

/**
 * Generates a valid playable WAV Data URL of a given duration (in seconds)
 * so that pre-seeded cases without a live microphone blob still have a real,
 * seekable <audio> stream with accurate time and progress bar.
 */
function createFallbackWavUrl(seconds = 15): string {
  const sampleRate = 8000;
  const numSamples = sampleRate * Math.max(3, Math.min(seconds, 60));
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.sin(Math.PI * ((t % 1.8) / 1.8)) * 0.08;
    const sample =
      (Math.sin(2 * Math.PI * 220 * t) * 0.6 +
        Math.sin(2 * Math.PI * 330 * t) * 0.4) *
      envelope;
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample)) * 32767, true);
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function ResearcherVoicePlayer({
  audioUrl,
  durationSeconds = 16,
  researcherName,
  fileName: _fileName = 'تسجيل_صوتي_للباحث.webm',
  transcriptHint,
  compact: _compact = false,
  onDelete,
  onReRecord,
  className = '',
}: ResearcherVoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [loadedDuration, setLoadedDuration] = useState<number | null>(null);

  const totalDuration = loadedDuration || durationSeconds || 16;

  const isRealRecording = Boolean(
    audioUrl && (audioUrl.startsWith('blob:') || audioUrl.startsWith('data:audio'))
  );

  const fallbackWavUrl = useMemo(() => {
    if (typeof window === 'undefined' || isRealRecording) return null;
    return createFallbackWavUrl(durationSeconds || 16);
  }, [isRealRecording, durationSeconds]);

  useEffect(() => {
    return () => {
      if (fallbackWavUrl) {
        URL.revokeObjectURL(fallbackWavUrl);
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [fallbackWavUrl]);

  const effectiveSrc = isRealRecording ? audioUrl! : fallbackWavUrl || undefined;

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      if (!isRealRecording && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } else {
      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          if (
            !isRealRecording &&
            transcriptHint &&
            typeof window !== 'undefined' &&
            'speechSynthesis' in window
          ) {
            try {
              window.speechSynthesis.cancel();
              const utterance = new SpeechSynthesisUtterance(transcriptHint);
              utterance.lang = 'ar-EG';
              utterance.rate = 1.0;
              window.speechSynthesis.speak(utterance);
            } catch {
              // ignore speech synthesis errors
            }
          }
        })
        .catch((err) => {
          console.error('Audio play error:', err);
        });
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = Number(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current && Number.isFinite(newTime)) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleSkip = (deltaSeconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const target = Math.max(0, Math.min(totalDuration || 16, audio.currentTime + deltaSeconds));
    audio.currentTime = target;
    setCurrentTime(target);
  };

  const formattedResearcher = useMemo(() => {
    if (!researcherName) return '';
    const trimmed = researcherName.trim();
    if (trimmed.startsWith('أ.') || trimmed.startsWith('م.') || trimmed.startsWith('د.')) {
      return trimmed;
    }
    return `أ. ${trimmed}`;
  }, [researcherName]);

  return (
    <div
      className={`w-full max-w-full overflow-hidden bg-slate-50/80 border border-slate-200/80 rounded-xl px-3.5 sm:px-4 py-2.5 flex flex-wrap md:flex-nowrap items-center justify-between gap-x-2.5 gap-y-2 text-right ${className}`}
      dir="rtl"
    >
      <audio
        ref={audioRef}
        src={effectiveSrc}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const dur = e.currentTarget.duration;
          if (Number.isFinite(dur) && dur > 0) {
            setLoadedDuration(Math.round(dur));
          }
        }}
        onTimeUpdate={(e) => {
          setCurrentTime(e.currentTarget.currentTime);
        }}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
          if (!isRealRecording && typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
        }}
        className="hidden"
      />

      {/* Right Side: Play/Pause Circular Button + Identity */}
      <div className="flex items-center gap-2.5 min-w-0 flex-1 md:flex-initial md:shrink-0 max-w-full">
        <button
          type="button"
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-[#005756] hover:bg-[#004241] text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل التسجيل الصوتي'}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} className="mr-0.5" />}
        </button>

        <div className="min-w-0 leading-snug">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 truncate">
            <span className="truncate">تسجيل الباحث الصوتي</span>
            {formattedResearcher && (
              <>
                <span className="text-slate-300 shrink-0" aria-hidden="true">·</span>
                <span className="text-slate-600 font-medium truncate">{formattedResearcher}</span>
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-500 truncate">
            ملخص صوتي عن وضع الأسرة
          </p>
        </div>
      </div>

      {/* Middle: Progress Scrubber + Current Time (Right) & Total Duration (Left) */}
      <div className="order-3 md:order-2 w-full md:w-auto md:flex-1 min-w-0 flex items-center gap-2 overflow-hidden">
        <span className="font-mono text-[11px] text-slate-500 font-semibold shrink-0 tabular-nums">
          {formatAudioTime(currentTime)}
        </span>

        <div className="flex-1 min-w-0 flex items-center overflow-hidden">
          <input
            type="range"
            min={0}
            max={Math.max(1, totalDuration)}
            step={0.1}
            value={Math.min(currentTime, Math.max(1, totalDuration))}
            onChange={handleSeek}
            className="w-full min-w-0 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#005756]"
            aria-label="شريط تقدم الصوت"
          />
        </div>

        <span className="font-mono text-[11px] text-slate-500 font-semibold shrink-0 tabular-nums">
          {formatAudioTime(totalDuration)}
        </span>
      </div>

      {/* Left Side: Quick Skip Controls (-10s / +10s) & Optional Researcher Actions */}
      <div className="order-2 md:order-3 flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => handleSkip(-10)}
          className="text-[11px] px-2 py-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-mono font-semibold transition-colors cursor-pointer tabular-nums"
          title="رجوع 10 ثواني"
        >
          -10ث
        </button>
        <button
          type="button"
          onClick={() => handleSkip(10)}
          className="text-[11px] px-2 py-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-mono font-semibold transition-colors cursor-pointer tabular-nums"
          title="تقديم 10 ثواني"
        >
          +10ث
        </button>

        {onReRecord && (
          <button
            type="button"
            onClick={onReRecord}
            className="text-[11px] px-2 py-1 rounded-md text-[#005756] hover:bg-slate-200/60 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="إعادة التسجيل"
          >
            <Mic size={12} />
            <span className="hidden sm:inline">إعادة</span>
          </button>
        )}

        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="text-[11px] px-2 py-1 rounded-md text-rose-700 hover:bg-rose-50 font-semibold flex items-center gap-1 transition-colors cursor-pointer"
            title="مسح التسجيل"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
