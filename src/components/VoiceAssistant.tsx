'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Volume2, Activity, Trash2, CheckCircle, 
  Clock, Sparkles, LayoutDashboard, Calendar, Settings, 
  Plus, Check, X, AlertCircle, RotateCcw, VolumeX, Ghost,
  MessageSquare, User
} from 'lucide-react';
import VoiceVisualizer from './VoiceVisualizer';

interface Task {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  scheduledFor: string | null;
  status: string;
}

interface DBMessage {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

export default function VoiceAssistant() {
  const [activeTab, setActiveTab] = useState<'agenda' | 'history' | 'settings'>('agenda');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [dbMessages, setDbMessages] = useState<DBMessage[]>([]);
  
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const transcriptRef = useRef('');
  const isProcessingRef = useRef(false);
  const lastProcessedTextRef = useRef('');
  const lastProcessedTimeRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    fetchTasks();
    fetchMessages();
    const pollInterval = setInterval(() => {
      fetchTasks();
      fetchMessages();
    }, 3000);
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Stay on even during pauses
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        if (audioRef.current) {
          audioRef.current.pause();
          setIsSpeaking(false);
        }
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPart = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            transcriptRef.current += transcriptPart;
          } else {
            interimTranscript += transcriptPart;
          }
        }
        setTranscript(transcriptRef.current + interimTranscript);
      };

      recognition.onend = () => {
        setIsListening(false);
        // On continuous mode, we process when the user MANUALLY stops or error occurs
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    return () => {
      recognitionRef.current?.stop();
      clearInterval(pollInterval);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [dbMessages, isProcessing]);

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      if (Array.isArray(data)) setTasks(data);
    } catch (error) {}
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/messages');
      const data = await res.json();
      if (Array.isArray(data)) setDbMessages(data);
    } catch (error) {}
  };

  const handleDeleteManual = async (id: string) => {
    if (!confirm("Remove this item?")) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      if (res.ok) fetchTasks();
    } catch (error) {}
  };

  const handleToggleStatus = async (task: Task) => {
    try {
      const newStatus = task.status === 'completed' ? 'pending' : 'completed';
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) fetchTasks();
    } catch (error) {}
  };

  const handleUserAudio = async (text: string) => {
    const now = Date.now();
    const cleanText = text.trim().toLowerCase();
    
    if (!text.trim() || isProcessingRef.current) return;
    
    isProcessingRef.current = true;
    lastProcessedTextRef.current = cleanText;
    lastProcessedTimeRef.current = now;
    
    setIsProcessing(true);
    setTranscript('');
    transcriptRef.current = '';
    
    // Include last 10 messages from DB for deep context
    const contextMessages = dbMessages.slice(-10).map(m => ({ role: m.role, content: m.content }));
    const newUserMessage = { role: 'user', content: text };
    const updatedMessages = [...contextMessages, newUserMessage];
    setMessages(updatedMessages);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setMessages(data.messages);
      if (data.hasUpdates) fetchTasks();
      fetchMessages();
      if (data.message?.content) speak(data.message.content);

    } catch (error) {
      speak("Connection interrupted.");
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  };

  const speak = async (text: string) => {
    if (!text) return;
    try {
      if (audioRef.current) audioRef.current.pause();
      setIsSpeaking(true);
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };
      if (audioRef.current) audioRef.current.pause();
      audioRef.current = audio;
      await audio.play();
    } catch (error) {
      setIsSpeaking(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      // On stop, we trigger the processing
      const finalTranscript = transcriptRef.current;
      if (finalTranscript) {
        handleUserAudio(finalTranscript);
      }
    } else {
      setTranscript('');
      transcriptRef.current = '';
      recognitionRef.current?.start();
    }
  };

  const handleResetAll = async () => {
    if (!confirm("THIS WILL WIPE EVERYTHING. Proceed?")) return;
    try {
      await fetch('/api/messages', { method: 'DELETE' });
      const activeTasks = tasks.map(t => t.id);
      for (const id of activeTasks) {
        await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
      }
      fetchTasks();
      fetchMessages();
    } catch (error) {}
  };

  const getCategoryColor = (cat: string | null) => {
    const c = cat?.toUpperCase();
    if (c === 'WORK') return 'bg-blue-50 text-blue-600 border-blue-100';
    if (c === 'PERSONAL') return 'bg-purple-50 text-purple-600 border-purple-100';
    if (c === 'MEETING') return 'bg-orange-50 text-orange-600 border-orange-100';
    if (c === 'REMINDER') return 'bg-indigo-50 text-indigo-600 border-indigo-100';
    return 'bg-slate-50 text-slate-600 border-slate-100';
  };

  return (
    <div className="flex h-screen overflow-hidden text-slate-900 selection:bg-blue-100 font-outfit">
      {/* Sidebar Navigation */}
      <aside className="w-20 md:w-64 bg-white border-r border-slate-100 flex flex-col items-center py-8">
        <div className="mb-12 flex items-center justify-center space-x-2 px-6">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <span className="hidden md:block font-bold text-xl tracking-tight">Vortex AI</span>
        </div>
        
        <nav className="flex-1 w-full px-4 space-y-2">
          <button onClick={() => setActiveTab('agenda')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'agenda' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}>
            <LayoutDashboard className="w-5 h-5" />
            <span className="hidden md:block font-semibold">Agenda</span>
          </button>
          <button onClick={() => setActiveTab('history')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'history' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}>
            <MessageSquare className="w-5 h-5" />
            <span className="hidden md:block font-medium">History</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${activeTab === 'settings' ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50'}`}>
            <Settings className="w-5 h-5" />
            <span className="hidden md:block font-medium">Settings</span>
          </button>
        </nav>

        <div className="mt-auto px-4 w-full">
          <div className="p-4 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
              SA
            </div>
            <div className="hidden md:block overflow-hidden">
              <p className="text-xs font-bold text-slate-800 truncate">Salman Agha</p>
              <p className="text-[10px] text-slate-400 truncate">Professional Plan</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col md:flex-row bg-slate-50/50">
        
        {/* Agenda Section */}
        <section className="flex-[1.2] flex flex-col p-8 overflow-hidden border-r border-slate-100">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold tracking-tight capitalize">{activeTab}</h2>
            <p className="text-slate-500 mt-1 font-medium">
              {activeTab === 'agenda' && `Live Agenda: ${tasks.filter(t => t.status === 'pending').length} tasks`}
              {activeTab === 'history' && `Persistent Memory: ${dbMessages.length} interactions`}
              {activeTab === 'settings' && `System Preferences`}
            </p>
          </div>

          <div className="flex-1 overflow-y-auto pr-4 -mr-4 space-y-4">
            {activeTab === 'agenda' && (
              tasks.filter(t => t.status === 'pending').length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-300 opacity-50"><Sparkles className="w-12 h-12 mb-2"/><p>Clear for now.</p></div>
              ) : (
                tasks.filter(t => t.status === 'pending').map((task) => (
                  <div key={task.id} className="glass group p-5 rounded-[2rem] transition-all hover:translate-x-1 hover:shadow-xl hover:shadow-blue-900/5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <span className={`text-[10px] uppercase tracking-[0.1em] font-bold px-2.5 py-1 rounded-full border mb-2 inline-block ${getCategoryColor(task.category)}`}>{task.category || 'General'}</span>
                        <h3 className="text-lg font-bold text-slate-800">{task.title}</h3>
                        {task.description && <p className="text-sm text-slate-500 mt-2 line-clamp-2 font-medium">{task.description}</p>}
                      </div>
                      <div className="flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleToggleStatus(task)} className="w-10 h-10 rounded-2xl flex items-center justify-center bg-blue-600 text-white shadow-lg shadow-blue-200 hover:scale-110 transition-all"><CheckCircle className="w-5 h-5"/></button>
                        <button onClick={() => handleDeleteManual(task.id)} className="w-10 h-10 rounded-2xl bg-white border border-slate-100 text-slate-300 hover:text-red-500 hover:border-red-100 transition-all flex items-center justify-center"><Trash2 className="w-5 h-5"/></button>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}

            {activeTab === 'history' && (
              dbMessages.map((msg) => (
                <div key={msg.id} className={`p-4 rounded-2xl ${msg.role === 'user' ? 'bg-white ml-8 border border-slate-100 shadow-sm' : 'bg-blue-50 mr-8 border border-blue-100'}`}>
                  <div className="flex items-center space-x-2 mb-2">
                    {msg.role === 'user' ? <User className="w-3 h-3 text-slate-400" /> : <Sparkles className="w-3 h-3 text-blue-500" />}
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{msg.role}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-700">{msg.content}</p>
                </div>
              ))
            )}

            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                  <h3 className="text-xl font-bold mb-4">Voice Cloud</h3>
                  <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                    <div><p className="font-bold">Sync Frequency</p><p className="text-xs text-slate-500">Every 3 seconds</p></div>
                    <div className="w-10 h-5 bg-blue-600 rounded-full relative"><div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm" /></div>
                  </div>
                </div>
                <button onClick={handleResetAll} className="w-full py-4 bg-red-50 text-red-600 font-bold rounded-[2rem] border border-red-100 hover:bg-red-100 transition-all">Clear All Data</button>
              </div>
            )}
          </div>
        </section>

        {/* AI Interaction Split Section */}
        <section className="flex-1 flex flex-col overflow-hidden bg-white md:m-8 md:rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-50">
          
          {/* Top Half: Audio Assistant */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 border-b border-slate-50 relative">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-blue-400/5 blur-[80px] rounded-full" />
            
            <div className="w-full max-w-xs flex flex-col items-center text-center z-10">
              <div className="mb-8 min-h-[100px] flex flex-col items-center justify-center w-full">
                {isListening && <VoiceVisualizer isActive={isListening} color="#2563eb" />}
                {isProcessing && <Activity className="w-8 h-8 text-blue-600 animate-spin" />}
                {!isListening && !isProcessing && <div className="text-slate-300 flex flex-col items-center"><Volume2 className="w-8 h-8 mb-2"/><p className="text-[10px] font-bold tracking-widest uppercase">Assistant Ready</p></div>}
              </div>

              <button
                onClick={toggleListening}
                disabled={isProcessing}
                className={`w-24 h-24 rounded-full shadow-xl flex items-center justify-center transition-all duration-500 relative ${isListening ? 'bg-red-500 scale-110 shadow-red-200' : 'bg-slate-900 hover:bg-blue-600 shadow-slate-200'}`}
              >
                {isListening ? <Mic className="w-10 h-10 text-white animate-pulse" /> : <MicOff className="w-10 h-10 text-white" />}
              </button>
            </div>
          </div>

          {/* Bottom Half: Live Conversation Window */}
          <div className="flex-1 flex flex-col bg-slate-50/30 p-6 overflow-hidden">
            <div className="flex items-center space-x-2 mb-4 px-2">
              <MessageSquare className="w-4 h-4 text-slate-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Live Transcript</span>
            </div>
            
            <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 px-2 custom-scrollbar">
              {dbMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium shadow-sm ${msg.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 animate-pulse flex space-x-1">
                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" />
                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
