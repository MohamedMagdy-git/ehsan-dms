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
  hideSpeed?: boolean;
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

const WAVEFORM_BAR_COUNT = 40;
const COMPACT_WAVEFORM_BAR_COUNT = 26;
const PLAYBACK_RATES = [1, 1.5, 2] as const;
type PlaybackRate = (typeof PLAYBACK_RATES)[number];

/**
 * Generates a deterministic, speech-like waveform bar height array (values 22..100)
 * based on a string seed so every researcher/recording has a natural, consistent
 * audio wave signature across SSR and client renders.
 */
function generateWaveformBars(seedText: string, count = WAVEFORM_BAR_COUNT): number[] {
  let hash = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    hash ^= seedText.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    hash ^= i + 17;
    hash = Math.imul(hash, 16777619);
    const pseudo = ((hash >>> 0) % 1000) / 1000;

    // Envelope that tapers at start/end and creates natural speech phrases
    const normPos = i / (count - 1);
    const edgeTaper = Math.sin(Math.PI * normPos);
    const phraseWave =
      0.55 +
      0.3 * Math.sin(normPos * Math.PI * 5) +
      0.15 * Math.cos(normPos * Math.PI * 11);

    const rawHeight = (0.28 + 0.72 * pseudo) * (0.35 + 0.65 * edgeTaper) * phraseWave;
    const clampedPct = Math.round(Math.max(22, Math.min(100, rawHeight * 115)));
    bars.push(clampedPct);
  }
  return bars;
}

