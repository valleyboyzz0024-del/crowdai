import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, Loader2, Copy, Check, Trash2, Paperclip, X, FileText, Image as ImageIcon, Film, History, Clock, Zap, Download, Mic, Volume2, VolumeX, Menu, Settings, Search, Filter, Calendar, BarChart3, LogOut, User, UserCircle, Edit, Shield } from 'lucide-react';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import UsageBar from './components/UsageBar';
import TierUpgrade from './components/TierUpgrade';
import AdminPanel from './components/AdminPanel';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const AI_CONFIGS = {
  claude: {
    name: 'Claude 3.5 Sonnet',
    color: 'bg-amber-100 border-amber-300',
    icon: '🤖',
    textColor: 'text-amber-900',
    description: 'Smartest all-around AI',
    specialty: 'Complex reasoning, code, & image generation',
    contextWindow: '200K tokens'
  },
  chatgpt: {
    name: 'ChatGPT',
    color: 'bg-green-100 border-green-300',
    icon: '🟢',
    textColor: 'text-green-900',
    description: 'Versatile & creative',
    specialty: 'Natural conversation & problem solving',
    contextWindow: '128K tokens'
  },
  gemini: {
    name: 'Gemini',
    color: 'bg-blue-100 border-blue-300',
    icon: '✨',
    textColor: 'text-blue-900',
    description: 'Largest context window',
    specialty: 'Analyzing huge documents & files',
    contextWindow: '1M tokens'
  },
  llama: {
    name: 'Mixtral 8x7B',
    color: 'bg-purple-100 border-purple-300',
    icon: '🦙',
    textColor: 'text-purple-900',
    description: 'Fast & efficient',
    specialty: 'Quick responses & coding',
    contextWindow: '32K tokens'
  },
  deepseek: {
    name: 'DeepSeek V3',
    color: 'bg-indigo-100 border-indigo-300',
    icon: '🧠',
    textColor: 'text-indigo-900',
    description: 'Deep reasoning specialist',
    specialty: 'Complex problem analysis',
    contextWindow: '64K tokens'
  },
  grok: {
    name: 'Grok-4',
    color: 'bg-pink-100 border-pink-300',
    icon: '⚡',
    textColor: 'text-pink-900',
    description: 'Real-time knowledge',
    specialty: 'Current events & quick responses',
    contextWindow: '128K tokens'
  },
  groq: {
    name: 'Llama 3.3 70B',
    color: 'bg-teal-100 border-teal-300',
    icon: '🚀',
    textColor: 'text-teal-900',
    description: 'Lightning fast via Groq',
    specialty: 'Ultra-fast inference with Groq LPU',
    contextWindow: '128K tokens'
  }
};

