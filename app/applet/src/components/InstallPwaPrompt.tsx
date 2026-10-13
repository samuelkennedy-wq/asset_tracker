import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import CompanyLogo from './CompanyLogo';

export default function InstallPwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already in standalone mode (already installed)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstallPrompt = (e: any) => {
      // Prevent automatic browser mini-infobar
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user previously dismissed prompt in this session
      const dismissed = sessionStorage.getItem('pwa_prompt_dismissed');
      if (!dismissed) {
        setIsVisible(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsVisible(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Show fallback instructions for Android Chrome / Samsung Internet
      alert("To install on your Android device:\n\n1. Tap the Chrome menu (⋮) in the top right.\n2. Tap 'Install app' or 'Add to Home screen'.\n\nThe app will be added directly to your phone's app launcher!");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (isInstalled || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 bg-slate-950 text-white border border-slate-800 rounded-2xl p-4 shadow-2xl shadow-black/80 flex items-start gap-3.5 backdrop-blur-md">
      <CompanyLogo size="md" />
      
      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs text-white flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-blue-400" />
            <span>Install on Android Mobile</span>
          </span>
          <button
            onClick={handleDismiss}
            className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[11px] text-slate-400 leading-tight">
          Install as a native full-screen app for instant barcode camera scanning and offline gate pass lookup.
        </p>

        <div className="pt-2 flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-600/30 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Install App</span>
          </button>
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold rounded-xl text-xs transition-all cursor-pointer"
          >
            Later
          </button>
        </div>
      </div>
    </div>
  );
}
