import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, Loader2, BarChart2 } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";

interface VoiceInputProps {
  onTranscriptChange: (text: string) => void;
  initialText?: string;
  placeholder?: string;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ 
  onTranscriptChange, 
  initialText = '',
  placeholder = 'Tap microphone to speak...'
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [text, setText] = useState(initialText);
  const [volumeLevel, setVolumeLevel] = useState(0);
  
  // Refs for cleanup and processing
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const lastVolumeUpdateRef = useRef<number>(0);
  const textRef = useRef<string>(initialText || '');

  // 1. Lifecycle Effect: Handles mount/unmount cleanup ONLY.
  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
      stopSession();
    };
  }, []);

  // 2. Data Sync Effect: Handles external text updates
  useEffect(() => {
    if (initialText !== textRef.current) {
        setText(initialText || '');
        textRef.current = initialText || '';
    }
  }, [initialText]);

  const startSession = async () => {
    if (!process.env.API_KEY) {
      alert("API Key is missing. Cannot start voice recognition.");
      return;
    }
    
    if (isListening || isConnecting) return;

    setIsConnecting(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // 1. Initialize Audio Context
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass({
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;

      // Ensure context is running
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      // 2. Get Microphone Stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;

      // 3. Connect to Gemini Live
      const session = await ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
          responseModalities: [Modality.AUDIO], 
          inputAudioTranscription: {}, 
          systemInstruction: {
            parts: [{ text: "You are a helpful listener for a grounding exercise. Transcribe precisely what the user says. Do not respond with audio, just listen." }]
          }
        },
        callbacks: {
          onopen: () => {
            if (!isMountedRef.current) {
              session.close();
              return;
            }
            console.log("Gemini Live Connected");
            setIsConnecting(false);
            setIsListening(true);
            
            // 4. Start Audio Processing
            const source = audioContext.createMediaStreamSource(stream);
            sourceRef.current = source;
            
            const processor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              if (!sessionRef.current || !isMountedRef.current) return; 

              const inputData = e.inputBuffer.getChannelData(0);
              
              // Calculate Volume for Visualizer
              const now = Date.now();
              if (now - lastVolumeUpdateRef.current > 100) {
                let sum = 0;
                for(let i=0; i<inputData.length; i+=10) { // Subsample for perf
                   sum += inputData[i] * inputData[i];
                }
                const rms = Math.sqrt(sum / (inputData.length / 10));
                // Boost visual factor
                setVolumeLevel(Math.min(1, rms * 5)); 
                lastVolumeUpdateRef.current = now;
              }

              // Send to Gemini
              const pcmData = floatTo16BitPCM(inputData);
              const base64Data = arrayBufferToBase64(pcmData);
              
              session.sendRealtimeInput({
                media: {
                  mimeType: "audio/pcm;rate=16000",
                  data: base64Data
                }
              });
            };
            
            source.connect(processor);
            processor.connect(audioContext.destination);
          },
          onmessage: (message: LiveServerMessage) => {
            if (!isMountedRef.current) return;

            if (message.serverContent?.inputTranscription) {
               const transcriptChunk = message.serverContent.inputTranscription.text;
               if (transcriptChunk) {
                 const currentText = textRef.current;
                 const cleanChunk = transcriptChunk.trim();
                 
                 if (cleanChunk) {
                    const needsSpace = currentText.length > 0 && !currentText.endsWith(' ');
                    const newText = currentText + (needsSpace ? ' ' : '') + cleanChunk;
                    
                    setText(newText);
                    textRef.current = newText; // Immediate update
                    onTranscriptChange(newText);
                 }
               }
            }
          },
          onclose: () => {
            console.log("Gemini Live Closed");
            if (isMountedRef.current) {
              setIsListening(false);
              setIsConnecting(false);
            }
          },
          onerror: (err) => {
            console.error("Gemini Live Error", err);
            if (isMountedRef.current) {
              setIsListening(false);
              setIsConnecting(false);
            }
          }
        }
      });
      
      sessionRef.current = session;

    } catch (error) {
      console.error("Failed to start session:", error);
      if (isMountedRef.current) {
        setIsConnecting(false);
        setIsListening(false);
        alert("Could not access microphone. Please check permissions.");
      }
    }
  };

  const stopSession = () => {
    // 1. Close Session
    if (sessionRef.current) {
        try { sessionRef.current.close(); } catch (e) { console.warn(e); }
        sessionRef.current = null;
    }

    // 2. Stop Processor & Source
    if (processorRef.current) {
       try { processorRef.current.disconnect(); } catch (e) {}
      processorRef.current = null;
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch (e) {}
      sourceRef.current = null;
    }

    // 3. Stop Tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    // 4. Close Context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try { audioContextRef.current.close(); } catch (e) {}
      audioContextRef.current = null;
    }

    setVolumeLevel(0);
    if (isMountedRef.current) {
      setIsListening(false);
      setIsConnecting(false);
    }
  };

  const toggleListening = () => {
    if (isListening || isConnecting) {
      stopSession();
    } else {
      startSession();
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    textRef.current = val;
    onTranscriptChange(val);
  };

  // --- Audio Helpers ---
  const floatTo16BitPCM = (input: Float32Array) => {
    const output = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    return output.buffer;
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="relative">
        <textarea
          value={text}
          onChange={handleTextChange}
          placeholder={placeholder}
          className="w-full h-32 p-4 rounded-2xl border border-sage-200 bg-white/50 focus:bg-white focus:ring-2 focus:ring-sage-300 focus:outline-none resize-none text-lg leading-relaxed text-charcoal placeholder-gray-400 transition-all"
        />
        
        {/* Active Visualizer */}
        {isListening && (
            <div className="absolute bottom-4 right-4 flex items-end h-6 gap-1">
                <div 
                  className="w-1.5 bg-terracotta rounded-full transition-all duration-75 ease-out" 
                  style={{ height: `${20 + volumeLevel * 60}%`, opacity: 0.6 }} 
                />
                <div 
                  className="w-1.5 bg-terracotta rounded-full transition-all duration-75 delay-75 ease-out" 
                  style={{ height: `${30 + volumeLevel * 80}%`, opacity: 0.8 }} 
                />
                <div 
                  className="w-1.5 bg-terracotta rounded-full transition-all duration-75 delay-100 ease-out" 
                  style={{ height: `${20 + volumeLevel * 60}%`, opacity: 0.6 }} 
                />
            </div>
        )}
      </div>

      <div className="flex justify-center flex-col items-center">
        <button
          onClick={toggleListening}
          disabled={isConnecting}
          className={`
            h-20 w-20 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 relative
            ${isListening 
              ? 'bg-terracotta text-white' 
              : isConnecting
                ? 'bg-sage-300 text-white cursor-wait'
                : 'bg-sage-400 text-white hover:bg-sage-500 hover:scale-105'
            }
          `}
        >
          {/* Ripple effect when listening */}
          {isListening && (
            <span className="absolute inset-0 rounded-full border-2 border-terracotta animate-ping opacity-75"></span>
          )}
          
          {isConnecting ? (
            <Loader2 className="animate-spin" size={32} />
          ) : isListening ? (
            <Square fill="currentColor" size={24} />
          ) : (
            <Mic size={32} />
          )}
        </button>
        <p className="text-center text-sm text-gray-400 mt-4 h-5 font-medium flex items-center gap-2">
          {isConnecting 
            ? 'Connecting to AI...' 
            : isListening 
              ? <span className="flex items-center gap-2 text-terracotta font-semibold"><BarChart2 size={14}/> Listening...</span> 
              : 'Tap microphone to speak'}
        </p>
      </div>
    </div>
  );
};