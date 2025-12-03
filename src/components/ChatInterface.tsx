import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, User, Bot } from 'lucide-react';
import type { ChatMessage } from '../types';
import { sendMessageToGemini } from '../services/geminiServiceRest';

interface ChatInterfaceProps {
    messages: ChatMessage[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

// Helper function to parse markdown bold syntax (**text**)
const formatMessageText = (text: string) => {
    const parts = text.split(/\*\*/);

    return parts.map((part, index) => {
        // Even indices are normal text, odd indices are bold
        if (index % 2 === 0) {
            return <React.Fragment key={index}>{part}</React.Fragment>;
        } else {
            return <strong key={index}>{part}</strong>;
        }
    });
};

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, setMessages }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState('');
    const [isThinking, setIsThinking] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isOpen, isThinking]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!inputValue.trim()) return;

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            text: inputValue,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMsg]);
        setInputValue('');
        setIsThinking(true);

        try {
            const responseText = await sendMessageToGemini(userMsg.text);

            const botMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: responseText,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMsg]);
        } catch (error) {
            console.error(error);
        } finally {
            setIsThinking(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSend();
        }
    };

    return (
        <>
            {/* Floating Action Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-110 flex items-center justify-center ${isOpen ? 'bg-red-500 rotate-90' : 'bg-nebula-500 hover:bg-nebula-400'
                    }`}
            >
                {isOpen ? <X size={24} color="white" /> : <MessageSquare size={24} color="white" />}
            </button>

            {/* Chat Window */}
            <div
                className={`fixed bottom-24 right-6 w-96 max-w-[calc(100vw-3rem)] h-[600px] max-h-[70vh] bg-nebula-900/95 backdrop-blur-xl border border-nebula-700 rounded-3xl shadow-2xl z-40 flex flex-col transition-all duration-300 origin-bottom-right overflow-hidden ${isOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-10 pointer-events-none'
                    }`}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-nebula-800 to-nebula-900 p-4 border-b border-nebula-700 flex items-center gap-3">
                    <div className="p-2 bg-nebula-500/20 rounded-full border border-nebula-500/30">
                        <Sparkles size={20} className="text-nebula-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Chaika </h3>
                        <p className="text-xs text-nebula-400 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Online
                        </p>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-black/20">
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`flex max-w-[85%] gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>

                                {/* Avatar */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-nebula-700 text-gray-300' : 'bg-nebula-500 text-white'
                                    }`}>
                                    {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                                </div>

                                {/* Bubble */}
                                <div
                                    className={`p-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${msg.role === 'user'
                                            ? 'bg-nebula-600 text-white rounded-tr-sm'
                                            : 'bg-nebula-800 text-gray-200 border border-nebula-700 rounded-tl-sm'
                                        }`}
                                >
                                    {formatMessageText(msg.text)}
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Thinking Indicator */}
                    {isThinking && (
                        <div className="flex justify-start w-full">
                            <div className="flex gap-2 max-w-[85%]">
                                <div className="w-8 h-8 rounded-full bg-nebula-500 text-white flex items-center justify-center flex-shrink-0">
                                    <Bot size={14} />
                                </div>
                                <div className="bg-nebula-800 border border-nebula-700 p-4 rounded-2xl rounded-tl-sm flex items-center gap-1">
                                    <div className="w-2 h-2 bg-nebula-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-nebula-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-nebula-400 rounded-full animate-bounce"></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-nebula-900 border-t border-nebula-700">
                    <div className="relative">
                        <input
                            ref={inputRef}
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Ask about our cars..."
                            className="w-full bg-nebula-800 text-white pl-4 pr-12 py-3 rounded-xl border border-nebula-700 focus:outline-none focus:border-nebula-500 focus:ring-1 focus:ring-nebula-500 placeholder-gray-500 transition-all"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!inputValue.trim() || isThinking}
                            className="absolute right-2 top-2 p-1.5 bg-nebula-500 rounded-lg text-white hover:bg-nebula-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ChatInterface;