export default function AIGroupChat() {
  const { user, accessToken, loading: authLoading, logout, refreshAccessToken, updateProfile } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [profileUpdateError, setProfileUpdateError] = useState('');
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState('');
  const [updatingProfile, setUpdatingProfile] = useState(false);
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentlyTyping, setCurrentlyTyping] = useState(null);
  const [autoContinue, setAutoContinue] = useState(false);
  const [conversationRounds, setConversationRounds] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [enabledAIs, setEnabledAIs] = useState({
    claude: true,
    chatgpt: true,
    gemini: true,
    llama: true,
    deepseek: true,
    grok: true,
    groq: true
  });
  const [aiHealth, setAiHealth] = useState({
    claude: null,
    chatgpt: null,
    gemini: null,
    llama: null,
    deepseek: null,
    grok: null,
    groq: null
  });
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [includePastChats, setIncludePastChats] = useState(true);
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const [streamingMessages, setStreamingMessages] = useState({});
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('chats'); // 'chats', 'settings', 'controls', 'profile'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({
    ai: 'all',
    dateRange: 'all',
    hasFiles: false
  });
  const [showSearchFilters, setShowSearchFilters] = useState(false);
  const [aiPersonas, setAiPersonas] = useState({
    claude: { temperature: 0.7, systemPrompt: '', preset: 'default' },
    chatgpt: { temperature: 0.7, systemPrompt: '', preset: 'default' },
    gemini: { temperature: 0.7, systemPrompt: '', preset: 'default' },
    llama: { temperature: 0.7, systemPrompt: '', preset: 'default' },
    deepseek: { temperature: 0.7, systemPrompt: '', preset: 'default' },
    grok: { temperature: 0.7, systemPrompt: '', preset: 'default' },
    groq: { temperature: 0.7, systemPrompt: '', preset: 'default' }
  });
  const [showPersonaEditor, setShowPersonaEditor] = useState(null);
  const [codeExecutions, setCodeExecutions] = useState({}); // Store execution results by message ID
  const [executingCode, setExecutingCode] = useState(null); // Track which code block is executing
  
  // Conversation branching
  const [branches, setBranches] = useState({ main: { messages: [], createdAt: Date.now() } });
  const [currentBranch, setCurrentBranch] = useState('main');
  const [showBranchManager, setShowBranchManager] = useState(false);
  const [branchComparison, setBranchComparison] = useState(null);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Smart follow-ups
  const [suggestedFollowUps, setSuggestedFollowUps] = useState([]);
  const [generatingFollowUps, setGeneratingFollowUps] = useState(false);
  
  // Advanced analytics (admin only) - Load from localStorage immediately
  const [analytics, setAnalytics] = useState(() => {
    try {
      const savedAnalytics = localStorage.getItem('crowdai_analytics');
      if (savedAnalytics) {
        const parsed = JSON.parse(savedAnalytics);
        console.log('📊 Loaded persistent analytics from localStorage on init');
        return parsed;
      }
    } catch (e) {
      console.error('Failed to load analytics on init:', e);
    }
    return {
      responseTimes: {},
      tokenUsage: {},
      costs: {},
      totalQueries: 0
    };
  });
  const [showAnalytics, setShowAnalytics] = useState(false);
  const isAdmin = user?.isAdmin || false; // Check if user is admin
  
  const fileInputRef = useRef(null);
  const exportMenuRef = useRef(null);
  const recognitionRef = useRef(null);

  // Persona presets
  const PERSONA_PRESETS = {
    default: {
      name: 'Default',
      icon: '🤖',
      temperature: 0.7,
      systemPrompt: '',
      description: 'Balanced and versatile'
    },
    teacher: {
      name: 'Teacher',
      icon: '👨‍🏫',
      temperature: 0.6,
      systemPrompt: 'You are a patient and encouraging teacher. Break down complex topics into simple explanations. Use analogies and examples. Always check for understanding and provide encouragement.',
      description: 'Patient, educational, step-by-step'
    },
    coder: {
      name: 'Expert Coder',
      icon: '💻',
      temperature: 0.3,
      systemPrompt: 'You are an expert software engineer. Provide clean, efficient, well-documented code. Follow best practices and design patterns. Explain your technical decisions. Focus on code quality and maintainability.',
      description: 'Precise, technical, best practices'
    },
    analyst: {
      name: 'Data Analyst',
      icon: '📊',
      temperature: 0.5,
      systemPrompt: 'You are a data analyst. Think analytically and systematically. Present insights with data and evidence. Break down complex problems into components. Be objective and detail-oriented.',
      description: 'Analytical, data-driven, systematic'
    },
    creative: {
      name: 'Creative',
      icon: '🎨',
      temperature: 0.9,
      systemPrompt: 'You are highly creative and imaginative. Think outside the box. Provide unique perspectives and innovative solutions. Use vivid language and engaging storytelling.',
      description: 'Imaginative, innovative, expressive'
    },
    concise: {
      name: 'Concise',
      icon: '⚡',
      temperature: 0.4,
      systemPrompt: 'Be extremely concise and to-the-point. No fluff or unnecessary explanations. Provide direct answers with maximum information density. Use bullet points when appropriate.',
      description: 'Brief, direct, efficient'
    },
    friendly: {
      name: 'Friendly',
      icon: '😊',
      temperature: 0.8,
      systemPrompt: 'You are warm, friendly, and conversational. Use a casual, approachable tone. Show empathy and understanding. Make the user feel comfortable and supported.',
      description: 'Warm, empathetic, conversational'
    }
  };

  // Check for payment success and refresh user data
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('payment');
    const tier = urlParams.get('tier');
    
    if (paymentStatus === 'success' && tier && user) {
      // Payment was successful, refresh user data
      console.log('💳 Payment successful, refreshing user data...');
      
      // Wait a bit for webhook to process, then refresh
      setTimeout(async () => {
        await refreshAccessToken();
        alert(`🎉 Welcome to ${tier.charAt(0).toUpperCase() + tier.slice(1)} tier! Your account has been upgraded.`);
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }, 2000);
    } else if (paymentStatus === 'cancelled') {
      alert('Payment was cancelled. You can try again anytime.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user]);

  // Load chat history from MongoDB when user is authenticated
  useEffect(() => {
    const loadChatsFromMongoDB = async () => {
      if (user && accessToken) {
        try {
          const response = await fetch('/api/chats', {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            const formattedChats = data.chats.map(chat => ({
              id: chat._id,
              title: chat.title,
              messages: chat.messages,
              timestamp: new Date(chat.createdAt).getTime(),
              lastModified: new Date(chat.updatedAt).toLocaleString()
            }));
            setChatHistory(formattedChats);
            localStorage.setItem('crowdai_chat_history', JSON.stringify(formattedChats));
            console.log('📥 Loaded', formattedChats.length, 'chats from MongoDB');
          }
        } catch (error) {
          console.error('Failed to load chats from MongoDB:', error);
          // Fallback to localStorage
          const savedHistory = localStorage.getItem('crowdai_chat_history');
          if (savedHistory) {
            try {
              setChatHistory(JSON.parse(savedHistory));
            } catch (e) {
              console.error('Failed to load chat history from localStorage:', e);
            }
          }
        }
      } else {
        // Not authenticated, load from localStorage only
        const savedHistory = localStorage.getItem('crowdai_chat_history');
        if (savedHistory) {
          try {
            setChatHistory(JSON.parse(savedHistory));
          } catch (e) {
            console.error('Failed to load chat history:', e);
          }
        }
      }
    };

    loadChatsFromMongoDB();
  }, [user, accessToken]);

  // Load personas from localStorage on mount
  useEffect(() => {
    const savedPersonas = localStorage.getItem('crowdai_personas');
    if (savedPersonas) {
      try {
        const loaded = JSON.parse(savedPersonas);
        // CRITICAL FIX: Merge with defaults to ensure all AIs (including groq) are present
        // This prevents crashes when localStorage has old data without new AIs
        setAiPersonas(prev => ({
          ...prev,  // Keep defaults for any missing AIs
          ...loaded  // Overwrite with saved values
        }));
      } catch (e) {
        console.error('Failed to load personas:', e);
      }
    }
  }, []);

  // Save personas to localStorage when they change
  useEffect(() => {
    localStorage.setItem('crowdai_personas', JSON.stringify(aiPersonas));
  }, [aiPersonas]);

  // Save analytics to localStorage when they change
  useEffect(() => {
    localStorage.setItem('crowdai_analytics', JSON.stringify(analytics));
  }, [analytics]);

  // Save current chat to history whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        saveCurrentChat();
      }, 2000); // Debounce saves by 2 seconds
      return () => clearTimeout(timer);
    }
  }, [messages]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setShowExportMenu(false);
      }
    };

    if (showExportMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showExportMenu]);

  // Initialize speech recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'en-US';

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + (prev ? ' ' : '') + transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Speak AI response with different voices
  const speakText = (text, aiId) => {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;

    // Stop any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Assign different voices to different AIs
    const voiceSettings = {
      claude: { rate: 1.0, pitch: 1.0, voiceIndex: 0 },
      chatgpt: { rate: 1.1, pitch: 1.1, voiceIndex: 1 },
      gemini: { rate: 0.9, pitch: 0.9, voiceIndex: 2 },
      llama: { rate: 1.0, pitch: 0.8, voiceIndex: 3 },
      deepseek: { rate: 0.95, pitch: 1.2, voiceIndex: 4 },
      grok: { rate: 1.15, pitch: 1.05, voiceIndex: 5 }
    };

    const settings = voiceSettings[aiId] || { rate: 1.0, pitch: 1.0, voiceIndex: 0 };
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;

    // Get available voices and assign
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      utterance.voice = voices[settings.voiceIndex % voices.length];
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const stopSpeaking = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const saveCurrentChat = async () => {
    if (messages.length === 0) return;

    const chatId = currentChatId || Date.now().toString();
    const firstUserMessage = messages.find(m => m.sender === 'user')?.text || 'New Conversation';
    const title = firstUserMessage.substring(0, 50) + (firstUserMessage.length > 50 ? '...' : '');

    const chatData = {
      id: chatId,
      title: title,
      messages: messages,
      timestamp: Date.now(),
      lastModified: new Date().toLocaleString()
    };

    // Save to localStorage (cache)
    setChatHistory(prev => {
      const filtered = prev.filter(chat => chat.id !== chatId);
      const updated = [chatData, ...filtered].slice(0, 20);
      localStorage.setItem('crowdai_chat_history', JSON.stringify(updated));
      return updated;
    });

    // Save to MongoDB if user is authenticated
    if (user && accessToken) {
      try {
        const participatingAIs = [...new Set(messages.filter(m => m.sender !== 'user').map(m => m.sender))];
        const fileAttachments = messages
          .filter(m => m.files && m.files.length > 0)
          .flatMap(m => m.files.map(f => ({ name: f.name, size: f.size, type: f.type })));

        await fetch('/api/chats', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({
            chatId: currentChatId,
            title,
            messages: messages.map(m => ({
              sender: m.sender,
              text: m.text,
              timestamp: m.timestamp
            })),
            participatingAIs,
            fileAttachments
          })
        });
        console.log('💾 Chat synced to MongoDB');
      } catch (error) {
        console.error('Failed to sync chat to MongoDB:', error);
      }
    }

    if (!currentChatId) {
      setCurrentChatId(chatId);
    }
  };

  const loadChat = (chatId) => {
    const chat = chatHistory.find(c => c.id === chatId);
    if (chat) {
      setMessages(chat.messages);
      setCurrentChatId(chatId);
      setShowHistory(false);
    }
  };

  const deleteChat = (chatId, e) => {
    e.stopPropagation();
    if (window.confirm('Delete this conversation?')) {
      setChatHistory(prev => {
        const updated = prev.filter(chat => chat.id !== chatId);
        localStorage.setItem('crowdai_chat_history', JSON.stringify(updated));
        return updated;
      });
      if (currentChatId === chatId) {
        setMessages([]);
        setCurrentChatId(null);
      }
    }
  };

  const startNewChat = () => {
    if (messages.length > 0) {
      saveCurrentChat();
    }
    setMessages([]);
    setCurrentChatId(null);
    setShowHistory(false);
    setSearchQuery('');
  };

  // Apply persona preset
  const applyPersonaPreset = (aiId, presetKey) => {
    const preset = PERSONA_PRESETS[presetKey];
    setAiPersonas(prev => ({
      ...prev,
      [aiId]: {
        temperature: preset.temperature,
        systemPrompt: preset.systemPrompt,
        preset: presetKey
      }
    }));
  };

  // Update persona settings
  const updatePersona = (aiId, updates) => {
    setAiPersonas(prev => ({
      ...prev,
      [aiId]: {
        ...prev[aiId],
        ...updates,
        preset: 'custom' // Mark as custom when manually edited
      }
    }));
  };

  // Search and filter function
  const searchChats = () => {
    if (!searchQuery.trim() && searchFilters.ai === 'all' && searchFilters.dateRange === 'all' && !searchFilters.hasFiles) {
      return chatHistory;
    }

    return chatHistory.filter(chat => {
      // Text search across title and messages
      const searchLower = searchQuery.toLowerCase();
      const titleMatch = chat.title.toLowerCase().includes(searchLower);
      const messageMatch = chat.messages.some(msg =>
        msg.text.toLowerCase().includes(searchLower)
      );
      
      if (searchQuery.trim() && !titleMatch && !messageMatch) {
        return false;
      }

      // AI filter
      if (searchFilters.ai !== 'all') {
        const hasAI = chat.messages.some(msg => msg.sender === searchFilters.ai);
        if (!hasAI) return false;
      }

      // Date filter
      if (searchFilters.dateRange !== 'all') {
        const chatDate = new Date(chat.timestamp);
        const now = new Date();
        const dayMs = 24 * 60 * 60 * 1000;
        
        switch (searchFilters.dateRange) {
          case 'today':
            if (now - chatDate > dayMs) return false;
            break;
          case 'week':
            if (now - chatDate > 7 * dayMs) return false;
            break;
          case 'month':
            if (now - chatDate > 30 * dayMs) return false;
            break;
        }
      }

      // Files filter
      if (searchFilters.hasFiles) {
        const hasFiles = chat.messages.some(msg => msg.files && msg.files.length > 0);
        if (!hasFiles) return false;
      }

      return true;
    });
  };

  // Highlight matching text
  const highlightText = (text, query) => {
    if (!query.trim()) return text;
    
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase()
        ? `<mark class="bg-yellow-400/30 text-yellow-200 px-1 rounded">${part}</mark>`
        : part
    ).join('');
  };

  // Timeout wrapper for AI calls - prevents hanging on Vercel
  const callWithTimeout = async (aiFunction, timeout = 12000, aiName = 'AI') => {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${aiName} timed out after ${timeout/1000}s`)), timeout)
    );
    
    try {
      const result = await Promise.race([aiFunction(), timeoutPromise]);
      return result;
    } catch (error) {
      console.error(`⏱️ [TIMEOUT] ${aiName}:`, error.message);
      throw error;
    }
  };

  const callClaude = async (conversationHistory, images = [], inputText = '') => {
    const startTime = Date.now();
    const persona = aiPersonas.claude;
    const response = await fetch('/api/claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
      },
      body: JSON.stringify({
        messages: conversationHistory,
        images: images,
        temperature: persona.temperature,
        system: persona.systemPrompt
      })
    });
    const data = await response.json();
    if (data.error) {
      const errorMsg = typeof data.error === 'object' ? JSON.stringify(data.error, null, 2) : data.error;
      throw new Error(errorMsg);
    }
    if (!data.content || !data.content[0]) {
      const detailedError = `Claude API Error: ${JSON.stringify(data, null, 2)}`;
      throw new Error(detailedError);
    }
    const responseText = data.content[0].text;
    const endTime = Date.now();
    trackResponse('claude', inputText || conversationHistory[conversationHistory.length - 1]?.content || '', responseText, startTime, endTime);
    return responseText;
  };

  const callChatGPT = async (conversationHistory, images = [], messageId = null, inputText = '') => {
    const startTime = Date.now();
    const persona = aiPersonas.chatgpt;
    if (streamingEnabled && !images.length) {
      // Use streaming
      const response = await fetch('/api/chatgpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        },
        body: JSON.stringify({
          messages: conversationHistory,
          images: images,
          stream: true,
          temperature: persona.temperature
        })
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('ChatGPT is experiencing high demand. The system will automatically retry. Please wait a moment...');
        }
        throw new Error('Streaming request failed');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              
              if (content) {
                fullText += content;
                if (messageId) {
                  setStreamingMessages(prev => ({
                    ...prev,
                    [messageId]: fullText
                  }));
                }
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }

      // Clean up streaming state
      if (messageId) {
        setStreamingMessages(prev => {
          const newState = { ...prev };
          delete newState[messageId];
          return newState;
        });
      }

      const endTime = Date.now();
      trackResponse('chatgpt', inputText || conversationHistory[conversationHistory.length - 1]?.content || '', fullText, startTime, endTime);
      return fullText;
    } else {
      // Use non-streaming
      const response = await fetch('/api/chatgpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        },
        body: JSON.stringify({
          messages: conversationHistory,
          images: images,
          stream: false,
          temperature: persona.temperature
        })
      });
      const data = await response.json();
      if (response.status === 429) {
        throw new Error('ChatGPT is experiencing high demand. The system will automatically retry. Please wait a moment...');
      }
      if (data.error || !data.choices) {
        const errorMsg = data.error?.message || data.error || 'Invalid response from ChatGPT API';
        if (errorMsg.includes('rate') || errorMsg.includes('429')) {
          throw new Error('ChatGPT is experiencing high demand. The system will automatically retry. Please wait a moment...');
        }
        throw new Error(errorMsg);
      }
      const responseText = data.choices[0].message.content;
      const endTime = Date.now();
      trackResponse('chatgpt', inputText || conversationHistory[conversationHistory.length - 1]?.content || '', responseText, startTime, endTime);
      return responseText;
    }
  };

  const callGemini = async (conversationHistory, inputText = '') => {
    console.log(`🔵 [GEMINI CALL] inputText: "${inputText?.substring(0, 50)}..."`);
    const startTime = Date.now();
    const formattedHistory = conversationHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await fetch('/api/gemini', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
      },
      body: JSON.stringify({
        contents: formattedHistory
      })
    });
    const data = await response.json();
    if (data.error) {
      const errorMsg = typeof data.error === 'object' ? JSON.stringify(data.error, null, 2) : data.error;
      throw new Error(errorMsg);
    }
    if (!data.candidates || !data.candidates[0]) {
      const detailedError = `Gemini API Error: ${JSON.stringify(data, null, 2)}`;
      throw new Error(detailedError);
    }
    const responseText = data.candidates[0].content.parts[0].text;
    const endTime = Date.now();
    trackResponse('gemini', inputText || conversationHistory[conversationHistory.length - 1]?.parts?.[0]?.text || '', responseText, startTime, endTime);
    return responseText;
  };

  const callLlama = async (conversationHistory, inputText = '') => {
    console.log(`🦙 [LLAMA CALL] inputText: "${inputText?.substring(0, 50)}..."`);
    const startTime = Date.now();
    const response = await fetch('/api/llama', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
      },
      body: JSON.stringify({
        messages: conversationHistory
      })
    });
    const data = await response.json();
    if (data.error) {
      const errorMsg = typeof data.error === 'object' ? JSON.stringify(data.error, null, 2) : data.error;
      throw new Error(errorMsg);
    }
    if (!data.choices || !data.choices[0]) {
      const detailedError = `Llama API Error: ${JSON.stringify(data, null, 2)}`;
      throw new Error(detailedError);
    }
    const responseText = data.choices[0].message.content;
    const endTime = Date.now();
    trackResponse('llama', inputText || conversationHistory[conversationHistory.length - 1]?.content || '', responseText, startTime, endTime);
    return responseText;
  };

  const callDeepSeek = async (conversationHistory, inputText = '') => {
    console.log(`🧠 [DEEPSEEK CALL] inputText: "${inputText?.substring(0, 50)}..."`);
    const startTime = Date.now();
    const response = await fetch('/api/o1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
      },
      body: JSON.stringify({
        messages: conversationHistory
      })
    });
    const data = await response.json();
    if (data.error) {
      const errorMsg = typeof data.error === 'object' ? JSON.stringify(data.error, null, 2) : data.error;
      throw new Error(errorMsg);
    }
    if (!data.choices || !data.choices[0]) {
      const detailedError = `DeepSeek V3 API Error: ${JSON.stringify(data, null, 2)}`;
      throw new Error(detailedError);
    }
    const responseText = data.choices[0].message.content;
    const endTime = Date.now();
    trackResponse('deepseek', inputText || conversationHistory[conversationHistory.length - 1]?.content || '', responseText, startTime, endTime);
    return responseText;
  };

  const callGrok = async (conversationHistory, inputText = '') => {
      console.log(`⚡ [GROK CALL] inputText: "${inputText?.substring(0, 50)}..."`);
      const startTime = Date.now();
      const response = await fetch('/api/grok', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        },
        body: JSON.stringify({
          messages: conversationHistory
        })
      });
      const data = await response.json();
      if (data.error) {
        const errorMsg = typeof data.error === 'object' ? JSON.stringify(data.error, null, 2) : data.error;
        throw new Error(errorMsg);
      }
      if (!data.choices || !data.choices[0]) {
        const detailedError = `Grok-4 API Error: ${JSON.stringify(data, null, 2)}`;
        throw new Error(detailedError);
      }
      const responseText = data.choices[0].message.content;
      const endTime = Date.now();
      trackResponse('grok', inputText || conversationHistory[conversationHistory.length - 1]?.content || '', responseText, startTime, endTime);
      return responseText;
    };
  
    const callGroq = async (conversationHistory, inputText = '') => {
      console.log(`🚀 [GROQ CALL] inputText: "${inputText?.substring(0, 50)}..."`);
      const startTime = Date.now();
      const response = await fetch('/api/groq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        },
        body: JSON.stringify({
          messages: conversationHistory
        })
      });
      const data = await response.json();
      if (data.error) {
        const errorMsg = typeof data.error === 'object' ? JSON.stringify(data.error, null, 2) : data.error;
        throw new Error(errorMsg);
      }
      if (!data.choices || !data.choices[0]) {
        const detailedError = `Groq Llama API Error: ${JSON.stringify(data, null, 2)}`;
        throw new Error(detailedError);
      }
      const responseText = data.choices[0].message.content;
      const endTime = Date.now();
      trackResponse('groq', inputText || conversationHistory[conversationHistory.length - 1]?.content || '', responseText, startTime, endTime);
      return responseText;
    };

  const checkAIHealth = async (aiId) => {
    const aiCalls = {
      'claude': callClaude,
      'chatgpt': callChatGPT,
      'gemini': callGemini,
      'llama': callLlama,
      'deepseek': callDeepSeek,
      'grok': callGrok,
      'groq': callGroq
    };

    try {
      const testHistory = [
        { role: 'user', content: 'You are testing connection. Respond with only the word "OK".' },
        { role: 'assistant', content: 'I understand.' },
        { role: 'user', content: 'Test' }
      ];
      
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 5000)
      );
      
      await Promise.race([aiCalls[aiId](testHistory), timeoutPromise]);
      return true;
    } catch (error) {
      return false;
    }
  };

  const checkAllHealth = async () => {
    setCheckingHealth(true);
    const results = {};
    
    for (const aiId of Object.keys(enabledAIs)) {
      const isHealthy = await checkAIHealth(aiId);
      results[aiId] = isHealthy;
    }
    
    setAiHealth(results);
    setCheckingHealth(false);
  };

  const buildConversationHistory = (newUserMessage, aiIdentity = null) => {
    const history = [];
    
    // Add system context about the group chat with AI identity
    let systemContext = '';
    if (aiIdentity) {
      const aiName = AI_CONFIGS[aiIdentity].name;
      systemContext = `You are ${aiName}, participating in a group chat with other AI assistants: Claude Sonnet 4.5 (by Anthropic), ChatGPT GPT-4o (by OpenAI), Gemini 2.5 Flash (by Google), Mixtral 8x7B (by Mistral AI), DeepSeek V3 (by DeepSeek), Grok-4 (by xAI), and Llama 3.3 70B (via Groq/Together).

YOUR IDENTITY: You are ${aiName}. When users address you by name, respond as yourself.

IMPORTANT: You will see messages from the other AIs marked with [AIName]. These are THEIR responses, not yours. When it's your turn to respond:
- ONLY provide YOUR OWN response as ${aiName}
- DO NOT repeat or include what the other AIs said
- You can reference or respond to what they said, but don't copy their messages
- Keep your response focused and concise

The conversation history below shows what everyone has said so far, including the other AIs' responses.`;
    } else {
      systemContext = `You are participating in a group chat with six other AI assistants: Claude Sonnet 4.5 (by Anthropic), ChatGPT GPT-4o (by OpenAI), Gemini 2.5 Flash (by Google), Mixtral 8x7B (by Mistral AI), DeepSeek V3 (by DeepSeek), Grok-4 (by xAI), and Llama 3.3 70B (via Groq/Together).

IMPORTANT: You will see messages from the other AIs marked with [AIName]. These are THEIR responses, not yours. When it's your turn to respond:
- ONLY provide YOUR OWN response
- DO NOT repeat or include what the other AIs said
- You can reference or respond to what they said, but don't copy their messages
- Keep your response focused and concise

The conversation history below shows what everyone has said so far, including the other AIs' responses.`;
    }

    // Add context from previous chats if enabled
    if (includePastChats && chatHistory.length > 0) {
      systemContext += '\n\n=== PREVIOUS CONVERSATIONS (for context) ===\n';
      systemContext += 'You have access to the user\'s previous conversations. Use this information if relevant to the current discussion:\n\n';
      
      // Include last 3 conversations (excluding current one) as condensed context
      const relevantChats = chatHistory
        .filter(chat => chat.id !== currentChatId)
        .slice(0, 3);
      
      relevantChats.forEach((chat, idx) => {
        systemContext += `--- Past Conversation ${idx + 1}: "${chat.title}" (${chat.lastModified}) ---\n`;
        // Include only user messages and first AI response for context efficiency
        const contextMessages = chat.messages.slice(0, 10); // First 10 messages
        contextMessages.forEach(msg => {
          if (msg.sender === 'user') {
            systemContext += `User: ${msg.text.substring(0, 200)}\n`;
          } else {
            const aiName = AI_CONFIGS[msg.sender]?.name || msg.sender;
            systemContext += `${aiName}: ${msg.text.substring(0, 150)}\n`;
          }
        });
        systemContext += '\n';
      });
      
      systemContext += '=== END OF PREVIOUS CONVERSATIONS ===\n';
      systemContext += 'You can reference information from these past conversations if the user asks about them or if they\'re relevant to the current topic.\n\n';
    }
    
    history.push({ role: 'user', content: systemContext });
    history.push({ role: 'assistant', content: aiIdentity ? `I understand. I am ${AI_CONFIGS[aiIdentity].name} and will respond as myself.` : 'I understand. I will only provide my own response without repeating what the other AIs have said.' });
    
    for (const msg of messages) {
      if (msg.sender === 'user') {
        // Use textWithFiles if available (includes file contents), otherwise use text
        const content = msg.textWithFiles || msg.text;
        history.push({ role: 'user', content: content });
      } else {
        // CRITICAL FIX: Check if previous message was also from an AI
        // Some APIs (Together AI, Groq) require strict role alternation
        const prevMsg = history[history.length - 1];
        if (prevMsg && prevMsg.role === 'assistant') {
          // Insert a brief user acknowledgment to maintain alternation
          history.push({ role: 'user', content: 'Continue to the next AI response.' });
        }
        
        const aiName = AI_CONFIGS[msg.sender].name;
        history.push({
          role: 'assistant',
          content: `[${aiName}]: ${msg.text}`
        });
      }
    }
    
    history.push({ role: 'user', content: newUserMessage });
    return history;
  };

  const continueConversation = async (currentRound) => {
    if (currentRound >= 5) {
      setAutoContinue(false);
      setLoading(false);
      alert('Reached 5 rounds of conversation. Auto-continue stopped.');
      return;
    }

    setLoading(true);
    const nextRound = currentRound + 1;
    setConversationRounds(nextRound);

    try {
      let conversationHistory = buildConversationHistory('Continue the conversation naturally. Build on what was just discussed.');
      let messageId = Date.now() + 1;
      
      // Define AI call order
      const aiOrder = ['claude', 'chatgpt', 'gemini', 'llama', 'deepseek', 'grok', 'groq'];
      const aiCallFunctions = {
        'claude': callClaude,
        'chatgpt': callChatGPT,
        'gemini': callGemini,
        'llama': callLlama,
        'deepseek': callDeepSeek,
        'grok': callGrok,
        'groq': callGroq
      };
      
      // Only call enabled AIs
      for (const aiId of aiOrder) {
        if (!enabledAIs[aiId]) {
          console.log(`⏭️ Auto-continue skipping disabled AI: ${aiId}`);
          continue;
        }
        
        setCurrentlyTyping(aiId);
        const response = await aiCallFunctions[aiId]([...conversationHistory]).catch(e => `Error: ${e.message}`);
        
        const message = {
          id: messageId++,
          sender: aiId,
          text: response,
          timestamp: new Date()
        };
        
        setMessages(prev => [...prev, message]);
        setCurrentlyTyping(null);
        
        if (!autoContinue) {
          setLoading(false);
          return;
        }
        
        // Add this AI's response to history for next AI
        conversationHistory.push({
          role: 'user',
          content: `[${AI_CONFIGS[aiId].name} just responded]: ${response}\n\nContinue the discussion.`
        });
      }
      
    } catch (error) {
      console.error('Error:', error);
      setAutoContinue(false);
    } finally {
      setLoading(false);
    }
    
    // Continue the loop if auto-continue is still on
    if (autoContinue && nextRound < 5) {
      setTimeout(() => continueConversation(nextRound), 1000);
    }
  };

  // Detect which AI is being addressed
  const detectAddressedAI = (message) => {
    const lowerMessage = message.toLowerCase();
    const aiNames = {
      'claude': 'claude',
      'chatgpt': 'chatgpt',
      'gpt': 'chatgpt',
      'gemini': 'gemini',
      'llama': 'llama',
      'lama': 'llama',  // Added: Support "lama" (one L) for Llama
      'deepseek': 'deepseek',
      'grok': 'grok'
    };
    
    for (const [keyword, aiId] of Object.entries(aiNames)) {
      if (lowerMessage.includes(keyword)) {
        return aiId;
      }
    }
    return null; // No specific AI addressed
  };

  const handleSend = async () => {
    if (!input.trim() && uploadedFiles.length === 0) return;

    // Process Supabase files first (download and extract if needed)
    let processedFiles = [];
    for (const file of uploadedFiles) {
      if (file.isSupabaseUpload && file.supabaseUrl) {
        try {
          console.log(`📥 Processing Supabase file: ${file.fileName}`);
          const response = await fetch('/api/process-supabase-file', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
            },
            body: JSON.stringify({ fileName: file.fileName })
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Server error: ${response.status}`);
          }
          
          const result = await response.json();
          
          if (!result.success) {
            throw new Error(result.error || 'Processing failed');
          }
          
          if (result.type === 'zip') {
            // Add extracted files
            if (!result.files || result.files.length === 0) {
              throw new Error('ZIP file extracted but no files found');
            }
            
            console.log(`✅ Extracted ${result.files.length} files from ZIP`);
            processedFiles.push({
              ...file,
              extractedFiles: result.files,
              content: `[ZIP: ${file.name} - ${result.filesCount} files extracted from Supabase]`
            });
          } else {
            // Single file
            if (!result.content) {
              throw new Error('File downloaded but content is empty');
            }
            
            processedFiles.push({
              ...file,
              content: result.content
            });
          }
        } catch (error) {
          console.error('❌ Error processing Supabase file:', error);
          alert(`Failed to process ${file.name}: ${error.message}\n\nPlease try uploading a smaller file or breaking it into multiple uploads.`);
          setLoading(false);
          return; // Stop sending if file processing fails
        }
      } else {
        processedFiles.push(file);
      }
    }

    // Separate images from text/code files
    const imageFiles = processedFiles.filter(f => f.type.startsWith('image/'));
    const textFiles = processedFiles.filter(f => !f.type.startsWith('image/') && !f.type.startsWith('video/'));
    const videoFiles = processedFiles.filter(f => f.type.startsWith('video/'));

    // Build message with text/code files only
    let messageText = input;
    
    if (textFiles.length > 0) {
      messageText += '\n\n=== ATTACHED FILES ===\n';
      for (const file of textFiles) {
        if (file.extractedFiles) {
          // ZIP file with extracted contents
          messageText += `\n[ZIP: ${file.name}]\n`;
          for (const extracted of file.extractedFiles) {
            messageText += `\n--- ${extracted.name} ---\n${extracted.content.substring(0, 10000)}\n`; // Limit to 10k chars per file
          }
        } else if (file.content && !file.content.startsWith('[')) {
          messageText += `\n--- ${file.name} ---\n${file.content}\n`;
        } else {
          messageText += `\n${file.content}\n`;
        }
      }
    }
    
    if (videoFiles.length > 0) {
      messageText += '\n\n=== VIDEO FILES ===\n';
      for (const file of videoFiles) {
        messageText += `\n[Video: ${file.name}]\n`;
      }
    }

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: input,
      textWithFiles: messageText, // Store enriched text with file contents for conversation history
      files: processedFiles, // Use processed files (includes Supabase downloads)
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = messageText; // Use enriched message for AI (text/code only)
    const hasOnlyImages = imageFiles.length > 0 && textFiles.length === 0 && !input.trim();
    setInput('');
    setUploadedFiles([]); // Clear files after sending
    setLoading(true);
    setConversationRounds(0);

    try {
      // Detect which AI is being addressed
      const addressedAI = detectAddressedAI(currentInput);
      
      if (addressedAI) {
        // Natural conversation mode: only addressed AI responds initially
        const conversationHistory = buildConversationHistory(currentInput, addressedAI);
        
        // Check if this AI can handle images
        const canHandleImages = addressedAI === 'claude' || addressedAI === 'chatgpt';
        
        // Skip if message has only images and AI can't handle them
        if (hasOnlyImages && !canHandleImages) {
          setLoading(false);
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            sender: addressedAI,
            text: `I cannot view images. Please include text or code in your message, or address Claude or ChatGPT who have vision capabilities.`,
            timestamp: new Date()
          }]);
          return;
        }
        
        // Extract images for vision-capable AIs
        const images = canHandleImages && imageFiles.length > 0
          ? imageFiles.filter(file => file.content).map(file => file.content)
          : [];
        
        // Get primary response
        const aiCalls = {
          'claude': (hist, msgId, inputTxt) => callWithTimeout(() => callClaude(hist, images, inputTxt), 12000, 'Claude'),
          'chatgpt': (hist, msgId, inputTxt) => callWithTimeout(() => callChatGPT(hist, images, msgId, inputTxt), 15000, 'ChatGPT'),
          'gemini': (hist, msgId, inputTxt) => callWithTimeout(() => callGemini(hist, inputTxt), 10000, 'Gemini'),
          'llama': (hist, msgId, inputTxt) => callWithTimeout(() => callLlama(hist, inputTxt), 10000, 'Llama'),
          'deepseek': (hist, msgId, inputTxt) => callWithTimeout(() => callDeepSeek(hist, inputTxt), 10000, 'DeepSeek'),
          'grok': (hist, msgId, inputTxt) => callWithTimeout(() => callGrok(hist, inputTxt), 10000, 'Grok'),
          'groq': (hist, msgId, inputTxt) => callWithTimeout(() => callGroq(hist, inputTxt), 8000, 'Groq')
        };
        
        const messageId = Date.now() + 1;
        setCurrentlyTyping(addressedAI);
        
        // Track start time for analytics
        const startTime = Date.now();
        
        // For streaming-capable AIs, pass messageId
        let primaryResponse;
        if (addressedAI === 'chatgpt' && streamingEnabled && images.length === 0) {
          // Create placeholder message for streaming
          const placeholderMessage = {
            id: messageId,
            sender: addressedAI,
            text: '',
            timestamp: new Date(),
            streaming: true
          };
          setMessages(prev => [...prev, placeholderMessage]);
          
          primaryResponse = await aiCalls[addressedAI]([...conversationHistory], messageId, currentInput).catch(e => `Error: ${e.message}`);
          
          // Update final message
          setMessages(prev => prev.map(msg =>
            msg.id === messageId ? { ...msg, text: primaryResponse, streaming: false } : msg
          ));
        } else {
          primaryResponse = await aiCalls[addressedAI]([...conversationHistory], null, currentInput).catch(e => `Error: ${e.message}`);
          
          const primaryMessage = {
            id: messageId,
            sender: addressedAI,
            text: primaryResponse,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, primaryMessage]);
        }
        
        setCurrentlyTyping(null);
        
        // Now check if other ENABLED AIs disagree
        const otherAIs = Object.keys(aiCalls).filter(ai => ai !== addressedAI && enabledAIs[ai]);
        let disagreementMsgId = Date.now() + 2;
        
        for (const aiId of otherAIs) {
          console.log(`🔍 Checking ${aiId} for disagreement...`);
          
          // Build analysis prompt
          const analysisHistory = [...conversationHistory];
          analysisHistory.push({
            role: 'assistant',
            content: `[${AI_CONFIGS[addressedAI].name}]: ${primaryResponse}`
          });
          analysisHistory.push({
            role: 'user',
            content: `You just saw ${AI_CONFIGS[addressedAI].name}'s response. Do you disagree with anything they said, or do you have important additional information to add?

IMPORTANT:
- If you AGREE with their response and have nothing important to add, respond with ONLY the word "AGREE"
- If you DISAGREE or have important additions, briefly explain what you disagree with or what you want to add
- Keep your response SHORT and focused on the disagreement or addition only`
          });
          
          setCurrentlyTyping(aiId);
          
          // Track start time for analytics
          const followUpStartTime = Date.now();
          
          // Dynamic timeout based on message size (longer for file uploads)
          const hasFiles = textFiles.length > 0 || imageFiles.length > 0;
          const timeoutDuration = hasFiles ? 30000 : 5000; // 30s with files, 5s without
          
          const timeoutPromise = new Promise((resolve) => {
            setTimeout(() => {
              console.log(`⏰ ${aiId} timed out after ${timeoutDuration/1000} seconds`);
              resolve('TIMEOUT');
            }, timeoutDuration);
          });
          
          const analysisPromise = aiCalls[aiId]([...analysisHistory], null, currentInput).catch(e => {
            console.log(`❌ ${aiId} error:`, e);
            return '';
          });
          
          const analysisResponse = await Promise.race([analysisPromise, timeoutPromise]);
          console.log(`📤 ${aiId} response:`, analysisResponse);
          
          setCurrentlyTyping(null);
          
          // Only add response if they disagree (not just "AGREE")
          if (analysisResponse && !analysisResponse.trim().toUpperCase().includes('AGREE') && analysisResponse.trim().length > 10) {
            const disagreementMessage = {
              id: disagreementMsgId++,
              sender: aiId,
              text: analysisResponse,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, disagreementMessage]);
            
            // Small delay between responses
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      } else {
        // Original behavior: all ENABLED AIs respond in sequence
        let conversationHistory = buildConversationHistory(currentInput);
        let messageId = Date.now() + 1;
        
        // Debug logging
        console.log('[DEBUG] Starting AI responses');
        console.log('[DEBUG] aiOrder:', aiOrder);
        console.log('[DEBUG] enabledAIs:', enabledAIs);
        console.log('[DEBUG] user capabilities allowedAIs:', user?.capabilities?.allowedAIs);
        
        // Log file info for debugging
        if (textFiles.length > 0) {
          console.log(`📎 [FILES] ${textFiles.length} text file(s) attached - all AIs will receive file contents in conversation history`);
        }
        if (imageFiles.length > 0) {
          console.log(`🖼️ [FILES] ${imageFiles.length} image(s) attached - only Claude and ChatGPT can view images`);
        }
        
        // Extract images for vision-capable AIs
        const visionImages = imageFiles.length > 0
          ? imageFiles.filter(file => file.content).map(file => file.content)
          : [];
        
        // Define AI call order (ALL 7 AIs)
        const aiOrder = ['claude', 'chatgpt', 'gemini', 'llama', 'deepseek', 'grok', 'groq'];
        
        // Only call enabled AIs (skip non-vision AIs if message has only images)
        for (const aiId of aiOrder) {
          if (!enabledAIs[aiId]) {
            console.log(`⏭️ Skipping disabled AI: ${aiId}`);
            continue;
          }
          
          // Skip non-vision AIs if message contains only images
          const canHandleImages = aiId === 'claude' || aiId === 'chatgpt';
          if (hasOnlyImages && !canHandleImages) {
            console.log(`⏭️ Skipping ${aiId} - cannot view images`);
            continue;
          }
          
          console.log(`🚚 [SEND] ${aiId} starting...`);
          setCurrentlyTyping(aiId);
          
          // Track start time
          const startTime = Date.now();
          
          // Send images only to vision-capable AIs
          const images = canHandleImages && visionImages.length > 0
            ? visionImages
            : [];
          
          // Debug: Log conversation history roles
          const roles = conversationHistory.filter(m => m.role !== 'system').map(m => m.role).join(' → ');
          console.log(`[${aiId}] roles: ${roles}`);
          
          let response;
          try {
            if (aiId === 'claude') {
              response = await callWithTimeout(
                () => callClaude([...conversationHistory], images, currentInput),
                12000,
                'Claude'
              );
            } else if (aiId === 'chatgpt') {
              // Handle streaming for ChatGPT
              if (streamingEnabled && images.length === 0) {
                const streamMessageId = messageId;
                const placeholderMessage = {
                  id: streamMessageId,
                  sender: aiId,
                  text: '',
                  timestamp: new Date(),
                  streaming: true
                };
                setMessages(prev => [...prev, placeholderMessage]);
                setCurrentlyTyping(null);
                
                response = await callWithTimeout(
                  () => callChatGPT([...conversationHistory], images, streamMessageId, currentInput),
                  15000,
                  'ChatGPT'
                );
                
                setMessages(prev => prev.map(msg =>
                  msg.id === streamMessageId ? { ...msg, text: response, streaming: false } : msg
                ));
                
                messageId++;
                
                // Track response
                const endTime = Date.now();
                trackResponse(aiId, currentInput, response, startTime, endTime);
                console.log(`✅ [SEND] ${aiId} completed`);
                continue;
              } else {
                response = await callWithTimeout(
                  () => callChatGPT([...conversationHistory], images, null, currentInput),
                  12000,
                  'ChatGPT'
                );
              }
            } else if (aiId === 'gemini') {
              response = await callWithTimeout(
                () => callGemini([...conversationHistory], currentInput),
                10000,
                'Gemini'
              );
            } else if (aiId === 'llama') {
              response = await callWithTimeout(
                () => callLlama([...conversationHistory], currentInput),
                10000,
                'Llama'
              );
            } else if (aiId === 'deepseek') {
              response = await callWithTimeout(
                () => callDeepSeek([...conversationHistory], currentInput),
                10000,
                'DeepSeek'
              );
            } else if (aiId === 'grok') {
              response = await callWithTimeout(
                () => callGrok([...conversationHistory], currentInput),
                10000,
                'Grok'
              );
            } else if (aiId === 'groq') {
              response = await callWithTimeout(
                () => callGroq([...conversationHistory], currentInput),
                8000,
                'Groq'
              );
            }
            
            // Track successful response
            const endTime = Date.now();
            trackResponse(aiId, currentInput, response, startTime, endTime);
            console.log(`✅ [SEND] ${aiId} completed`);
            
          } catch (error) {
            console.error(`💥 [${aiId}] failed:`, error);
            response = `Error: ${error.message}`;
          }
          
          const message = {
            id: messageId++,
            sender: aiId,
            text: response,
            timestamp: new Date()
          };
          
          setMessages(prev => [...prev, message]);
          setCurrentlyTyping(null);
          
          // Speak the response if voice is enabled
          if (voiceEnabled && response && !response.startsWith('Error:')) {
            speakText(response, aiId);
          }
          
          // Add this AI's response to history for next AI
          conversationHistory.push({
            role: 'user',
            content: `[${AI_CONFIGS[aiId].name} just responded]: ${response}\n\nNow it's your turn to respond. You can reference what the other AIs said if relevant.`
          });
        }
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error getting responses. Check console and API keys.');
    } finally {
      setLoading(false);
    }
    
    // Start auto-continue if enabled
    if (autoContinue) {
      setTimeout(() => continueConversation(0), 1000);
    }
  };

  const handleStopConversation = () => {
    setAutoContinue(false);
    setLoading(false);
    setCurrentlyTyping(null);
    setConversationRounds(0);
  };

  const handleClearChat = () => {
    if (window.confirm('Clear the current chat? (It will still be saved in history)')) {
      if (messages.length > 0) {
        saveCurrentChat();
      }
      setMessages([]);
      setCurrentChatId(null);
      setConversationRounds(0);
    }
  };

  const copyToClipboard = async (text, messageId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    
    for (const file of files) {
      const fileData = {
        id: Date.now() + Math.random(),
        name: file.name,
        size: file.size,
        type: file.type,
        file: file,
        uploading: false,
        uploadProgress: 0
      };

      // For large files (>10MB) or ZIP files, upload to Supabase
      if (file.size > 10 * 1024 * 1024 || file.name.endsWith('.zip')) {
        console.log(`📤 Uploading large file to Supabase: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        
        fileData.uploading = true;
        fileData.isSupabaseUpload = true;
        setUploadedFiles(prev => [...prev, fileData]);
        
        try {
          // Create form data for upload
          const formData = new FormData();
          formData.append('file', file);
          
          const uploadResponse = await fetch('/api/upload-to-supabase', {
            method: 'POST',
            headers: {
              ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
            },
            body: formData
          });
          
          if (!uploadResponse.ok) {
            throw new Error('Upload failed');
          }
          
          const { supabaseUrl, fileName } = await uploadResponse.json();
          
          // Update file data with Supabase URL
          setUploadedFiles(prev => prev.map(f =>
            f.id === fileData.id
              ? { ...f, uploading: false, supabaseUrl, fileName, content: `[Large file uploaded: ${file.name}]` }
              : f
          ));
          
          console.log(`✅ Upload complete: ${fileName}`);
        } catch (error) {
          console.error('Upload error:', error);
          setUploadedFiles(prev => prev.filter(f => f.id !== fileData.id));
          alert(`Failed to upload ${file.name}: ${error.message}`);
        }
        
        continue;
      }

      // For small files, process locally as before
      if (file.type.startsWith('image/')) {
        // Convert image to base64
        const reader = new FileReader();
        reader.onload = (e) => {
          fileData.preview = e.target.result;
          fileData.content = e.target.result;
          setUploadedFiles(prev => [...prev, fileData]);
        };
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        // Create video preview
        const reader = new FileReader();
        reader.onload = (e) => {
          fileData.preview = e.target.result;
          fileData.content = `[Video file: ${file.name}]`;
          setUploadedFiles(prev => [...prev, fileData]);
        };
        reader.readAsDataURL(file);
      } else if (file.name.endsWith('.zip')) {
        // Extract ZIP file locally (for small ZIPs < 10MB)
        try {
          const zip = new JSZip();
          const zipContent = await zip.loadAsync(file);
          let extractedFiles = [];
          
          for (const [filename, zipFile] of Object.entries(zipContent.files)) {
            if (!zipFile.dir) {
              const content = await zipFile.async('string');
              extractedFiles.push({
                name: filename,
                content: content,
                size: content.length
              });
            }
          }
          
          fileData.content = `[ZIP: ${file.name} - ${extractedFiles.length} files extracted]`;
          fileData.extractedFiles = extractedFiles;
          setUploadedFiles(prev => [...prev, fileData]);
          console.log(`📦 Extracted ${extractedFiles.length} files from ${file.name}`);
        } catch (error) {
          console.error('ZIP extraction error:', error);
          fileData.content = `[ZIP file: ${file.name} - extraction failed]`;
          setUploadedFiles(prev => [...prev, fileData]);
        }
      } else {
        // Check if it's a text-based file by extension (more reliable than MIME type)
        const textExtensions = [
          '.txt', '.md', '.py', '.js', '.jsx', '.ts', '.tsx',
          '.json', '.csv', '.xml', '.yaml', '.yml', '.html', '.htm',
          '.css', '.scss', '.sass', '.less', '.sql', '.sh', '.bat',
          '.c', '.cpp', '.h', '.hpp', '.java', '.cs', '.php', '.rb',
          '.go', '.rs', '.swift', '.kt', '.scala', '.r', '.m',
          '.log', '.cfg', '.conf', '.ini', '.env', '.gitignore',
          '.dockerfile', '.makefile', '.gradle', '.properties'
        ];
        
        const fileName = file.name.toLowerCase();
        const isTextFile = textExtensions.some(ext => fileName.endsWith(ext)) ||
                          file.type.startsWith('text/') ||
                          file.type === 'application/json' ||
                          file.type === 'application/xml';
        
        if (isTextFile) {
          // Read text content
          console.log(`📄 Reading text file: ${file.name}`);
          const reader = new FileReader();
          reader.onload = (e) => {
            fileData.content = e.target.result;
            setUploadedFiles(prev => [...prev, fileData]);
          };
          reader.onerror = (e) => {
            console.error(`❌ Failed to read ${file.name}:`, e);
            fileData.content = `[File: ${file.name} - Failed to read]`;
            setUploadedFiles(prev => [...prev, fileData]);
          };
          reader.readAsText(file);
        } else {
          // For other files, just store metadata
          fileData.content = `[File: ${file.name} (${(file.size / 1024).toFixed(2)} KB)]`;
          setUploadedFiles(prev => [...prev, fileData]);
        }
      }
    }
    
    // Reset input
    if (e.target) e.target.value = '';
  };

  const removeFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) return <ImageIcon className="w-4 h-4" />;
    if (file.type.startsWith('video/')) return <Film className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // Export functions
  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const maxWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Title
    doc.setFontSize(20);
    doc.setTextColor(34, 197, 94); // Green
    doc.text('CrowdAI Conversation', margin, yPosition);
    yPosition += 10;

    // Date
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(new Date().toLocaleString(), margin, yPosition);
    yPosition += 15;

    // Messages
    messages.forEach((msg, index) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(12);
      
      if (msg.sender === 'user') {
        doc.setTextColor(34, 197, 94); // Green for user
        doc.text('You:', margin, yPosition);
      } else {
        const config = AI_CONFIGS[msg.sender];
        doc.setTextColor(100, 100, 100);
        doc.text(`${config.name}:`, margin, yPosition);
      }
      
      yPosition += 7;
      
      // Message text
      doc.setFontSize(10);
      doc.setTextColor(50, 50, 50);
      const lines = doc.splitTextToSize(msg.text, maxWidth);
      lines.forEach(line => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin, yPosition);
        yPosition += 5;
      });
      
      yPosition += 5; // Space between messages
    });

    // Save
    const fileName = `crowdai-chat-${Date.now()}.pdf`;
    doc.save(fileName);
    setShowExportMenu(false);
  };

  const exportToMarkdown = () => {
    let markdown = '# CrowdAI Conversation\n\n';
    markdown += `*Exported: ${new Date().toLocaleString()}*\n\n`;
    markdown += '---\n\n';

    messages.forEach((msg) => {
      if (msg.sender === 'user') {
        markdown += `### 👤 You\n\n`;
      } else {
        const config = AI_CONFIGS[msg.sender];
        markdown += `### ${config.icon} ${config.name}\n\n`;
      }
      
      markdown += `${msg.text}\n\n`;
      
      if (msg.files && msg.files.length > 0) {
        markdown += '**Attachments:**\n';
        msg.files.forEach(file => {
          markdown += `- ${file.name} (${formatFileSize(file.size)})\n`;
        });
        markdown += '\n';
      }
      
      markdown += `*${formatTime(msg.timestamp)}*\n\n`;
      markdown += '---\n\n';
    });

    // Download
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crowdai-chat-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const exportToJSON = () => {
    const exportData = {
      exported: new Date().toISOString(),
      title: messages.find(m => m.sender === 'user')?.text.substring(0, 50) || 'Conversation',
      messageCount: messages.length,
      participants: ['user', ...new Set(messages.filter(m => m.sender !== 'user').map(m => m.sender))],
      messages: messages.map(msg => ({
        id: msg.id,
        sender: msg.sender === 'user' ? 'user' : AI_CONFIGS[msg.sender].name,
        text: msg.text,
        timestamp: msg.timestamp,
        files: msg.files?.map(f => ({
          name: f.name,
          size: f.size,
          type: f.type
        }))
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crowdai-chat-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // Token estimation (approximate)
  const estimateTokens = (text) => {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  };

  // Cost calculation per AI (approximate costs per 1K tokens)
  const AI_COSTS = {
    claude: { input: 0.003, output: 0.015 },
    chatgpt: { input: 0.005, output: 0.015 },
    gemini: { input: 0.00025, output: 0.0005 },
    llama: { input: 0.0002, output: 0.0002 },
    deepseek: { input: 0.0001, output: 0.0001 },
    grok: { input: 0.001, output: 0.001 },
    groq: { input: 0.00059, output: 0.00079 }
  };

  // Track AI response - accumulates in localStorage (bulletproof with error handling)
  const trackResponse = (aiId, inputText, outputText, startTime, endTime) => {
    try {
      // Guard against missing/invalid inputs
      if (!aiId || typeof aiId !== 'string') {
        console.error('📉 [TRACKING ERROR] Invalid aiId:', aiId);
        return { responseTime: 0, tokens: 0, cost: 0 };
      }
      
      const responseTime = endTime - startTime;
      const inputTokens = estimateTokens(inputText || '');
      const outputTokens = estimateTokens(outputText || '');
      const totalTokens = inputTokens + outputTokens;
      
      // Safely get pricing with fallback
      const pricing = AI_COSTS[aiId] || { input: 0, output: 0 };
      const cost = (inputTokens / 1000) * pricing.input +
                   (outputTokens / 1000) * pricing.output;

      console.log(`📊 [TRACKING] ${aiId?.toUpperCase?.() || aiId}: ${totalTokens} tokens, $${Number(cost || 0).toFixed(6)}${!AI_COSTS[aiId] ? ' (no pricing data)' : ''}`);

      setAnalytics(prev => {
        const updated = {
          responseTimes: {
            ...prev.responseTimes,
            [aiId]: [...(prev.responseTimes[aiId] || []), responseTime]
          },
          tokenUsage: {
            ...prev.tokenUsage,
            [aiId]: {
              input: (prev.tokenUsage[aiId]?.input || 0) + inputTokens,
              output: (prev.tokenUsage[aiId]?.output || 0) + outputTokens,
              total: (prev.tokenUsage[aiId]?.total || 0) + totalTokens
            }
          },
          costs: {
            ...prev.costs,
            [aiId]: (prev.costs[aiId] || 0) + cost
          },
          totalQueries: prev.totalQueries + 1
        };
        
        // Immediately save to localStorage for persistence
        try {
          localStorage.setItem('crowdai_analytics', JSON.stringify(updated));
        } catch (storageError) {
          console.error('📉 [TRACKING] localStorage failed:', storageError);
        }
        
        return updated;
      });

      return { responseTime, tokens: totalTokens, cost };
    } catch (error) {
      console.error('📉 [TRACKING ERROR]', { aiId, hasPricing: !!AI_COSTS[aiId], error });
      return { responseTime: 0, tokens: 0, cost: 0 };
    }
  };

  // Reset analytics
  const resetAnalytics = () => {
    if (window.confirm('Reset all cost tracking data? This cannot be undone.')) {
      const freshAnalytics = {
        responseTimes: {},
        tokenUsage: {},
        costs: {},
        totalQueries: 0
      };
      setAnalytics(freshAnalytics);
      localStorage.setItem('crowdai_analytics', JSON.stringify(freshAnalytics));
      console.log('📊 Analytics reset');
    }
  };

  // Conversation branching functions
  const createBranch = (fromMessageIndex = messages.length) => {
    const branchName = `branch-${Date.now()}`;
    const branchMessages = messages.slice(0, fromMessageIndex);
    
    setBranches(prev => ({
      ...prev,
      [branchName]: {
        messages: branchMessages,
        createdAt: Date.now(),
        parentBranch: currentBranch,
        branchPoint: fromMessageIndex
      }
    }));
    
    setCurrentBranch(branchName);
    setMessages(branchMessages);
    
    return branchName;
  };

  const switchBranch = (branchName) => {
    if (branches[branchName]) {
      // Save current branch state
      setBranches(prev => ({
        ...prev,
        [currentBranch]: {
          ...prev[currentBranch],
          messages: messages
        }
      }));
      
      // Switch to new branch
      setCurrentBranch(branchName);
      setMessages(branches[branchName].messages);
    }
  };

  const deleteBranch = (branchName) => {
    if (branchName === 'main') {
      alert('Cannot delete main branch');
      return;
    }
    
    setBranches(prev => {
      const newBranches = { ...prev };
      delete newBranches[branchName];
      return newBranches;
    });
    
    if (currentBranch === branchName) {
      switchBranch('main');
    }
  };

  const compareBranches = (branch1, branch2) => {
    setBranchComparison({ branch1, branch2 });
  };

  // Undo/Redo functionality
  const saveToHistory = (newMessages) => {
    setConversationHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push([...newMessages]);
      return newHistory;
    });
    setHistoryIndex(prev => prev + 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setMessages(conversationHistory[historyIndex - 1]);
    }
  };

  const redo = () => {
    if (historyIndex < conversationHistory.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setMessages(conversationHistory[historyIndex + 1]);
    }
  };

  // Smart follow-up generation
  const generateFollowUps = async () => {
    if (messages.length === 0) return;
    
    setGeneratingFollowUps(true);
    
    try {
      // Get last few messages for context
      const recentMessages = messages.slice(-6);
      const context = recentMessages
        .map(m => `${m.sender === 'user' ? 'User' : AI_CONFIGS[m.sender]?.name || m.sender}: ${m.text.substring(0, 200)}`)
        .join('\n');
      
      const prompt = `Based on this conversation, suggest 3 relevant follow-up questions the user might ask next. Keep them concise and specific.

Context:
${context}

Provide ONLY 3 follow-up questions, one per line, without numbering or explanation:`;

      // Use ChatGPT for quick follow-up generation
      const response = await fetch('/api/chatgpt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          stream: false,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        if (response.status === 429) {
          console.log('⏰ Follow-up generation rate limited, will retry later');
          // Soft fail - don't show error to user, just skip for now
          return;
        }
        console.error('Follow-up generation failed:', response.status);
        return;
      }
      
      const data = await response.json();
      
      // Validate response structure
      if (!data || !data.choices || !data.choices[0] || !data.choices[0].message || !data.choices[0].message.content) {
        console.error('Invalid follow-up response structure:', data);
        return;
      }
      
      const suggestions = data.choices[0].message.content
        .split('\n')
        .filter(line => line.trim())
        .slice(0, 3);
      
      if (suggestions.length > 0) {
        setSuggestedFollowUps(suggestions);
      }
    } catch (error) {
      console.error('Failed to generate follow-ups:', error);
    } finally {
      setGeneratingFollowUps(false);
    }
  };

  // Auto-generate follow-ups after AI responses (with stagger to avoid rate limits)
  useEffect(() => {
    if (messages.length > 0 && !loading && messages[messages.length - 1].sender !== 'user') {
      // Increased delay to 3-4 seconds to stagger after main responses
      const delay = 3000 + Math.random() * 1000; // 3-4 seconds with jitter
      const timer = setTimeout(() => {
        generateFollowUps();
      }, delay);
      return () => clearTimeout(timer);
    }
  }, [messages, loading]);

  // Handle profile update
  const handleProfileUpdate = async () => {
    if (!newUsername || newUsername.trim().length < 3) {
      setProfileUpdateError('Username must be at least 3 characters');
      return;
    }
    
    setUpdatingProfile(true);
    setProfileUpdateError('');
    setProfileUpdateSuccess('');
    
    const result = await updateProfile({ username: newUsername.trim() });
    
    setUpdatingProfile(false);
    
    if (result.success) {
      setProfileUpdateSuccess('Username updated successfully!');
      setTimeout(() => {
        setShowProfileSettings(false);
        setProfileUpdateSuccess('');
        setNewUsername('');
      }, 1500);
    } else {
      setProfileUpdateError(result.error || 'Failed to update username');
    }
  };

  // Code execution function
  const executeCode = async (code, language, messageId, codeIndex) => {
    const executionKey = `${messageId}-${codeIndex}`;
    setExecutingCode(executionKey);
    
    try {
      const response = await fetch('/api/execute-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken && { 'Authorization': `Bearer ${accessToken}` })
        },
        body: JSON.stringify({
          code: code,
          language: language
        })
      });
      
      const result = await response.json();
      
      setCodeExecutions(prev => ({
        ...prev,
        [executionKey]: result
      }));
    } catch (error) {
      setCodeExecutions(prev => ({
        ...prev,
        [executionKey]: {
          success: false,
          error: error.message,
          language: language
        }
      }));
    } finally {
      setExecutingCode(null);
    }
  };

  // Detect code blocks in text
  const detectCodeBlocks = (text) => {
    // Match code blocks with language specifier: ```language\ncode\n```
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks = [];
    let match;
    
    while ((match = codeBlockRegex.exec(text)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim(),
        fullMatch: match[0],
        index: match.index
      });
    }
    
    return blocks;
  };

  // Render message with code blocks
  const renderMessageWithCode = (msg) => {
    const codeBlocks = detectCodeBlocks(msg.text);
    
    if (codeBlocks.length === 0) {
      return <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">{msg.text}</div>;
    }
    
    const parts = [];
    let lastIndex = 0;
    
    codeBlocks.forEach((block, blockIndex) => {
      // Add text before code block
      if (block.index > lastIndex) {
        const textBefore = msg.text.substring(lastIndex, block.index);
        parts.push(
          <div key={`text-${blockIndex}`} className="whitespace-pre-wrap text-gray-300 leading-relaxed mb-2">
            {textBefore}
          </div>
        );
      }
      
      const executionKey = `${msg.id}-${blockIndex}`;
      const execution = codeExecutions[executionKey];
      const isExecuting = executingCode === executionKey;
      const canExecute = ['python', 'javascript', 'js'].includes(block.language.toLowerCase());
      
      // Add code block with execution UI
      parts.push(
        <div key={`code-${blockIndex}`} className="mb-3">
          <div className="bg-gray-900 rounded-lg border border-gray-600 overflow-hidden">
            <div className="flex items-center justify-between bg-gray-800 px-3 py-2 border-b border-gray-600">
              <span className="text-xs font-mono text-gray-400">{block.language}</span>
              {canExecute && (
                <button
                  onClick={() => executeCode(block.code, block.language, msg.id, blockIndex)}
                  disabled={isExecuting}
                  className="flex items-center gap-1 px-3 py-1 bg-green-600/20 hover:bg-green-600/30 disabled:bg-gray-700 text-green-400 disabled:text-gray-500 rounded text-xs font-medium transition-all border border-green-500/30 disabled:border-gray-600"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Zap className="w-3 h-3" />
                      Run Code
                    </>
                  )}
                </button>
              )}
            </div>
            <pre className="p-3 overflow-x-auto text-sm">
              <code className="text-gray-300 font-mono">{block.code}</code>
            </pre>
            
            {/* Execution Result */}
            {execution && (
              <div className={`border-t ${execution.success ? 'border-green-500/30 bg-green-900/20' : 'border-red-500/30 bg-red-900/20'} p-3`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-semibold ${execution.success ? 'text-green-400' : 'text-red-400'}`}>
                    {execution.success ? '✓ Output' : '✗ Error'}
                  </span>
                  {execution.sandboxed && (
                    <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">
                      🐳 Sandboxed
                    </span>
                  )}
                </div>
                
                {/* Text Output */}
                {(execution.output || execution.error) && (
                  <pre className="text-xs font-mono overflow-x-auto mb-3">
                    <code className={execution.success ? 'text-green-300' : 'text-red-300'}>
                      {execution.success ? execution.output : execution.error}
                    </code>
                  </pre>
                )}
                
                {/* Charts/Visualizations */}
                {execution.charts && execution.charts.length > 0 && (
                  <div className="space-y-3 mt-3">
                    <div className="flex items-center gap-2 text-xs text-cyan-400 font-semibold">
                      <BarChart3 className="w-4 h-4" />
                      Generated Visualizations ({execution.charts.length})
                    </div>
                    {execution.charts.map((chart, idx) => (
                      <div key={idx} className="bg-white/5 rounded-lg p-3 border border-gray-600">
                        {chart.type === 'image' && (
                          <img
                            src={chart.data}
                            alt={`Chart ${idx + 1}`}
                            className="max-w-full h-auto rounded"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
      
      lastIndex = block.index + block.fullMatch.length;
    });
    
    // Add remaining text
    if (lastIndex < msg.text.length) {
      const textAfter = msg.text.substring(lastIndex);
      parts.push(
        <div key="text-end" className="whitespace-pre-wrap text-gray-300 leading-relaxed">
          {textAfter}
        </div>
      );
    }
    
    return <div>{parts}</div>;
  };

  // Show login screen if not authenticated
  if (authLoading) {
    return (
      <div className="flex h-screen bg-gray-900 items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-green-400 mx-auto mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Authentication Modals */}
      {showAuthModal && authMode === 'login' && (
        <Login
          onClose={() => setShowAuthModal(false)}
          onSwitchToSignup={() => setAuthMode('signup')}
        />
      )}
      {showAuthModal && authMode === 'signup' && (
        <Signup
          onClose={() => setShowAuthModal(false)}
          onSwitchToLogin={() => setAuthMode('login')}
        />
      )}
      
      {/* Tier Upgrade Modal */}
      {showUpgradeModal && user && (
        <TierUpgrade
          currentTier={user.tier}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
      
      {/* Admin Panel */}
      {showAdminPanel && isAdmin && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}
      
      {/* Sidebar */}
      {showSidebar && (
        <div className="w-64 bg-gray-800/95 backdrop-blur-sm border-r border-gray-700 flex flex-col animate-in slide-in-from-left duration-300">
          {/* User Info / Auth */}
          <div className="p-2 border-b border-gray-700">
            {user ? (
              <UsageBar />
            ) : (
              <div className="space-y-1.5">
                <p className="text-xs text-gray-300 mb-2">Sign in to unlock features</p>
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setShowAuthModal(true);
                  }}
                  className="w-full py-1.5 px-3 bg-gradient-to-r from-green-500 to-cyan-400 hover:from-green-600 hover:to-cyan-500 text-white text-sm font-semibold rounded-lg transition-all"
                >
                  Login
                </button>
                <button
                  onClick={() => {
                    setAuthMode('signup');
                    setShowAuthModal(true);
                  }}
                  className="w-full py-1.5 px-3 bg-gray-700 hover:bg-gray-600 text-white text-sm font-semibold rounded-lg transition-all"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>

          {/* Sidebar Tabs */}
          <div className="flex border-b border-gray-700">
            <button
              onClick={() => setSidebarTab('chats')}
              className={`flex-1 py-2 px-2 text-xs font-medium transition-colors ${
                sidebarTab === 'chats'
                  ? 'bg-gray-700 text-green-400 border-b-2 border-green-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <History className="w-3 h-3 inline-block mr-1" />
              Chats
            </button>
            <button
              onClick={() => setSidebarTab('settings')}
              className={`flex-1 py-2 px-2 text-xs font-medium transition-colors ${
                sidebarTab === 'settings'
                  ? 'bg-gray-700 text-green-400 border-b-2 border-green-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Settings className="w-3 h-3 inline-block mr-1" />
              AI
            </button>
            <button
              onClick={() => setSidebarTab('controls')}
              className={`flex-1 py-2 px-2 text-xs font-medium transition-colors ${
                sidebarTab === 'controls'
                  ? 'bg-gray-700 text-green-400 border-b-2 border-green-400'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Bot className="w-3 h-3 inline-block mr-1" />
              Controls
            </button>
            {user && (
              <button
                onClick={() => setSidebarTab('profile')}
                className={`flex-1 py-2 px-2 text-xs font-medium transition-colors ${
                  sidebarTab === 'profile'
                    ? 'bg-gray-700 text-green-400 border-b-2 border-green-400'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <UserCircle className="w-3 h-3 inline-block mr-1" />
                Profile
              </button>
            )}
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-2">
            {sidebarTab === 'chats' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-semibold text-gray-200">Chats ({chatHistory.length})</h3>
                  <button
                    onClick={startNewChat}
                    className="px-2 py-1 bg-gradient-to-r from-green-500 to-cyan-400 hover:from-green-600 hover:to-cyan-500 text-white rounded text-xs font-medium transition-all"
                  >
                    New
                  </button>
                </div>

                {/* Search Bar */}
                <div className="mb-2 space-y-1">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-3 h-3 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search..."
                      className="w-full pl-7 pr-7 py-1.5 bg-gray-700/50 border border-gray-600 text-gray-200 placeholder-gray-400 rounded text-xs focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-transparent transition-all"
                    />
                    <button
                      onClick={() => setShowSearchFilters(!showSearchFilters)}
                      className={`absolute right-2 top-1/2 transform -translate-y-1/2 p-0.5 rounded transition-colors ${
                        showSearchFilters ? 'text-green-400 bg-green-400/10' : 'text-gray-400 hover:text-gray-200'
                      }`}
                      title="Filters"
                    >
                      <Filter className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Search Filters */}
                  {showSearchFilters && (
                    <div className="bg-gray-700/50 border border-gray-600 rounded p-2 space-y-2 animate-in slide-in-from-top duration-200">
                      <div>
                        <label className="text-xs font-medium text-gray-300 mb-1 block">Filter by AI</label>
                        <select
                          value={searchFilters.ai}
                          onChange={(e) => setSearchFilters(prev => ({ ...prev, ai: e.target.value }))}
                          className="w-full px-2 py-1.5 bg-gray-600/50 border border-gray-500 text-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="all">All AIs</option>
                          {Object.entries(AI_CONFIGS).map(([id, config]) => (
                            <option key={id} value={id}>{config.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="text-xs font-medium text-gray-300 mb-1 block">Date Range</label>
                        <select
                          value={searchFilters.dateRange}
                          onChange={(e) => setSearchFilters(prev => ({ ...prev, dateRange: e.target.value }))}
                          className="w-full px-2 py-1.5 bg-gray-600/50 border border-gray-500 text-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="all">All Time</option>
                          <option value="today">Today</option>
                          <option value="week">This Week</option>
                          <option value="month">This Month</option>
                        </select>
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300">
                        <input
                          type="checkbox"
                          checked={searchFilters.hasFiles}
                          onChange={(e) => setSearchFilters(prev => ({ ...prev, hasFiles: e.target.checked }))}
                          className="w-3 h-3 cursor-pointer accent-green-500"
                        />
                        <span>Only chats with files</span>
                      </label>

                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSearchFilters({ ai: 'all', dateRange: 'all', hasFiles: false });
                        }}
                        className="w-full px-3 py-1.5 bg-gray-600/50 hover:bg-gray-600 text-gray-300 rounded text-xs transition-colors"
                      >
                        Clear Filters
                      </button>
                    </div>
                  )}
                </div>

                {chatHistory.length === 0 ? (
                  <div className="text-center py-4 text-gray-400">
                    <Clock className="w-8 h-8 mx-auto mb-1 opacity-50" />
                    <p className="text-xs">No history yet</p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {searchChats().length === 0 ? (
                      <div className="text-center py-4 text-gray-400">
                        <Search className="w-6 h-6 mx-auto mb-1 opacity-50" />
                        <p className="text-xs">No chats found</p>
                      </div>
                    ) : (
                      searchChats().map((chat) => (
                        <div
                          key={chat.id}
                          onClick={() => {
                            loadChat(chat.id);
                            setSearchQuery('');
                          }}
                          className={`bg-gray-700/50 hover:bg-gray-700 border rounded p-2 cursor-pointer transition-all group ${
                            currentChatId === chat.id ? 'border-green-500 bg-gray-700' : 'border-gray-600'
                          }`}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1 min-w-0">
                              <div
                                className="text-gray-200 truncate text-xs font-medium"
                                dangerouslySetInnerHTML={{ __html: highlightText(chat.title, searchQuery) }}
                              />
                              <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" />
                                <span className="text-xs">{chat.messages.length} msgs</span>
                              </div>
                            </div>
                            <button
                              onClick={(e) => deleteChat(chat.id, e)}
                              className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-600/20 rounded text-red-400 transition-all ml-1"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {sidebarTab === 'settings' && (
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-semibold text-gray-200">AI Management</h3>
                  <button
                    onClick={checkAllHealth}
                    disabled={checkingHealth}
                    className="px-2 py-0.5 bg-gradient-to-r from-green-500 to-cyan-400 hover:from-green-600 hover:to-cyan-500 disabled:from-gray-600 disabled:to-gray-600 text-white rounded text-xs font-medium transition-all"
                  >
                    {checkingHealth ? '...' : 'Check'}
                  </button>
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer text-gray-300 bg-gray-700/30 px-2 py-1.5 rounded border border-gray-600 hover:bg-gray-700/50 transition-all mb-2">
                  <input
                    type="checkbox"
                    checked={includePastChats}
                    onChange={(e) => setIncludePastChats(e.target.checked)}
                    className="w-3 h-3 cursor-pointer accent-green-500"
                  />
                  <span className="text-xs">💾 Memory</span>
                </label>
                <div className="space-y-2">
                  {Object.entries(AI_CONFIGS).map(([aiId, config]) => (
                    <div
                      key={aiId}
                      className="bg-gray-700/50 border border-gray-600 rounded p-2 hover:bg-gray-700 transition-all"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-base">{config.icon}</span>
                          <div>
                            <div className="font-semibold text-xs text-gray-200">{config.name}</div>
                            <div className="text-xs text-gray-400">{config.contextWindow}</div>

                {/* Advanced Tools Section */}
                <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50 rounded p-2 mt-2 backdrop-blur-sm">
                  <div className="font-semibold text-gray-100 mb-2 flex items-center gap-1.5 text-xs">
                    <span className="text-sm">⚡</span>
                    Advanced
                  </div>
                  
                  {/* Undo/Redo Buttons */}
                  <div className="grid grid-cols-2 gap-1.5 mb-2">
                    <button
                      onClick={undo}
                      disabled={historyIndex <= 0}
                      className="px-2 py-1 bg-gray-700/80 hover:bg-purple-600/20 disabled:bg-gray-800/50 disabled:text-gray-600 text-gray-300 rounded text-xs font-medium transition-all flex items-center justify-center gap-1"
                      title="Undo"
                    >
                      <span className="text-sm">↶</span>
                      <span>Undo</span>
                    </button>
                    <button
                      onClick={redo}
                      disabled={historyIndex >= conversationHistory.length - 1}
                      className="px-2 py-1 bg-gray-700/80 hover:bg-purple-600/20 disabled:bg-gray-800/50 disabled:text-gray-600 text-gray-300 rounded text-xs font-medium transition-all flex items-center justify-center gap-1"
                      title="Redo"
                    >
                      <span>Redo</span>
                      <span className="text-sm">↷</span>
                    </button>
                  </div>
                  
                  {/* Branch Management */}
                  <div className="mb-2">
                    <button
                      onClick={() => setShowBranchManager(!showBranchManager)}
                      className="w-full px-2 py-1.5 bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 rounded text-xs font-medium transition-all flex items-center justify-between gap-1"
                    >
                      <div className="flex items-center gap-1">
                        <span className="text-sm">🌳</span>
                        <span>Branches</span>
                      </div>
                      <span className="px-1.5 py-0.5 bg-emerald-500/20 rounded-full text-xs">{Object.keys(branches).length}</span>
                    </button>
                  </div>
                  
                  {showBranchManager && (
                    <div className="bg-gray-800/50 rounded p-3 space-y-2 mb-2">
                      {Object.entries(branches).map(([name, branch]) => (
                        <div key={name} className={`flex items-center justify-between p-2 rounded ${currentBranch === name ? 'bg-purple-600/20 border border-purple-500/30' : 'bg-gray-700/30'}`}>
                          <button
                            onClick={() => switchBranch(name)}
                            className="flex-1 text-left text-sm text-gray-300 hover:text-gray-100"
                          >
                            {name === 'main' ? '🌳 ' : '🌿 '}{name}
                            <span className="text-xs text-gray-500 ml-2">
                              ({branch.messages?.length || 0} msgs)
                            </span>
                          </button>
                          {name !== 'main' && (
                            <button
                              onClick={() => deleteBranch(name)}
                              className="px-2 py-1 text-red-400 hover:text-red-300 text-xs"
                            >
                              ×

      {/* Analytics Modal (Admin Only) */}
      {showAnalytics && isAdmin && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-100">📊 Admin Analytics</h2>
                <button
                  onClick={() => setShowAnalytics(false)}
                  className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              {/* Overview Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-br from-purple-600/20 to-purple-800/20 border border-purple-500/30 rounded-lg p-4">
                  <div className="text-sm text-purple-400 mb-1">Total Queries</div>
                  <div className="text-3xl font-bold text-purple-300">{analytics.totalQueries}</div>
                </div>
                <div className="bg-gradient-to-br from-blue-600/20 to-blue-800/20 border border-blue-500/30 rounded-lg p-4">
                  <div className="text-sm text-blue-400 mb-1">Total Cost</div>
                  <div className="text-3xl font-bold text-blue-300">
                    ${Object.values(analytics.costs).reduce((a, b) => a + b, 0).toFixed(4)}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-green-600/20 to-green-800/20 border border-green-500/30 rounded-lg p-4">
                  <div className="text-sm text-green-400 mb-1">Total Tokens</div>
                  <div className="text-3xl font-bold text-green-300">
                    {Object.values(analytics.tokenUsage).reduce((a, b) => a + (b?.total || 0), 0).toLocaleString()}
                  </div>
                </div>
              </div>
              
              {/* Per-AI Breakdown */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-200 mb-3">Per-AI Breakdown</h3>
                {Object.entries(AI_CONFIGS).map(([aiId, config]) => {
                  const tokens = analytics.tokenUsage[aiId] || { input: 0, output: 0, total: 0 };
                  const cost = analytics.costs[aiId] || 0;
                  const times = analytics.responseTimes[aiId] || [];
                  const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 0;
                  
                  return (
                    <div key={aiId} className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{config.icon}</span>
                          <span className="font-semibold text-gray-200">{config.name}</span>
                        </div>
                        <span className="text-sm text-gray-400">{times.length} queries</span>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <div className="text-gray-400 text-xs mb-1">Avg Response</div>
                          <div className="text-cyan-400 font-mono">{(avgTime / 1000).toFixed(2)}s</div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-xs mb-1">Total Tokens</div>
                          <div className="text-green-400 font-mono">{tokens.total.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-xs mb-1">In/Out</div>
                          <div className="text-yellow-400 font-mono text-xs">
                            {tokens.input.toLocaleString()}/{tokens.output.toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-400 text-xs mb-1">Total Cost</div>
                          <div className="text-blue-400 font-mono">${cost.toFixed(4)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="mt-6 space-y-3">
                <div className="p-4 bg-yellow-600/10 border border-yellow-500/30 rounded-lg">
                  <p className="text-xs text-yellow-400">
                    💡 <strong>Note:</strong> Token counts and costs are estimates based on character counts.
                    Actual API usage may vary. Analytics persist across sessions until manually reset.
                  </p>
                </div>
                <button
                  onClick={resetAnalytics}
                  className="w-full px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Reset All Analytics
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => createBranch()}
                        className="w-full px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded text-xs transition-colors"
                      >
                        + New Branch
                      </button>
                    </div>
                  )}
                  
                  {/* Analytics Button (Admin Only) */}
                  {isAdmin && (
                    <button
                      onClick={() => setShowAnalytics(!showAnalytics)}
                      className="w-full px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded text-xs transition-colors flex items-center justify-center gap-1 border border-blue-500/30"
                    >
                      📊 Analytics
                    </button>
                  )}
                </div>
                          </div>
                        </div>
                        {aiHealth[aiId] !== null && (
                          <div className="relative">
                            <div
                              className={`w-2 h-2 rounded-full ${
                                aiHealth[aiId] ? 'bg-green-400' : 'bg-red-500'
                              }`}
                            />
                            {aiHealth[aiId] && (
                              <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-400 animate-ping opacity-75" />
                            )}
                          </div>
                        )}
                      </div>
                      <div className="mb-1.5 space-y-0.5">
                        <div className="text-xs text-green-400">{config.description}</div>
                      </div>
                      
                      {/* Persona Controls */}
                      <div className="mb-1.5 space-y-1">
                        <div className="text-xs text-cyan-400 flex items-center gap-1">
                          🎭 {PERSONA_PRESETS[aiPersonas[aiId].preset]?.name || 'Custom'}
                        </div>
                        
                        {/* Preset Selector */}
                        <select
                          value={aiPersonas[aiId].preset}
                          onChange={(e) => applyPersonaPreset(aiId, e.target.value)}
                          className="w-full px-1.5 py-0.5 bg-gray-600/50 border border-gray-500 text-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        >
                          {Object.entries(PERSONA_PRESETS).map(([key, preset]) => (
                            <option key={key} value={key}>
                              {preset.icon} {preset.name}
                            </option>
                          ))}
                        </select>
                        
                        {/* Temperature Slider */}
                        <div>
                          <label className="text-xs text-gray-400 flex justify-between">
                            <span>Temp</span>
                            <span className="text-cyan-400 text-xs">{aiPersonas[aiId].temperature.toFixed(1)}</span>
                          </label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.1"
                            value={aiPersonas[aiId].temperature}
                            onChange={(e) => updatePersona(aiId, { temperature: parseFloat(e.target.value) })}
                            className="w-full h-1 bg-gray-600 rounded appearance-none cursor-pointer accent-cyan-500"
                          />
                        </div>
                        
                        {/* Expand/Collapse for System Prompt */}
                        <button
                          onClick={() => setShowPersonaEditor(showPersonaEditor === aiId ? null : aiId)}
                          className="w-full text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center justify-center gap-1"
                        >
                          {showPersonaEditor === aiId ? '▼ Hide' : '▶ Edit'} System Prompt
                        </button>
                        
                        {showPersonaEditor === aiId && (
                          <textarea
                            value={aiPersonas[aiId].systemPrompt}
                            onChange={(e) => updatePersona(aiId, { systemPrompt: e.target.value })}
                            placeholder="Custom system prompt (optional)"
                            className="w-full px-2 py-1.5 bg-gray-600/50 border border-gray-500 text-gray-200 rounded text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500 min-h-[60px] font-mono"
                          />
                        )}
                      </div>
                      
                      <label className="flex items-center gap-1.5 cursor-pointer bg-gray-600/30 px-2 py-1 rounded hover:bg-gray-600/50 transition-colors">
                        <input
                          type="checkbox"
                          checked={enabledAIs[aiId]}
                          onChange={(e) =>
                            setEnabledAIs(prev => ({
                              ...prev,
                              [aiId]: e.target.checked
                            }))
                          }
                          className="w-3 h-3 cursor-pointer accent-green-500"
                        />
                        <span className="text-xs text-gray-300">
                          {enabledAIs[aiId] ? 'On' : 'Off'}
                        </span>
            
            {/* Smart Follow-up Suggestions */}
            {suggestedFollowUps.length > 0 && !loading && (
              <div className="mb-3 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 mb-2 text-xs text-gray-400">
                  <span>💡 Suggested follow-ups:</span>
                  {generatingFollowUps && <Loader2 className="w-3 h-3 animate-spin" />}
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedFollowUps.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInput(suggestion);
                        setSuggestedFollowUps([]);
                      }}
                      className="px-3 py-2 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 hover:from-cyan-600/30 hover:to-blue-600/30 border border-cyan-500/30 text-cyan-300 rounded-lg text-sm transition-all duration-200 hover:scale-105"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sidebarTab === 'controls' && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-200 mb-2">Controls</h3>
                
                {/* Stream Toggle */}
                <div className="bg-gray-700/50 border border-gray-600 rounded p-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-gray-200">Streaming</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={streamingEnabled}
                      onChange={(e) => setStreamingEnabled(e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-purple-500"
                    />
                  </label>
                </div>

                {/* Voice Toggle */}
                <div className="bg-gray-700/50 border border-gray-600 rounded p-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      {voiceEnabled ? <Volume2 className="w-4 h-4 text-orange-400" /> : <VolumeX className="w-4 h-4 text-orange-400" />}
                      <span className="text-xs text-gray-200">Voice</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={voiceEnabled}
                      onChange={(e) => setVoiceEnabled(e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-orange-500"
                    />
                  </label>
                </div>

                {/* Auto-Continue Toggle */}
                <div className="bg-gray-700/50 border border-gray-600 rounded p-2">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-cyan-400" />
                      <span className="text-xs text-gray-200">Auto-Continue</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={autoContinue}
                      onChange={(e) => setAutoContinue(e.target.checked)}
                      className="w-4 h-4 cursor-pointer accent-cyan-500"
                    />
                  </label>
                </div>

                {/* Export Section */}
                {messages.length > 0 && (
                  <div className="bg-gray-700/50 border border-gray-600 rounded p-2">
                    <div className="text-xs text-gray-200 mb-1.5 flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      Export
                    </div>
                    <div className="space-y-1">
                      <button
                        onClick={exportToPDF}
                        className="w-full px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-gray-200 rounded transition-colors flex items-center gap-1.5 text-xs border border-blue-500/30"
                      >
                        <FileText className="w-3 h-3" />
                        PDF
                      </button>
                      <button
                        onClick={exportToMarkdown}
                        className="w-full px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-gray-200 rounded transition-colors flex items-center gap-1.5 text-xs border border-blue-500/30"
                      >
                        <FileText className="w-3 h-3" />
                        Markdown
                      </button>
                      <button
                        onClick={exportToJSON}
                        className="w-full px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-gray-200 rounded transition-colors flex items-center gap-1.5 text-xs border border-blue-500/30"
                      >
                        <FileText className="w-3 h-3" />
                        JSON
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {messages.length > 0 && (
                  <div className="space-y-1.5">
                    <button
                      onClick={startNewChat}
                      className="w-full px-3 py-1.5 bg-gradient-to-r from-green-500 to-cyan-400 hover:from-green-600 hover:to-cyan-500 text-white rounded text-xs font-medium transition-all flex items-center justify-center gap-1.5"
                    >
                      <Bot className="w-3 h-3" />
                      New Chat
                    </button>
                    <button
                      onClick={handleClearChat}
                      className="w-full px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded text-xs font-medium transition-all flex items-center justify-center gap-1.5 border border-red-500/30"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear Chat
                    </button>
                  </div>
                )}
              </div>
            )}

            {sidebarTab === 'profile' && user && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-200 mb-2">Profile</h3>
                
                {/* UsageBar moved here */}
                <UsageBar />
                
                {/* Account Info */}
                <div className="bg-gray-700/50 border border-gray-600 rounded p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Username</span>
                    <button
                      onClick={() => {
                        setNewUsername(user.username || '');
                        setShowProfileSettings(true);
                      }}
                      className="p-1 hover:bg-gray-600 rounded text-gray-300 hover:text-white transition-colors"
                      title="Edit username"
                    >
                      <Edit className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-sm font-medium text-white">{user.username}</div>
                  
                  <div className="pt-2 border-t border-gray-600">
                    <span className="text-xs text-gray-400">Email</span>
                    <div className="text-sm text-gray-300">{user.email}</div>
                  </div>
                  
                  <div className="pt-2 border-t border-gray-600">
                    <span className="text-xs text-gray-400">Account Type</span>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-semibold text-green-400 capitalize">{user.tier}</span>
                      {user.tier !== 'enterprise' && (
                        <button
                          onClick={() => setShowUpgradeModal(true)}
                          className="px-2 py-0.5 bg-gradient-to-r from-green-500 to-cyan-400 hover:from-green-600 hover:to-cyan-500 text-white rounded text-xs font-medium transition-all"
                        >
                          Upgrade
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {user.createdAt && (
                    <div className="pt-2 border-t border-gray-600">
                      <span className="text-xs text-gray-400">Member Since</span>
                      <div className="text-xs text-gray-300">{new Date(user.createdAt).toLocaleDateString()}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Profile Settings Modal */}
      {showProfileSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-md border border-gray-700">
            <div className="flex justify-between items-center p-4 border-b border-gray-700">
              <h3 className="text-lg font-bold text-white">Edit Profile</h3>
              <button onClick={() => {
                setShowProfileSettings(false);
                setProfileUpdateError('');
                setProfileUpdateSuccess('');
              }} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {profileUpdateError && (
                <div className="bg-red-900/50 border border-red-700 text-red-200 px-3 py-2 rounded text-sm">
                  {profileUpdateError}
                </div>
              )}
              
              {profileUpdateSuccess && (
                <div className="bg-green-900/50 border border-green-700 text-green-200 px-3 py-2 rounded text-sm">
                  {profileUpdateSuccess}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Enter new username"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  3-30 characters, letters, numbers, hyphens, and underscores only
                </p>
              </div>
              
              <button
                onClick={handleProfileUpdate}
                disabled={updatingProfile || !newUsername || newUsername === user.username}
                className="w-full py-2 bg-gradient-to-r from-green-500 to-cyan-400 hover:from-green-600 hover:to-cyan-500 disabled:from-gray-600 disabled:to-gray-600 text-white rounded-lg font-medium transition-all disabled:cursor-not-allowed"
              >
                {updatingProfile ? 'Updating...' : 'Update Username'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800/95 backdrop-blur-sm border-b border-gray-700 p-4 flex justify-between items-center shadow-xl">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(!showSidebar)}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Toggle sidebar"
            >
              <Menu className="w-5 h-5 text-gray-300" />
            </button>
            <img
              src="/logo.png"
              alt="CrowdAI"
              className="w-10 h-10 object-contain drop-shadow-lg"
            />
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">CrowdAI</h1>
              <p className="text-xs text-gray-400">Multi-AI Chat Platform</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Admin Panel Button - Only for admins */}
            {isAdmin && (
              <button
                onClick={() => setShowAdminPanel(true)}
                className="px-3 py-1.5 bg-gradient-to-br from-purple-600/10 to-pink-600/10 hover:from-purple-600/20 hover:to-pink-600/20 border border-purple-500/20 hover:border-purple-400/30 rounded-lg transition-all duration-200 shadow-sm flex items-center gap-2"
                title="Admin Panel"
              >
                <Shield className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-medium text-purple-300">Admin</span>
              </button>
            )}
            
            {/* API Cost Tracker - Only for rhroofer98 */}
            {user && (user.email === 'rhroofer98@gmail.com' || user.username === 'rhroofer98') && (
              <>
                <button
                  onClick={() => isAdmin ? setShowAnalytics(true) : null}
                  className={`px-3 py-1.5 bg-gradient-to-br from-blue-600/10 to-indigo-600/10 hover:from-blue-600/20 hover:to-indigo-600/20 border border-blue-500/20 hover:border-blue-400/30 rounded-lg transition-all duration-200 shadow-sm ${!isAdmin && 'cursor-default'}`}
                  title={isAdmin ? "Admin Analytics" : "API Cost Tracker"}
                >
                  <div className="flex items-center gap-2">
                    <div className="text-left">
                      <div className="text-xs text-blue-400/70 font-medium">API Cost</div>
                      <div className="text-sm font-bold text-blue-300">
                        ${Object.values(analytics.costs).reduce((a, b) => a + b, 0).toFixed(4)}
                      </div>
                    </div>
                    <div className="text-left border-l border-blue-500/20 pl-2">
                      <div className="text-xs text-blue-400/70">Queries</div>
                      <div className="text-xs font-semibold text-blue-300">{analytics.totalQueries}</div>
                    </div>
                  </div>
                </button>
                {isAdmin && (
                  <button
                    onClick={resetAnalytics}
                    className="p-1.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 hover:border-red-400/30 rounded-lg transition-all duration-200 shadow-sm"
                    title="Reset analytics"
                  >
                    <Trash2 className="w-3 h-3 text-red-400" />
                  </button>
                )}
              </>
            )}
            
            {/* User Account Button */}
            {user ? (
              <div className="flex items-center gap-2">
                {user.tier !== 'enterprise' && (
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="px-3 py-1.5 bg-gradient-to-r from-green-500 to-cyan-400 hover:from-green-600 hover:to-cyan-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg"
                  >
                    Upgrade
                  </button>
                )}
                <button
                  onClick={logout}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-600/20 to-red-700/20 hover:from-red-600/30 hover:to-red-700/30 border border-red-500/30 rounded-lg transition-all duration-200"
                  title="Logout"
                >
                  <User className="w-4 h-4 text-red-400" />
                  <span className="text-sm text-red-300 hidden md:inline">{user.username}</span>
                  <LogOut className="w-4 h-4 text-red-400" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthMode('login');
                  setShowAuthModal(true);
                }}
                className="px-4 py-2 bg-gradient-to-r from-green-500 to-cyan-400 hover:from-green-600 hover:to-cyan-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg"
              >
                Login
              </button>
            )}
          </div>
          {loading && (
            <button
              onClick={handleStopConversation}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all duration-200 shadow-lg animate-pulse flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Stop
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
          {messages.length === 0 && (
            <div className="text-center py-12 animate-in fade-in duration-500">
              <div className="bg-gradient-to-r from-green-500/10 to-cyan-400/10 rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center">
                <Bot className="w-12 h-12 text-green-400" />
              </div>
              <p className="text-gray-400 text-lg font-medium">Start a conversation with the AIs!</p>
              <p className="text-gray-500 text-sm mt-2">Ask anything or address a specific AI by name</p>
              <p className="text-gray-500 text-xs mt-4">💡 Click the menu icon to access settings and controls</p>
            </div>
          )}
          
          {messages.map((msg, index) => {
            if (msg.sender === 'user') {
              return (
                <div key={msg.id} className="flex justify-end animate-in slide-in-from-right duration-300" style={{animationDelay: `${index * 50}ms`}}>
                  <div className="bg-gradient-to-r from-green-500 to-cyan-400 text-white rounded-2xl px-4 py-3 max-w-2xl shadow-xl hover:shadow-2xl transition-shadow duration-200">
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-semibold text-sm">{user?.username || user?.email?.split('@')[0] || 'You'}</div>
                      <div className="text-xs opacity-75">{formatTime(msg.timestamp)}</div>
                    </div>
                    <div className="whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                    {msg.files && msg.files.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {msg.files.map((file, idx) => (
                          <div key={idx}>
                            {file.type.startsWith('image/') && file.preview && (
                              <img src={file.preview} alt={file.name} className="max-w-full rounded-lg border-2 border-white/20" />
                            )}
                            {file.type.startsWith('video/') && file.preview && (
                              <video src={file.preview} controls className="max-w-full rounded-lg border-2 border-white/20" />
                            )}
                            {!file.type.startsWith('image/') && !file.type.startsWith('video/') && (
                              <div className="bg-white/10 rounded p-2 text-xs flex items-center gap-2">
                                {getFileIcon(file)}
                                <span>{file.name}</span>
                                <span className="opacity-75">({formatFileSize(file.size)})</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            const config = AI_CONFIGS[msg.sender];
            
            // Extract image URLs from the text (handles bare URLs and markdown)
            const imageUrlRegex = /(https?:\/\/[^\s\)]+\.(jpg|jpeg|png|gif|webp|avif))/gi;
            const markdownImageRegex = /!\[([^\]]*)\]\((https?:\/\/[^\)]+\.(jpg|jpeg|png|gif|webp|avif))\)/gi;
            
            // Extract URLs from both formats
            let imageUrls = [];
            let textWithoutUrls = msg.text;
            
            // Extract markdown images first
            let markdownMatch;
            while ((markdownMatch = markdownImageRegex.exec(msg.text)) !== null) {
              imageUrls.push(markdownMatch[2]); // The URL is in capture group 2
              textWithoutUrls = textWithoutUrls.replace(markdownMatch[0], '');
            }
            
            // Extract bare URLs
            const bareUrls = msg.text.match(imageUrlRegex) || [];
            bareUrls.forEach(url => {
              if (!imageUrls.includes(url)) {
                imageUrls.push(url);
              }
            });
            
            // Remove all image URLs from text
            textWithoutUrls = textWithoutUrls.replace(imageUrlRegex, '').trim();
            
            return (
              <div key={msg.id} className="flex justify-start group animate-in slide-in-from-left duration-300" style={{animationDelay: `${index * 50}ms`}}>
                <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl px-4 py-3 max-w-2xl shadow-lg hover:shadow-xl hover:bg-gray-800/70 transition-all duration-200">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-semibold text-sm text-gray-200 flex items-center gap-2">
                      <span>{config.icon}</span>
                      <span>{config.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400">{formatTime(msg.timestamp)}</span>
                      <button
                        onClick={() => copyToClipboard(textWithoutUrls, msg.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-700 rounded"
                        title="Copy message"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-gray-400 hover:text-gray-200" />
                        )}
                      </button>
                    </div>
                  </div>
                  {(textWithoutUrls || msg.streaming) && (
                    <div>
                      {msg.streaming ? (
                        <div className="whitespace-pre-wrap text-gray-300 leading-relaxed">
                          {streamingMessages[msg.id] || textWithoutUrls || ''}
                          <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-1">|</span>
                        </div>
                      ) : (
                        renderMessageWithCode({ ...msg, text: textWithoutUrls })
                      )}
                    </div>
                  )}
                  {imageUrls.length > 0 && (
                    <div className="space-y-2 mt-3">
                      {imageUrls.map((url, index) => (
                        <div key={index} className="rounded-lg overflow-hidden border-2 border-gray-700 shadow-lg">
                          <img
                            src={url}
                            alt="Generated image"
                            className="max-w-full h-auto"
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.parentElement.innerHTML = '<p class="p-2 text-sm text-gray-400">Image failed to load</p>';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {currentlyTyping && (
            <div className="flex justify-start animate-in fade-in duration-300">
              <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-2xl px-4 py-3 flex items-center gap-2 shadow-lg">
                <span>{AI_CONFIGS[currentlyTyping].icon}</span>
                <span className="text-sm font-medium text-gray-300">
                  {AI_CONFIGS[currentlyTyping].name} is typing
                </span>
                <Loader2 className="w-4 h-4 animate-spin text-green-400" />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="bg-gray-800/95 backdrop-blur-sm border-t border-gray-700 p-4 shadow-2xl">
          <div className="max-w-4xl mx-auto">
            {/* File Previews */}
            {uploadedFiles.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="relative group">
                    {file.type.startsWith('image/') && file.preview ? (
                      <div className="relative">
                        <img
                          src={file.preview}
                          alt={file.name}
                          className="h-20 w-20 object-cover rounded-lg border-2 border-gray-600"
                        />
                        <button
                          onClick={() => removeFile(file.id)}
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="bg-gray-700 border border-gray-600 rounded-lg p-2 pr-8 flex items-center gap-2 text-sm text-gray-300">
                        {getFileIcon(file)}
                        <div className="max-w-32 truncate">
                          <div className="text-xs font-medium">{file.name}</div>
                          <div className="text-xs opacity-75">{formatFileSize(file.size)}</div>
                        </div>
                        <button
                          onClick={() => removeFile(file.id)}
                          className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Input Row */}
            <div className="flex gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                className="hidden"
                accept="*/*"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="bg-gray-700/50 hover:bg-gray-600 disabled:bg-gray-700 disabled:text-gray-500 text-gray-200 p-3 rounded-xl transition-all duration-200 border border-gray-600"
                title="Attach files"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              {isSpeaking ? (
                <button
                  onClick={stopSpeaking}
                  className="bg-red-600/80 hover:bg-red-600 text-white p-3 rounded-xl transition-all duration-200 border border-red-500 shadow-lg animate-pulse"
                  title="Stop speaking"
                >
                  <VolumeX className="w-5 h-5" />
                </button>
              ) : isListening ? (
                <button
                  onClick={stopListening}
                  className="bg-red-600/80 hover:bg-red-600 text-white p-3 rounded-xl transition-all duration-200 border border-red-500 shadow-lg animate-pulse"
                  title="Stop listening"
                >
                  <Mic className="w-5 h-5" />
                </button>
              ) : (
                <button
                  onClick={startListening}
                  disabled={loading}
                  className="bg-gradient-to-r from-orange-500/80 to-red-400/80 hover:from-orange-600 hover:to-red-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-500 text-white p-3 rounded-xl transition-all duration-200 border border-orange-400 shadow-lg"
                  title="Voice input"
                >
                  <Mic className="w-5 h-5" />
                </button>
              )}
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !loading && handleSend()}
                placeholder="Send a message to all AIs..."
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gray-700/50 border border-gray-600 text-gray-200 placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 backdrop-blur-sm"
              />
              <button
                onClick={handleSend}
                disabled={loading || (!input.trim() && uploadedFiles.length === 0)}
                className="bg-gradient-to-r from-green-500 to-cyan-400 hover:from-green-600 hover:to-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 shadow-lg hover:shadow-xl transition-all duration-200 disabled:shadow-none"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}