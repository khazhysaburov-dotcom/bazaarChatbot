import React, { useEffect, useState } from 'react';
import type { Car, ChatMessage } from './types';
import { AVAILABLE_CARS } from './services/listOfCars';
import { initializeChat } from './services/geminiService';
import CarCard from './components/CarCard';
import ChatInterface from './components/ChatInterface';
import { CarFront, Search } from 'lucide-react';

const App: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Initialize Chat Session with context on mount
  useEffect(() => {
    initializeChat(AVAILABLE_CARS);
    
    // Add initial greeting from AI
    setMessages([
      {
        id: 'init',
        role: 'model',
        text: "Welcome to EPAM Auto Bazaar! 🌌 I'm Chaika, your AI assistant. Whether you're looking for a family SUV or a weekend sports car, I can help you find the perfect match from our inventory. What are you looking for today?",
        timestamp: new Date()
      }
    ]);
  }, []);

  // Filter cars based on search
  const filteredCars = AVAILABLE_CARS.filter((car: Car) => 
    car.make.toLowerCase().includes(searchTerm.toLowerCase()) || 
    car.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    car.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-nebula-900 via-slate-950 to-slate-950">
      
      {/* Header */}
      <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-nebula-500 rounded-xl flex items-center justify-center shadow-lg shadow-nebula-500/30">
              <CarFront className="text-white" size={24} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-gray-400 bg-clip-text text-white">
              MAPE <span className="text-nebula-500">Auto</span>
            </h1>
          </div>

          <div className="hidden md:flex relative w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search make, model, or type..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-nebula-500 focus:bg-white/10 transition-all"
            />
          </div>

          <div className="flex items-center gap-4">
             <button className="text-sm font-medium text-gray-400 hover:text-white transition-colors">Sign In</button>
             <button className="bg-white text-slate-950 px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-200 transition-colors">Sell Your Car</button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="container mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
            Find Your Dream Ride <br/>
            <span className="text-nebula-400">Powered by Intelligence</span>
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10">
            Browse our curated selection of premium vehicles. Not sure what you want? 
            Ask Chaika, our AI assistant, to analyze your needs and recommend the perfect match.
          </p>
        </div>
        
        {/* Decorative Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-nebula-500/20 rounded-full blur-[120px] -z-10"></div>
      </section>

      {/* Inventory Grid */}
      <main className="container mx-auto px-4 pb-24">
        <div className="flex items-center justify-between mb-8">
            <h3 className="text-2xl font-bold flex items-center gap-2">
                Available Vehicles
                <span className="text-sm font-normal text-gray-500 bg-white/5 px-2 py-1 rounded-md">
                    {filteredCars.length}
                </span>
            </h3>
        </div>

        {filteredCars.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredCars.map(car => (
                <CarCard key={car.id} car={car} />
            ))}
            </div>
        ) : (
            <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                <p className="text-gray-400 text-lg">No vehicles found matching "{searchTerm}"</p>
                <button 
                    onClick={() => setSearchTerm('')}
                    className="mt-4 text-nebula-400 hover:text-nebula-300 underline"
                >
                    Clear Search
                </button>
            </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-white/5 py-12">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
            <p>&copy; {new Date().getFullYear()} Nebula Auto Bazaar. All rights reserved.</p>
            <p className="mt-2">Powered by Gemini 2.5 Flash API</p>
        </div>
      </footer>

      {/* Chat Bot Interface */}
      <ChatInterface messages={messages} setMessages={setMessages} />
    </div>
  );
};

export default App;