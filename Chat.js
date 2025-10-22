import React, { useState } from 'react';
import { Send, Bot, Loader2 } from 'lucide-react';

const AI_CONFIGS = {
  claude: {
    name: 'Claude',
    color: 'bg-amber-100 border-amber-300',
    icon: '🤖',
    textColor: 'text-amber-900'
  },
  chatgpt: {
    name: 'ChatGPT',
    color: 'bg-green-100 border-green-300',
    icon: '🟢',
    textColor: 'text-green-900'
  },
  gemini: {
    name: 'Gemini',
    color: 'bg-blue-100 border-blue-300',
    icon: '✨',
    textColor: 'text-blue-900'
  }
};

export default function AIGroupChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiKeys, setApiKeys] = useState({
    anthropic: '',
    openai: '',
    google: ''
  });
  const [showSettings, setShowSettings] = useState(true);

  const callClaude = async (conversationHistory) => {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKeys.anthropic,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        messages: conversationHistory
      })
    });
    const data = await response.json();
    return data.content[0].text;
  };

  const callChatGPT = async (conversationHistory) => {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKeys.openai}`
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: conversationHistory,
        max_tokens: 1024
      })
    });
    const data = await response.json();
    return data.choices[0].message.content;
  };

  const callGemini = async (conversationHistory) => {
    const formattedHistory = conversationHistory.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKeys.google}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: formattedHistory
        })
      }
    );
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  };

  const buildConversationHistory = (newUserMessage) => {
    const history = [];
    
    for (const msg of messages) {
      if (msg.sender === 'user') {
        history.push({ role: 'user', content: msg.text });
      } else {
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

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const keysComplete = apiKeys.anthropic && apiKeys.openai && apiKeys.google;
    if (!keysComplete) {
      alert('Please enter all API keys in settings first!');
      return;
    }

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = buildConversationHistory(input);
      
      const [claudeResponse, chatgptResponse, geminiResponse] = await Promise.all([
        callClaude(conversationHistory).catch(e => `Error: ${e.message}`),
        callChatGPT(conversationHistory).catch(e => `Error: ${e.message}`),
        callGemini(conversationHistory).catch(e => `Error: ${e.message}`)
      ]);

      const aiMessages = [
        {
          id: Date.now() + 1,
          sender: 'claude',
          text: claudeResponse,
          timestamp: new Date()
        },
        {
          id: Date.now() + 2,
          sender: 'chatgpt',
          text: chatgptResponse,
          timestamp: new Date()
        },
        {
          id: Date.now() + 3,
          sender: 'gemini',
          text: geminiResponse,
          timestamp: new Date()
        }
      ];

      setMessages(prev => [...prev, ...aiMessages]);
    } catch (error) {
      console.error('Error:', error);
      alert('Error getting responses. Check console and API keys.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">AI Group Chat</h1>
          <p className="text-sm text-gray-600">Claude, ChatGPT & Gemini in conversation</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
        >
          {showSettings ? 'Hide' : 'Show'} Settings
        </button>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-4">
          <h3 className="font-semibold mb-3 text-gray-800">API Keys Required</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Anthropic API Key
              </label>
              <input
                type="password"
                placeholder="sk-ant-..."
                value={apiKeys.anthropic}
                onChange={(e) => setApiKeys(prev => ({ ...prev, anthropic: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                OpenAI API Key
              </label>
              <input
                type="password"
                placeholder="sk-..."
                value={apiKeys.openai}
                onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Google API Key
              </label>
              <input
                type="password"
                placeholder="AIza..."
                value={apiKeys.google}
                onChange={(e) => setApiKeys(prev => ({ ...prev, google: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <Bot className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Start a conversation with all three AIs!</p>
          </div>
        )}
        
        {messages.map((msg) => {
          if (msg.sender === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="bg-gray-800 text-white rounded-lg px-4 py-3 max-w-2xl">
                  <div className="font-semibold text-sm mb-1">You</div>
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>
              </div>
            );
          }

          const config = AI_CONFIGS[msg.sender];
          return (
            <div key={msg.id} className="flex justify-start">
              <div className={`${config.color} border-2 rounded-lg px-4 py-3 max-w-2xl`}>
                <div className={`font-semibold text-sm mb-1 ${config.textColor} flex items-center gap-2`}>
                  <span>{config.icon}</span>
                  {config.name}
                </div>
                <div className="whitespace-pre-wrap text-gray-800">{msg.text}</div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex justify-center">
            <div className="bg-gray-100 rounded-lg px-6 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-gray-600">AIs are thinking...</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex gap-2 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !loading && handleSend()}
            placeholder="Send a message to all AIs..."
            disabled={loading}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}