import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';

export default function MainLayout() {
  const location = useLocation();

  const navLinks = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/ai-employees', label: 'AI Employees' },
    { path: '/create-employee', label: 'Create Employee' },
    { path: '/live-call-center', label: 'Live Call Center' },
    { path: '/workflow-builder', label: 'Workflow Builder' },
    { path: '/knowledge-center', label: 'Knowledge' },
    { path: '/analytics', label: 'Analytics' },
    { path: '/notifications', label: 'Notifications' },
    { path: '/search', label: 'Search' },
    { path: '/settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 w-full z-50 px-lg h-xxl bg-surface border-b border-outline-variant transition-colors duration-150 ease-linear">
        <div className="flex justify-between items-center w-full h-full relative">
          
          <Link to="/dashboard" className="font-headline-md text-headline-md font-bold tracking-tight text-on-surface hover:text-primary transition-colors whitespace-nowrap z-10">
            VoiceOS
          </Link>
          
          {/* Centered Horizontal Navigation */}
          <nav className="hidden xl:flex absolute inset-0 items-center justify-center pointer-events-none">
            <div className="flex items-center gap-md pointer-events-auto">
              {navLinks.map((link) => {
                const isActive = location.pathname.startsWith(link.path);
                return (
                  <Link 
                    key={link.path}
                    to={link.path} 
                    className={`font-label-sm text-label-sm whitespace-nowrap transition-all duration-200 px-3 py-1.5 rounded-full ${
                      isActive 
                        ? 'bg-primary-container text-on-primary-container font-bold shadow-sm' 
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-primary'
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </nav>
          
          <div className="flex items-center gap-md shrink-0 z-10">
            <button className="material-symbols-outlined text-primary hover:bg-surface-container-low p-xs rounded-xl transition-colors">search</button>
            
            <div className="w-10 h-10 rounded-full border border-outline-variant overflow-hidden">
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
    </div>
  );
}
