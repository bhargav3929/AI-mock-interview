'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Bot, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ChatInterface() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm your onboarding assistant. I'm here to get you set up for your mock interview. To start, could you please tell me your full name?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] })
      });

      const data = await response.json();

      if (data.redirectUrl) {
        // If the backend determines we're done and returns a link
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: `Great! I've collected everything. Click below to start your interview.`,
          actionLink: data.redirectUrl
        }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    // Add a temporary message
    setMessages(prev => [...prev, { role: 'user', content: `[Uploading ${file.name}...]` }]);

    try {
      // 1. Upload and OCR
      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      const uploadData = await uploadRes.json();

      if (uploadData.text) {
        // 2. Send extracted text to Chat context silently or explicitly
        const hiddenContent = `[User uploaded resume ${file.name}. Extracted content: ${uploadData.text}]`;

        // We replace the "Uploading..." message with a confirmation
        setMessages(prev => {
          const newMsgs = [...prev];
          newMsgs[newMsgs.length - 1] = { role: 'user', content: `Uploaded resume: ${file.name}` };
          return newMsgs;
        });

        setIsLoading(true);
        // 3. Trigger chat response
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, { role: 'user', content: hiddenContent }]
          })
        });
        const data = await response.json();

        if (data.redirectUrl) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: `Received your resume! I have everything now.`,
            actionLink: data.redirectUrl
          }]);
        } else {
          setMessages(prev => [...prev, { role: 'assistant', content: data.content }]);
        }

      } else {
        throw new Error('OCR failed');
      }

    } catch (error) {
      console.error('Upload error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Failed to process the file. Please try uploading again." }]);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="glass-container">
      <header className="chat-header">
        <Bot size={24} className="text-primary" />
        <div>
          <h1>Onboarding Assistant</h1>
          <div className="flex items-center gap-2">
            <div className="chat-status"></div>
            <span className="text-xs text-slate-300">Online</span>
          </div>
        </div>
      </header>

      <div className="chat-messages">
        <AnimatePresence>
          {messages.map((msg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`message ${msg.role === 'assistant' ? 'bot' : 'user'}`}
            >
              {msg.content}
              {msg.actionLink && (
                <div className="mt-4">
                  <a
                    href={msg.actionLink}
                    className="inline-block bg-accent hover:bg-sky-400 text-slate-900 font-bold py-2 px-4 rounded-lg transition-colors"
                  >
                    Start Interview →
                  </a>
                </div>
              )}
            </motion.div>
          ))}
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="message bot">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-area">
        <form
          className="input-wrapper"
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            accept=".pdf,.doc,.docx,image/*"
          />
          <button
            type="button"
            className="upload-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || isLoading}
            title="Upload Resume"
          >
            {isUploading ? <Loader2 className="animate-spin" size={20} /> : <Paperclip size={20} />}
          </button>

          <input
            type="text"
            className="chat-input"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
          />

          <button
            type="submit"
            className="send-btn"
            disabled={!input.trim() || isLoading}
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
