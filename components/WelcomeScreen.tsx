
import React, { useState } from 'react';
import { UserRole } from '../types';

interface WelcomeScreenProps {
  onSelectRole: (role: UserRole) => void;
  onEnterPrototype: (role: UserRole) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectRole, onEnterPrototype }) => {
  const [showProtoOptions, setShowProtoOptions] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] p-8 text-center relative">
      <div className="mb-10">
        <div className="w-24 h-24 bg-orange-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-orange-100 transform rotate-3 hover:rotate-0 transition-transform duration-500">
          <svg viewBox="0 0 100 100" className="w-14 h-14 text-white fill-current">
            <path d="M50 15 L85 30 L85 70 L50 85 L15 70 L15 30 Z" />
            <path d="M30 40 L50 25 L70 40 L50 55 Z" className="fill-orange-200" />
            <rect x="45" y="45" width="10" height="30" rx="5" className="fill-white" />
          </svg>
        </div>
        <h1 className="text-5xl font-black text-gray-900 mb-2 tracking-tight">Bricola</h1>
        <p className="text-gray-500 font-bold uppercase tracking-widest text-[10px] opacity-60">Tunisia's #1 Service Platform</p>
      </div>

      <div className="w-full space-y-4 mb-4">
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-2">من أنت؟</p>
        
        <button
          onClick={() => onSelectRole(UserRole.CLIENT)}
          className="w-full py-5 bg-white border-2 border-orange-500 text-orange-500 rounded-2xl font-bold text-lg hover:bg-orange-50 transition-all flex items-center justify-center gap-3 shadow-sm active:scale-95"
        >
          <span>👤 أنا حريف (أبحث عن فني)</span>
        </button>

        <button
          onClick={() => onSelectRole(UserRole.TECHNICIAN)}
          className="w-full py-5 bg-orange-500 text-white rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all flex items-center justify-center gap-3 shadow-lg active:scale-95"
        >
          <span>🛠️ أنا فني (أعرض خدماتي)</span>
        </button>
      </div>

      <div className="w-full mb-8">
        {!showProtoOptions ? (
          <button
            onClick={() => setShowProtoOptions(true)}
            className="w-full py-3 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all active:scale-95"
          >
            <span>🔍 تجربة التطبيق (See Prototype)</span>
          </button>
        ) : (
          <div className="flex gap-2 animate-fade-in">
            <button
              onClick={() => onEnterPrototype(UserRole.CLIENT)}
              className="flex-1 py-3 bg-slate-800 text-white rounded-2xl font-bold text-xs hover:bg-slate-900 transition-all active:scale-95"
            >
               تجربة (حريف)
            </button>
            <button
              onClick={() => onEnterPrototype(UserRole.TECHNICIAN)}
              className="flex-1 py-3 bg-slate-800 text-white rounded-2xl font-bold text-xs hover:bg-slate-900 transition-all active:scale-95"
            >
               تجربة (فني)
            </button>
            <button
              onClick={() => setShowProtoOptions(false)}
              className="w-10 bg-slate-200 text-slate-500 rounded-2xl flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      <button
        onClick={() => onSelectRole(UserRole.ADMIN)}
        className="text-xs text-gray-400 underline hover:text-gray-600"
      >
        دخول الإدارة (Admin Access)
      </button>
    </div>
  );
};
