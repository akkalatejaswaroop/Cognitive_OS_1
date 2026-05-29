"use client";

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/card';
import { Textarea } from '@/components/ui/card';
import { 
  Mic, 
  Square, 
  Type, 
  FileUp, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Brain,
  History,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/lib/api';

const KnowledgeCapture: React.FC = () => {
  const [mode, setActiveMode] = useState<'text' | 'voice' | 'file'>('text');
  const [isRecording, setIsRecording] = useState(false);
  const [textContent, setTextContent] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastEntryId, setLastEntryId] = useState<string | null>(null);
  const [entryStatus, setEntryStatus] = useState<any>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const handleTextSubmit = async () => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('text', textContent);
      
      const response = await apiClient('/api/v1/knowledge/text', {
        method: 'POST',
        body: formData,
      }) as Response;
      const data = await response.json();
      setLastEntryId(data.entry_id);
      setTextContent('');
      pollStatus(data.entry_id);
    } catch (error) {
      console.error('Failed to capture text:', error);
    }
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder.current = new MediaRecorder(stream);
    audioChunks.current = [];

    mediaRecorder.current.ondataavailable = (event) => {
      audioChunks.current.push(event.data);
    };

    mediaRecorder.current.onstop = async () => {
      const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
      await uploadVoice(audioBlob);
    };

    mediaRecorder.current.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
  };

  const uploadVoice = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', blob, 'capture.wav');
      
      const response = await apiClient('/api/v1/knowledge/voice', {
        method: 'POST',
        body: formData,
      }) as Response;
      const data = await response.json();
      setLastEntryId(data.entry_id);
      pollStatus(data.entry_id);
    } catch (error) {
      console.error('Failed to upload voice:', error);
    }
  };

  const handleFileSubmit = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await apiClient('/api/v1/knowledge/file', {
        method: 'POST',
        body: formData,
      }) as Response;
      const data = await response.json();
      setLastEntryId(data.entry_id);
      pollStatus(data.entry_id);
    } catch (error) {
      console.error('Failed to upload file:', error);
    }
  };

  const pollStatus = async (id: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await apiClient(`/api/v1/knowledge/${id}`) as Response;
        const data = await response.json();
        setEntryStatus(data);
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval);
          setIsProcessing(false);
        }
      } catch (error) {
        clearInterval(interval);
        setIsProcessing(false);
      }
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card className="bg-[#1E1B18]/70 border border-white/[0.07] backdrop-blur-2xl shadow-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-2xl font-bold font-display text-white">
            <Brain className="w-8 h-8 text-[#E8D5B7]" />
            Knowledge Capture
          </CardTitle>
          <div className="flex gap-2 mt-4">
            <Button 
              variant={mode === 'text' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setActiveMode('text')}
              className="gap-2 font-bold"
            >
              <Type className="w-4 h-4 stroke-[1.5]" /> Text
            </Button>
            <Button 
              variant={mode === 'voice' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setActiveMode('voice')}
              className="gap-2 font-bold"
            >
              <Mic className="w-4 h-4 stroke-[1.5]" /> Voice
            </Button>
            <Button 
              variant={mode === 'file' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setActiveMode('file')}
              className="gap-2 font-bold"
            >
              <FileUp className="w-4 h-4 stroke-[1.5]" /> File
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <AnimatePresence mode="wait">
            {mode === 'text' && (
              <motion.div 
                key="text"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4"
              >
                <Textarea 
                  placeholder="Capture a thought, decision, or note..."
                  className="h-40 bg-black/20 border-white/[0.07] focus:border-[#E8D5B7]/50 focus:ring-1 focus:ring-[#E8D5B7]/50 transition-all text-lg"
                  value={textContent}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTextContent(e.target.value)}
                />
                <Button 
                  className="w-full h-12 text-lg font-bold"
                  disabled={!textContent || isProcessing}
                  onClick={handleTextSubmit}
                  variant="default"
                >
                  {isProcessing ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                  Record to Memory
                </Button>
              </motion.div>
            )}

            {mode === 'voice' && (
              <motion.div 
                key="voice"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-10 space-y-6"
              >
                <div className="relative">
                  {isRecording && (
                    <motion.div 
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute inset-0 bg-[#C2410C]/20 rounded-full blur-2xl"
                    />
                  )}
                  <button 
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`w-24 h-24 rounded-full flex items-center justify-center transition-all shadow-xl hover:scale-105 active:scale-95 cursor-pointer ${
                      isRecording ? 'bg-[#C2410C] hover:bg-[#C2410C]/90 text-white' : 'bg-[#E8D5B7] hover:bg-[#FAF8F5] text-[#1C1917]'
                    }`}
                  >
                    {isRecording ? <Square className="w-10 h-10 text-white fill-white stroke-none" /> : <Mic className="w-10 h-10 stroke-[1.5]" />}
                  </button>
                </div>
                <p className="text-sm text-[#A09880] font-medium">
                  {isRecording ? 'Recording your thought...' : 'Click to start voice capture'}
                </p>
              </motion.div>
            )}

            {mode === 'file' && (
              <motion.div 
                key="file"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="border-2 border-dashed border-white/10 rounded-2xl p-12 text-center hover:border-[#E8D5B7]/40 transition-colors cursor-pointer relative group bg-black/10">
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={handleFileSubmit}
                    accept=".pdf,.docx,.txt"
                    disabled={isProcessing}
                  />
                  <FileUp className="w-12 h-12 text-[#5C5448] mx-auto mb-4 group-hover:text-[#E8D5B7] transition-colors stroke-[1.25]" />
                  <p className="text-[#A09880] font-medium group-hover:text-[#F5F0E8] transition-colors">
                    Click or drag to upload meeting notes (PDF, DOCX)
                  </p>
                  <p className="text-[10px] text-[#5C5448] mt-2">Max file size: 10MB</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Progress & Insight Panel */}
      {entryStatus && (
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <Card className="bg-[#1E1B18]/70 border border-white/[0.07] backdrop-blur-2xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-white">
                {entryStatus.status === 'completed' ? <CheckCircle2 className="w-4 h-4 text-[#4D7C5F]" /> : <Loader2 className="w-4 h-4 animate-spin text-[#E8D5B7]" />}
                Processing Status: {entryStatus.status.toUpperCase()}
              </CardTitle>
              <span className="text-[10px] text-[#A09880] font-mono">{entryStatus.id.slice(0,8)}</span>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-[#A09880] font-medium border-l-2 border-[#E8D5B7] pl-3 italic">
                {entryStatus.log}
              </p>
              
              {entryStatus.insight && (
                <div className="pt-4 border-t border-white/5 space-y-4">
                  <div>
                    <h4 className="text-xs font-bold uppercase text-[#5C5448] mb-2">AI Summary</h4>
                    <p className="text-sm text-[#F5F0E8] leading-relaxed bg-black/20 p-3 rounded-lg border border-white/[0.03]">
                      {entryStatus.insight.summary}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-[10px] font-bold uppercase text-[#5C5448] mb-2">Key Points</h4>
                      <ul className="text-xs space-y-1">
                        {entryStatus.insight.key_points.map((p: string, i: number) => (
                          <li key={i} className="flex gap-2 text-[#A09880]">
                            <span className="text-[#E8D5B7]">•</span> {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-bold uppercase text-[#5C5448] mb-2">Action Items</h4>
                      <ul className="text-xs space-y-1">
                        {entryStatus.insight.action_items.map((a: string, i: number) => (
                          <li key={i} className="flex gap-2 text-[#4D7C5F] font-semibold">
                            <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" /> {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

export default KnowledgeCapture;
