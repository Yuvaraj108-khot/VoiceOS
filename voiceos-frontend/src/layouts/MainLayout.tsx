import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { PhoneDialerModal } from '../components/PhoneDialerModal';

export default function MainLayout() {
  const location = useLocation();
  const [isDialerOpen, setIsDialerOpen] = useState(false);

  // Streamlined primary navigation links
  const navLinks = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/ai-employees', label: 'AI Employees' },
    { path: '/live-call-center', label: 'Live Call Center' },
    { path: '/workflow-builder', label: 'Workflows' },
    { path: '/analytics', label: 'Analytics' },
    { path: '/settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 w-full z-40 px-lg h-xxl bg-surface border-b border-outline-variant transition-colors duration-150 ease-linear shadow-xs">
        <div className="flex justify-between items-center w-full h-full relative">
          
          <Link to="/dashboard" className="font-headline-md text-headline-md font-bold tracking-tight text-on-surface hover:text-primary transition-colors whitespace-nowrap z-10 flex items-center gap-xs">
            <span className="material-symbols-outlined text-primary text-[28px]">graphic_eq</span>
            <span>VoiceOS</span>
          </Link>
          
          {/* Centered Horizontal Navigation */}
          <nav className="hidden lg:flex absolute inset-0 items-center justify-center pointer-events-none">
            <div className="flex items-center gap-sm pointer-events-auto">
              {navLinks.map((link) => {
                const isActive = location.pathname.startsWith(link.path);
                return (
                  <Link 
                    key={link.path}
                    to={link.path} 
                    className={`font-label-sm text-label-sm whitespace-nowrap transition-all duration-200 px-3.5 py-1.5 rounded-full ${
                      isActive 
                        ? 'bg-primary-container text-on-primary-container font-bold shadow-xs' 
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </nav>
          
          <div className="flex items-center gap-sm shrink-0 z-10">
            {/* Make Call Primary Action Button */}
            <button 
              onClick={() => setIsDialerOpen(true)}
              className="flex items-center gap-xs px-md py-sm bg-primary text-on-primary rounded-xl font-label-md text-label-md font-bold hover:brightness-110 active:scale-95 transition-all shadow-sm"
              title="Open Phone Dialer"
            >
              <span className="material-symbols-outlined text-[18px]">call</span>
              <span className="hidden sm:inline">Make Call</span>
            </button>

            <Link to="/notifications" className="material-symbols-outlined text-on-surface-variant hover:text-primary hover:bg-surface-container p-xs rounded-xl transition-colors">
              notifications
            </Link>
            
            <div className="w-9 h-9 rounded-full border border-outline-variant overflow-hidden">
              <img 
                className="w-full h-full object-cover" 
                alt="Profile" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBfulTmp4pz_jpQPMy4-BT0O2yJYR2J3x-jsurPoDiSy5jKeN_qGEoCTUbkR6zlR4x8QNGsUHCPsT6jpHSv-TlxHF8zSGBvTm6mkmmClqaDrGhwdBMZ4l2em2wcT3pbr2nFrTSFwEGk6LS024ZzMRj34bkHgN7cVSW0NBVIcoDOgRZgdLGZGWfAxjPSVoVPN_mg4WI27LxKG7OEArEFGIRfshaQSyLhxzhaARTfCHgb2KFyfp3XIce6kQ" 
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="pt-xxxl pb-xxxl px-md md:px-xxl max-w-[1440px] mx-auto mt-xxl relative z-10">
        <Outlet />
      </main>

      {/* Global Phone Dialer Modal */}
      <PhoneDialerModal
        isOpen={isDialerOpen}
        onClose={() => setIsDialerOpen(false)}
      />
    </div>
  );
}