export function ResearcherVoicePlayer({
  audioUrl,
  durationSeconds = 16,
  researcherName,
  fileName: _fileName = 'تسجيل_صوتي_للباحث.webm',
  transcriptHint,
  compact = false,
  hideSpeed = false,
  onDelete,
  onReRecord,
  className = '',
}: ResearcherVoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [loadedDuration, setLoadedDuration] = useState<number | null>(null);
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1);

  const isCompactMode = Boolean(compact || onReRecord);
  const shouldHideSpeed = Boolean(hideSpeed || compact || onReRecord);

  const totalDuration = Math.max(1, loadedDuration || durationSeconds || 16);
  const progressRatio = Math.max(0, Math.min(1, currentTime / totalDuration));

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

  const formattedResearcher = useMemo(() => {
    if (!researcherName) return '';
    const trimmed = researcherName.trim();
    if (trimmed.startsWith('أ.') || trimmed.startsWith('م.') || trimmed.startsWith('د.')) {
      return trimmed;
    }
    return `أ. ${trimmed}`;
  }, [researcherName]);

  const waveformBars = useMemo(
    () =>
      generateWaveformBars(
        `${formattedResearcher || 'researcher'}-${durationSeconds}-${transcriptHint?.slice(0, 24) || ''}`,
        isCompactMode ? COMPACT_WAVEFORM_BAR_COUNT : WAVEFORM_BAR_COUNT
      ),
    [formattedResearcher, durationSeconds, transcriptHint, isCompactMode]
  );

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
      audio.playbackRate = playbackRate;
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
              utterance.rate = playbackRate;
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

  const handleCyclePlaybackRate = () => {
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate);
    const nextRate = PLAYBACK_RATES[(currentIndex + 1) % PLAYBACK_RATES.length];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const seekToRatio = (ratio: number) => {
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const newTime = clampedRatio * totalDuration;
    setCurrentTime(newTime);
    if (audioRef.current && Number.isFinite(newTime)) {
      audioRef.current.currentTime = newTime;
    }
  };

  const handleWaveformKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      seekToRatio((currentTime + 2) / totalDuration);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      seekToRatio((currentTime - 2) / totalDuration);
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      togglePlay();
    }
  };

  return (
    <div
      className={`w-full max-w-full min-w-0 overflow-hidden rounded-2xl p-3 border transition-colors shadow-none flex flex-wrap md:flex-nowrap items-center justify-between gap-x-2.5 sm:gap-x-3 gap-y-2.5 text-right ${
        isPlaying
          ? 'bg-[#005756]/[0.025] border-[#005756]/25'
          : 'bg-slate-50/90 border-slate-200/80'
      } ${className}`}
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
          e.currentTarget.playbackRate = playbackRate;
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

      {/* 1. Right Zone: Circular Play/Pause Button + Researcher Identity */}
      <div className="flex items-center gap-2.5 min-w-0 shrink-0">
        <button
          type="button"
          onClick={togglePlay}
          className="w-9 h-9 rounded-full bg-[#005756] hover:bg-[#004241] text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
          title={isPlaying ? 'إيقاف مؤقت' : 'تشغيل التسجيل الصوتي'}
          aria-label={isPlaying ? 'إيقاف مؤقت للتسجيل الصوتي' : 'تشغيل التسجيل الصوتي'}
        >
          {isPlaying ? <Pause size={15} /> : <Play size={15} className="mr-0.5" />}
        </button>

        <div className="min-w-0 max-w-[125px] sm:max-w-[200px] leading-snug">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 truncate">
            <Mic size={12} className="text-[#005756] shrink-0" aria-hidden="true" />
            <span className="truncate">تسجيل الباحث الصوتي</span>
            {formattedResearcher && (
              <>
                <span className="text-slate-300 shrink-0" aria-hidden="true">
                  ·
                </span>
                <span className="text-slate-600 font-medium truncate">
                  {formattedResearcher}
                </span>
              </>
            )}
          </div>
          <p className="text-[11px] text-slate-500 truncate mt-0.5">
            ملخص صوتي عن وضع الأسرة
          </p>
        </div>
      </div>

      {/* 2. Center Zone: Elapsed Time + Fluid Audio Waveform Bars + Total Duration */}
      <div className="order-3 md:order-2 w-full md:w-auto flex-1 min-w-0 overflow-hidden flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/80 border border-slate-200/60">
        <span className="font-mono text-[11px] text-slate-700 font-semibold shrink-0 tabular-nums">
          {formatAudioTime(currentTime)}
        </span>

        <div
          role="slider"
          tabIndex={0}
          aria-label="موجات تقدم التسجيل الصوتي"
          aria-valuemin={0}
          aria-valuemax={Math.round(totalDuration)}
          aria-valuenow={Math.round(currentTime)}
          onKeyDown={handleWaveformKeyDown}
          className="group flex-1 min-w-0 overflow-hidden h-6 flex items-center justify-between gap-px sm:gap-[2px] cursor-pointer select-none focus:outline-hidden"
        >
          {waveformBars.map((heightPct, idx) => {
            const barRatio = idx / Math.max(1, waveformBars.length - 1);
            const isPlayed =
              currentTime > 0 && (barRatio <= progressRatio || idx === 0);

            return (
              <button
                key={idx}
                type="button"
                tabIndex={-1}
                onClick={() => seekToRatio(idx / Math.max(1, waveformBars.length - 1))}
                aria-label={`الانتقال إلى الثانية ${Math.round(
                  barRatio * totalDuration
                )}`}
                className="flex-1 min-w-0 shrink h-full flex items-center justify-center py-0.5 cursor-pointer focus:outline-hidden"
              >
                <span
                  style={{ height: `${heightPct}%` }}
                  className={`w-full max-w-[3px] min-w-[1.5px] shrink rounded-full transition-colors duration-150 ${
                    isPlayed
                      ? 'bg-[#005756]'
                      : 'bg-slate-300/90 group-hover:bg-slate-400/80'
                  }`}
                />
              </button>
            );
          })}
        </div>

        <span className="font-mono text-[11px] text-slate-400 font-medium shrink-0 tabular-nums">
          {formatAudioTime(totalDuration)}
        </span>
      </div>

      {/* 3. Left Zone: Playback Speed Toggle & Optional Record Actions */}
      {(!shouldHideSpeed || onReRecord || onDelete) && (
        <div className="order-2 md:order-3 flex items-center gap-1.5 shrink-0">
          {!shouldHideSpeed && (
            <button
              type="button"
              onClick={handleCyclePlaybackRate}
              title="تغيير سرعة تشغيل التسجيل الصوتي"
              aria-label={`سرعة التشغيل الحالية ${playbackRate}x — اضغط للتغيير`}
              className={`h-7 px-2.5 rounded-lg border font-mono text-[11px] font-bold tabular-nums transition-colors cursor-pointer shrink-0 ${
                playbackRate > 1
                  ? 'bg-[#005756] text-white border-[#005756]'
                  : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-[#005756] border-slate-200/80'
              }`}
            >
              {playbackRate}x
            </button>
          )}

          {onReRecord && (
            <button
              type="button"
              onClick={onReRecord}
              className="h-7 px-2 text-[11px] rounded-lg bg-white border border-slate-200/80 text-[#005756] hover:bg-slate-100 font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              title="إعادة التسجيل"
            >
              <Mic size={12} className="shrink-0" />
              <span>إعادة</span>
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="h-7 px-2 text-[11px] rounded-lg bg-white border border-slate-200/80 text-rose-700 hover:bg-rose-50 font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              title="مسح التسجيل"
              aria-label="مسح التسجيل"
            >
              <Trash2 size={12} className="shrink-0" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
