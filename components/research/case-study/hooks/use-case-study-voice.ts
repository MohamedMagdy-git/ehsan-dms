'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AttachmentItem, IWindow } from '../types';

export interface UseCaseStudyVoiceOptions {
  setUploadedDocs: React.Dispatch<React.SetStateAction<AttachmentItem[]>>;
  showToast: (message: string) => void;
  caseSummary?: string;
  onApplyExtractedData?: (extractedData: any) => void;
}

export function useCaseStudyVoice({
  setUploadedDocs,
  showToast,
  caseSummary = '',
  onApplyExtractedData,
}: UseCaseStudyVoiceOptions) {
  // ----------------------------------------------------
  // Full Voice Recording & AI Auto-fill (MediaRecorder)
  // ----------------------------------------------------
  const [isFullAudioRecording, setIsFullAudioRecording] = useState(false);
  const [fullAudioDuration, setFullAudioDuration] = useState(0);
  const [fullAudioBlob, setFullAudioBlob] = useState<Blob | null>(null);
  const [fullAudioUrl, setFullAudioUrl] = useState<string | null>(null);
  const [isExtractingWithAI, setIsExtractingWithAI] = useState(false);
  const [isVoiceExtractionSuccess, setIsVoiceExtractionSuccess] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [voiceSessionTranscript, setVoiceSessionTranscript] = useState<string>('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sessionRecognitionRef = useRef<any>(null);

  // ----------------------------------------------------
  // Voice Dictation (Speech to Text)
  // ----------------------------------------------------
  const [isListening, setIsListening] = useState(false);
  const [activeVoiceField, setActiveVoiceField] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const stopVoiceDictation = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
    setActiveVoiceField(null);
  }, []);

  const toggleVoiceDictation = (
    fieldKey: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    if (isListening && activeVoiceField === fieldKey) {
      stopVoiceDictation();
      return;
    }

    const win = typeof window !== 'undefined' ? (window as IWindow) : null;
    const SpeechRecognitionClass = win?.SpeechRecognition || win?.webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      showToast('الإملاء الصوتي غير مدعوم في متصفحك، يمكنك استخدام لوحة المفاتيح');
      return;
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.lang = 'ar-EG';
      recognition.continuous = true;
      recognition.interimResults = true;

      recognition.onstart = () => {
        setIsListening(true);
        setActiveVoiceField(fieldKey);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            transcript += event.results[i][0].transcript + ' ';
          }
        }
        if (transcript.trim()) {
          setter((prev) => (prev ? `${prev} ${transcript.trim()}` : transcript.trim()));
        }
      };

      recognition.onerror = () => {
        setIsListening(false);
        setActiveVoiceField(null);
      };

      recognition.onend = () => {
        setIsListening(false);
        setActiveVoiceField(null);
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      setIsListening(false);
      setActiveVoiceField(null);
      showToast('تعذر تشغيل الميكروفون، يرجى السماح بالوصول في الإعدادات');
    }
  };

  // Helper format seconds to mm:ss
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start Full Audio Recording (MediaRecorder API)
  const startFullAudioRecording = async () => {
    if (isFullAudioRecording) return;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast('المتصفح لا يدعم تسجيل الصوت عبر الميكروفون المباشر');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      let options: MediaRecorderOptions = {};
      if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
        if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options = { mimeType: 'audio/webm;codecs=opus' };
        } else if (MediaRecorder.isTypeSupported('audio/webm')) {
          options = { mimeType: 'audio/webm' };
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options = { mimeType: 'audio/mp4' };
        }
      }

      const recorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mime = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });
        setFullAudioBlob(audioBlob);
        if (fullAudioUrl && fullAudioUrl.startsWith('blob:')) {
          URL.revokeObjectURL(fullAudioUrl);
        }
        const newUrl = URL.createObjectURL(audioBlob);
        setFullAudioUrl(newUrl);

        // Convert to Data URL for persistence across views/modals
        try {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (typeof reader.result === 'string') {
              setFullAudioUrl(reader.result);
            }
          };
          reader.readAsDataURL(audioBlob);
        } catch {
          // fallback to object URL
        }

        // Automatically attach as تسجيل_صوتي_للباحث.webm in case attachments
        const audioSizeMb = ((audioBlob.size || 240000) / (1024 * 1024)).toFixed(2);
        setUploadedDocs((prev) => [
          {
            id: 'doc-voice-memo',
            category: 'voiceRecording' as any,
            title: 'ملاحظات الباحث الصوتية عن الزيارة',
            fileName: 'تسجيل_صوتي_للباحث.webm',
            fileSize: `${audioSizeMb} MB`,
            progress: 100,
            status: 'completed' as const,
            customDescription: 'تم حفظ التسجيل وجاهز للمراجعة',
          },
          ...prev.filter(
            (item) => (item.category as string) !== 'voiceRecording' && item.id !== 'doc-voice-memo'
          ),
        ]);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.start(250);
      setIsFullAudioRecording(true);
      setFullAudioDuration(0);
      setIsVoiceExtractionSuccess(false);
      setVoiceSessionTranscript('');

      // Also start live browser speech recognition in background if supported
      const win = typeof window !== 'undefined' ? (window as IWindow) : null;
      const SpeechRecognitionClass = win?.SpeechRecognition || win?.webkitSpeechRecognition;
      if (SpeechRecognitionClass) {
        try {
          const recognition = new SpeechRecognitionClass();
          recognition.lang = 'ar-EG';
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.onresult = (event: any) => {
            let text = '';
            for (let i = 0; i < event.results.length; i++) {
              text += event.results[i][0].transcript + ' ';
            }
            if (text.trim()) {
              setVoiceSessionTranscript(text.trim());
            }
          };
          recognition.start();
          sessionRecognitionRef.current = recognition;
        } catch {
          // ignore
        }
      }

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setFullAudioDuration((prev) => prev + 1);
      }, 1000);

      showToast('🎙️ بدأ التسجيل... سجل بصوتك أي ملاحظة مش مكتوبة عن الزيارة');
    } catch (err: any) {
      console.error('Error starting media recording:', err);
      showToast('يرجى السماح بالوصول إلى الميكروفون لبدء التسجيل الصوتي');
    }
  };

  // Stop Full Audio Recording
  const stopFullAudioRecording = () => {
    if (!isFullAudioRecording && !mediaRecorderRef.current) return;
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    } catch (err) {
      console.error('Error stopping recorder:', err);
    }

    if (sessionRecognitionRef.current) {
      try {
        sessionRecognitionRef.current.stop();
      } catch {
        // ignore
      }
      sessionRecognitionRef.current = null;
    }

    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setIsFullAudioRecording(false);
    showToast('تم حفظ التسجيل وجاهز للمراجعة (تسجيل_صوتي_للباحث.webm)');
  };

  // Delete Recorded Audio Memo
  const deleteFullAudioRecording = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }
    setIsPlayingAudio(false);
    if (fullAudioUrl && fullAudioUrl.startsWith('blob:')) {
      URL.revokeObjectURL(fullAudioUrl);
    }
    setFullAudioBlob(null);
    setFullAudioUrl(null);
    setFullAudioDuration(0);
    setUploadedDocs((prev) =>
      prev.filter(
        (item) => (item.category as string) !== 'voiceRecording' && item.id !== 'doc-voice-memo'
      )
    );
    showToast('تم مسح الريكورد الصوتي، تقدر تسجل من جديد في أي وقت');
  };

  // Toggle playback of recorded audio
  const togglePlayRecordedAudio = () => {
    if (!audioPlayerRef.current || !fullAudioUrl) return;
    if (isPlayingAudio) {
      audioPlayerRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPlayerRef.current
        .play()
        .then(() => setIsPlayingAudio(true))
        .catch((e) => console.error(e));
    }
  };

  // AI Voice-to-Form Extraction Handler (Disabled in v1 via ENABLE_AI_EXTRACTION_V2)
  const handleAIVoiceExtraction = async () => {
    if (!fullAudioBlob && !caseSummary && !voiceSessionTranscript) {
      showToast('يرجى تسجيل مقطع صوتي أولاً لتفريغه وتعبئة الاستمارة آلياً');
      return;
    }

    setIsExtractingWithAI(true);
    try {
      const formData = new FormData();
      if (fullAudioBlob) {
        formData.append('audio', fullAudioBlob, 'case-interview.webm');
      }
      const textToSend = voiceSessionTranscript.trim() || caseSummary.trim();
      if (textToSend) {
        formData.append('transcribedText', textToSend);
      }

      const response = await fetch('/api/research/voice-extract', {
        method: 'POST',
        body: formData,
      });

      const contentType = response.headers.get('content-type') || '';
      let result: any;
      if (contentType.includes('application/json')) {
        result = await response.json();
      } else {
        throw new Error(
          response.status === 504 || response.status === 502
            ? 'استغرقت معالجة التسجيل وقتاً أطول من المتوقع، يرجى إعادة المحاولة'
            : `تعذر الاتصال بخدمة التحليل الذكي (${response.status})`
        );
      }

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'تعذر استخراج البيانات من الصوت');
      }

      const d = result.extractedData;
      if (d && onApplyExtractedData) {
        onApplyExtractedData(d);
      }

      // Attach raw audio recording to uploadedDocs
      if (fullAudioBlob) {
        const audioDocId = `audio-rec-${Date.now()}`;
        const audioSizeMb = ((fullAudioBlob.size || 250000) / (1024 * 1024)).toFixed(2);
        setUploadedDocs((prev) => [
          {
            id: audioDocId,
            category: 'voiceRecording' as any,
            title: 'تسجيل صوتي كامل لجلسة البحث الميداني',
            fileName: `field-voice-survey-${Date.now()}.webm`,
            fileSize: `${audioSizeMb} MB`,
            progress: 100,
            status: 'completed',
            customDescription: fullAudioUrl ? 'مقطع صوتي محفوظ للاستماع الإداري' : 'ملف صوتي خام',
          },
          ...prev.filter((item) => (item.category as string) !== 'voiceRecording'),
        ]);
      }

      setIsVoiceExtractionSuccess(true);
      showToast('✨ تم تفريغ وتعبئة كافة بنود الاستمارة والـ Checklist والملخص الإداري بنجاح!');
    } catch (err: any) {
      console.error('Error in AI extraction:', err);
      showToast(err?.message || 'تعذر استخراج البيانات من التسجيل الصوتي، يرجى المحاولة مرة أخرى');
    } finally {
      setIsExtractingWithAI(false);
    }
  };

  // Clean up media streams and intervals on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      if (sessionRecognitionRef.current) {
        try {
          sessionRecognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return {
    isFullAudioRecording,
    fullAudioDuration,
    setFullAudioDuration,
    fullAudioUrl,
    setFullAudioUrl,
    isExtractingWithAI,
    isVoiceExtractionSuccess,
    isPlayingAudio,
    setIsPlayingAudio,
    audioPlayerRef,
    isListening,
    activeVoiceField,
    toggleVoiceDictation,
    stopVoiceDictation,
    formatDuration,
    startFullAudioRecording,
    stopFullAudioRecording,
    deleteFullAudioRecording,
    togglePlayRecordedAudio,
    handleAIVoiceExtraction,
  };
}
