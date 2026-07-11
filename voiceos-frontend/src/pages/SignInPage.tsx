import React from 'react';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-6">
      <div className="w-full max-w-md">
<div className="w-full max-w-[440px] z-10">
{/* Identity Header */}
<header className="text-center mb-xxl">
<div className="inline-flex items-center justify-center mb-md">
<span className="material-symbols-outlined text-primary text-[48px] mr-xs" style={{"fontVariationSettings":"'FILL' 1"}}>settings_voice</span>
<h1 className="font-headline-md text-headline-md font-extrabold tracking-tight text-on-surface">VoiceOS</h1>
</div>
<p className="font-body-md text-body-md text-on-surface-variant">Intelligent Enterprise Governance</p>
</header>
{/* Login Container */}
<div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-xl login-card">
<form className="space-y-lg">
{/* Field: Business Email */}
<div>
<label className="block font-label-md text-label-md text-on-surface-variant mb-xs" htmlFor="email">Business Email</label>
<input className="w-full h-[48px] px-md rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body-md text-body-md" id="email" name="email" placeholder="name@company.com" type="email"/>
</div>
{/* Field: Password */}
<div>
<div className="flex justify-between items-center mb-xs">
<label className="block font-label-md text-label-md text-on-surface-variant" htmlFor="password">Password</label>
<a className="font-label-sm text-label-sm text-primary hover:underline transition-all" href="#">Forgot password?</a>
</div>
<div className="relative">
<input className="w-full h-[48px] px-md rounded-lg border border-outline-variant bg-surface focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-body-md text-body-md" id="password" name="password" placeholder="••••••••" type="password"/>
<button className="absolute right-md top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors" type="button">
<span className="material-symbols-outlined text-[20px]">visibility</span>
</button>
</div>
</div>
{/* Primary CTA */}
<button className="w-full h-[48px] bg-primary text-on-primary font-label-md text-label-md rounded-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-sm" type="submit">
                    Sign In
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
</button>
{/* Divider */}
<div className="relative flex items-center py-md">
<div className="flex-grow border-t border-outline-variant"></div>
<span className="flex-shrink mx-md font-label-sm text-label-sm text-outline uppercase tracking-widest">or continue with</span>
<div className="flex-grow border-t border-outline-variant"></div>
</div>
{/* SSO Options */}
<div className="grid grid-cols-2 gap-md">
{/* Microsoft SSO */}
<button className="flex items-center justify-center gap-sm h-[48px] border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors font-label-md text-label-md text-on-surface-variant" type="button">
<svg className="w-5 h-5" fill="none" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
<path d="M10.8333 0H0V10.8333H10.8333V0Z" fill="#F25022"></path>
<path d="M22.6667 0H11.8334V10.8333H22.6667V0Z" fill="#7FBA00"></path>
<path d="M10.8333 11.8333H0V22.6666H10.8333V11.8333Z" fill="#00A4EF"></path>
<path d="M22.6667 11.8333H11.8334V22.6666H22.6667V11.8333Z" fill="#FFB900"></path>
</svg>
                        Azure
                    </button>
{/* Okta SSO */}
<button className="flex items-center justify-center gap-sm h-[48px] border border-outline-variant rounded-lg hover:bg-surface-container-low transition-colors font-label-md text-label-md text-on-surface-variant" type="button">
<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
<path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 18.5a6.5 6.5 0 110-13 6.5 6.5 0 010 13z" fill="#007DC1"></path>
</svg>
                        Okta
                    </button>
</div>
</form>
</div>
{/* Footer / Support */}
<footer className="mt-xxl text-center">
{/* Security Badges */}
<div className="flex items-center justify-center gap-xl mb-lg grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all">
<div className="flex items-center gap-xs security-badge-pulse">
<span className="material-symbols-outlined text-outline text-[20px]">verified_user</span>
<span className="font-label-sm text-label-sm text-outline tracking-tight">SOC2 TYPE II</span>
</div>
<div className="flex items-center gap-xs security-badge-pulse">
<span className="material-symbols-outlined text-outline text-[20px]">gavel</span>
<span className="font-label-sm text-label-sm text-outline tracking-tight">GDPR COMPLIANT</span>
</div>
<div className="flex items-center gap-xs security-badge-pulse">
<span className="material-symbols-outlined text-outline text-[20px]">lock</span>
<span className="font-label-sm text-label-sm text-outline tracking-tight">ISO 27001</span>
</div>
</div>
<p className="font-body-sm text-body-sm text-on-surface-variant">
                Protected by enterprise-grade encryption. 
                <a className="text-primary hover:underline ml-xs" href="#">Security Whitepaper</a>
</p>
</footer>
</div>
    </div>
    </div>
  );
}


