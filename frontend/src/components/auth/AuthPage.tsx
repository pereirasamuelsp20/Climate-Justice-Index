import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { AlertCircle, ArrowRight, Eye, EyeOff, Mail, CheckCircle2, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserStore } from '../../store/useUserStore';

/* ─── Storm ambient audio (local file) ─── */
function StormAudio({ videoRef }: { videoRef: any }) {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    const video = videoRef.current;
    if (!audio) return;

    // Detect mobile — audio-video sync causes crackling on mobile browsers
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Lower volume on mobile to prevent distortion from small speakers
    audio.volume = isMobile ? 0.2 : 0.4;
    
    const tryPlay = () => {
      audio.play().catch(() => {});
    };

    // Try autoplay immediately
    tryPlay();
    
    // Mobile browsers require user gesture for audio — listen for touch too
    const handleInteraction = () => {
      tryPlay();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);

    // Only sync audio to video on desktop — mobile sync causes crackling/skipping
    let syncCleanup: (() => void) | null = null;
    if (!isMobile && video) {
      const syncAudio = () => {
        if (audio && !audio.paused && video) {
          // Use larger threshold to avoid constant micro-seeks
          if (Math.abs(video.currentTime - audio.currentTime) > 0.5) {
            audio.currentTime = video.currentTime;
          }
        }
      };
      video.addEventListener('seeked', syncAudio);
      video.addEventListener('play', tryPlay);
      syncCleanup = () => {
        video.removeEventListener('seeked', syncAudio);
        video.removeEventListener('play', tryPlay);
      };
    }

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
      if (syncCleanup) syncCleanup();
      if (audio) { audio.pause(); audio.currentTime = 0; }
    };
  }, [videoRef]);

  return (
    <audio
      ref={audioRef}
      loop
      preload="auto"
      src="/audio/storm_loop.mp3"
    />
  );
}

/* ─── Email Verification Success Screen ─── */
function EmailSentScreen({ email, name }: { email: string; name: string }) {
  const displayName = name || 'there';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, filter: 'blur(12px)' }}
      animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-10 w-full max-w-[440px] mx-4"
    >
      <div
        className="rounded-2xl p-10 shadow-2xl text-center"
        style={{
          background: 'rgba(5, 8, 14, 0.6)',
          backdropFilter: 'blur(30px) saturate(1.3)',
          WebkitBackdropFilter: 'blur(30px) saturate(1.3)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 30px 70px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset',
        }}
      >
        {/* Animated sparkle icon */}
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200, damping: 15 }}
          className="mx-auto mb-6 w-20 h-20 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(6,182,212,0.15))',
            border: '1px solid rgba(59,130,246,0.2)',
          }}
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
          >
            <Mail className="w-9 h-9 text-blue-400" />
          </motion.div>
        </motion.div>

        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
            Welcome aboard, {displayName}! ✨
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            We're thrilled to have you join the Climate Justice community. Your voice matters in the fight for climate equity.
          </p>
        </motion.div>

        {/* Email verification card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.5 }}
          className="rounded-xl p-5 mb-6 text-left"
          style={{
            background: 'rgba(59, 130, 246, 0.06)',
            border: '1px solid rgba(59, 130, 246, 0.12)',
          }}
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-blue-300 mb-1">
                Verification email sent
              </p>
              <p className="text-[12px] text-slate-400 leading-relaxed">
                We've sent a confirmation link to{' '}
                <span className="text-blue-300 font-medium">{email}</span>.
                Click the link in your email to activate your account and unlock the full dashboard.
              </p>
            </div>
          </div>
        </motion.div>

        {/* Steps */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9, duration: 0.5 }}
          className="space-y-3 mb-6"
        >
          {[
            { step: '1', text: 'Check your inbox (and spam folder)' },
            { step: '2', text: 'Click the confirmation link' },
            { step: '3', text: 'Return here and sign in' },
          ].map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 + i * 0.15 }}
              className="flex items-center gap-3"
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                style={{
                  background: 'rgba(59,130,246,0.12)',
                  color: '#60a5fa',
                  border: '1px solid rgba(59,130,246,0.15)',
                }}
              >
                {item.step}
              </div>
              <span className="text-[13px] text-slate-400">{item.text}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Special welcome message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="rounded-xl p-4 mb-6"
          style={{
            background: 'linear-gradient(135deg, rgba(59,130,246,0.05), rgba(139,92,246,0.05))',
            border: '1px solid rgba(139,92,246,0.1)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-[11px] font-semibold text-violet-300 uppercase tracking-wider">
              A personal note
            </span>
          </div>
          <p className="text-[12px] text-slate-400 leading-relaxed italic">
            "Every data point we track represents a real community affected by climate change.
            By joining, you're not just viewing data — you're becoming an advocate for those
            whose stories the world too often forgets. Thank you, {displayName}."
          </p>
          <p className="text-[11px] text-slate-500 mt-2">
            — The Climate Justice Team
          </p>
        </motion.div>

        {/* Animated dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8 }}
          className="flex items-center justify-center gap-1"
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-blue-500/40"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.2 }}
            />
          ))}
          <span className="text-[11px] text-slate-600 ml-2">Awaiting verification</span>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─── Main Auth Page ─── */
export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const setSession = useUserStore((state) => state.setSession);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Fire verification + welcome email via backend
  const sendWelcomeEmail = async (userEmail: string, userName: string) => {
    try {
      const res = await fetch('/api/v1/auth/welcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, name: userName }),
      });
      if (!res.ok) {
        console.error('Welcome email failed:', await res.text());
      }
    } catch (err) {
      console.error('Welcome email request failed:', err);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: `${window.location.origin}`,
          },
        });
        if (error) throw error;

        if (data.session) {
          // Auto-confirmed — proceed immediately
          localStorage.setItem('supabase-auth-token', data.session.access_token);
          setSession(data.session);
          sendWelcomeEmail(email, name);
        } else if (data.user && !data.session) {
          // Email confirmation required — show beautiful check-email screen
          sendWelcomeEmail(email, name);
          setEmailSent(true);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.session) {
          localStorage.setItem('supabase-auth-token', data.session.access_token);
          setSession(data.session);
        }
      }
    } catch (err: any) {
      const msg = err.message || '';
      const code = err.code || err.error_code || '';
      if (code === 'email_address_invalid' || msg.includes('email')) {
        setError('Please enter a valid email address.');
      } else if (msg.includes('Password') || msg.includes('password')) {
        setError('Password must be at least 6 characters long.');
      } else if (code === 'user_already_exists' || msg.includes('already registered')) {
        setError('This email is already registered. Try logging in instead.');
      } else if (msg.includes('Invalid login credentials')) {
        setError('Incorrect email or password. Please try again.');
      } else if (msg.includes('Email not confirmed')) {
        setError('Please check your email and confirm your account first.');
      } else {
        setError(msg || 'An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden flex items-center justify-center bg-[#030508]">
      {/* ─── Storm Audio ─── */}
      <StormAudio videoRef={videoRef} />

      {/* ─── Fullscreen storm video background ─── */}
      <video
        ref={videoRef}
        className={`absolute inset-0 w-full h-full object-cover storm-video-bg transition-opacity duration-2000 ${videoLoaded ? 'opacity-100' : 'opacity-0'}`}
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        onCanPlayThrough={() => setVideoLoaded(true)}
        src="/storm_loop.mp4"
      />

      {/* ─── Dark vignette overlays for depth + readability ─── */}
      <div className="absolute inset-0 z-1" style={{
        background: `
          radial-gradient(ellipse 70% 70% at 50% 50%, transparent 20%, rgba(3,5,8,0.55) 100%),
          linear-gradient(to top, rgba(3,5,8,0.7) 0%, transparent 40%),
          linear-gradient(to bottom, rgba(3,5,8,0.5) 0%, transparent 30%)
        `,
      }} />

      {/* ─── Subtle blue storm glow on horizon ─── */}
      <div
        className="absolute bottom-0 left-0 w-full h-[200px] z-2 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 100% at 50% 100%, rgba(56,130,220,0.06) 0%, transparent 70%)',
          animation: 'storm-pulse 5s ease-in-out infinite',
        }}
      />

      {/* ─── CONTENT ─── */}
      <AnimatePresence mode="wait">
        {emailSent ? (
          <EmailSentScreen key="email-sent" email={email} name={name} />
        ) : (
          <motion.div
            key={isSignUp ? 'signup' : 'login'}
            initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -20, filter: 'blur(6px)' }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-[400px] mx-4"
          >
            <div className="rounded-2xl p-8 shadow-2xl"
              style={{
                background: 'rgba(5, 8, 14, 0.55)',
                backdropFilter: 'blur(30px) saturate(1.3)',
                WebkitBackdropFilter: 'blur(30px) saturate(1.3)',
                border: '1px solid rgba(255, 255, 255, 0.07)',
                boxShadow: '0 25px 60px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03) inset',
              }}
            >
              {/* Title */}
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-5">
                  <img src="/animated_logo.svg" alt="Logo" className="h-12 w-12 object-contain" />
                  <div>
                    <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-slate-500 block leading-none">
                      Climate Justice
                    </span>
                    <span className="text-[11px] font-medium tracking-[0.15em] uppercase text-slate-600 block mt-0.5">
                      Index
                    </span>
                  </div>
                </div>
                <h1 className="text-[26px] font-bold tracking-tight text-white leading-tight">
                  {isSignUp ? 'Join the Movement' : 'Welcome Back'}
                </h1>
                <p className="text-[13px] text-slate-400 mt-2 leading-relaxed">
                  {isSignUp
                    ? 'Create your account and start making a difference.'
                    : 'The storm rages on. Sign in to take action.'}
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleAuth} className="space-y-4" id="auth-form">
                <AnimatePresence>
                  {isSignUp && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="space-y-1.5 mb-4">
                        <label htmlFor="auth-name" className="text-[12px] font-medium text-slate-400 block">Name</label>
                        <input
                          id="auth-name"
                          required={isSignUp}
                          type="text"
                          placeholder="Your full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full rounded-xl p-3 text-sm outline-none transition-all text-white placeholder-slate-600"
                          style={{
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.07)',
                          }}
                          onFocus={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(96,165,250,0.4)';
                            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(96,165,250,0.08)';
                          }}
                          onBlur={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-1.5">
                  <label htmlFor="auth-email" className="text-[12px] font-medium text-slate-400 block">Email</label>
                  <input
                    id="auth-email"
                    required
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-xl p-3 text-sm outline-none transition-all text-white placeholder-slate-600"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(96,165,250,0.4)';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(96,165,250,0.08)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="auth-password" className="text-[12px] font-medium text-slate-400 block">Password</label>
                  <div className="relative">
                    <input
                      id="auth-password"
                      required
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl p-3 pr-11 text-sm outline-none transition-all text-white placeholder-slate-600"
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.07)',
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(96,165,250,0.4)';
                        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(96,165,250,0.08)';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-xl text-sm flex items-start gap-2.5"
                    style={{
                      background: 'rgba(239,68,68,0.08)',
                      border: '1px solid rgba(239,68,68,0.15)',
                      color: '#fca5a5',
                    }}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </motion.div>
                )}

                <button
                  id="auth-submit"
                  type="submit"
                  disabled={loading}
                  className={`w-full rounded-xl py-3.5 flex justify-between items-center px-5 mt-6 font-semibold text-[15px] transition-all duration-300 group cursor-pointer
                    ${loading ? 'opacity-60 cursor-not-allowed' : 'active:scale-[0.98]'}`}
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                    color: '#fff',
                    boxShadow: '0 8px 25px -5px rgba(59,130,246,0.3), 0 0 0 1px rgba(59,130,246,0.1) inset',
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #60a5fa, #3b82f6)';
                      e.currentTarget.style.boxShadow = '0 12px 30px -5px rgba(59,130,246,0.4), 0 0 0 1px rgba(96,165,250,0.2) inset';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6, #2563eb)';
                    e.currentTarget.style.boxShadow = '0 8px 25px -5px rgba(59,130,246,0.3), 0 0 0 1px rgba(59,130,246,0.1) inset';
                  }}
                >
                  <span>
                    {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
                  </span>
                  {!loading && (
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                  )}
                  {loading && (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                </button>
              </form>

              {/* ─── Divider ─── */}
              <div className="flex items-center gap-3 mt-6 mb-4">
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
                <span className="text-[11px] text-slate-600 uppercase tracking-wider font-medium">or</span>
                <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
              </div>

              {/* ─── Google Sign-In ─── */}
              <button
                id="google-sign-in"
                type="button"
                onClick={async () => {
                  setError(null);
                  const { error } = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                      redirectTo: window.location.origin,
                    },
                  });
                  if (error) setError(error.message);
                }}
                className="w-full rounded-xl py-3 flex items-center justify-center gap-3 font-medium text-[14px] transition-all duration-300 cursor-pointer active:scale-[0.98]"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  color: '#cbd5e1',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.14)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
                }}
              >
                {/* Google icon SVG */}
                <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Continue with Google</span>
              </button>

              {/* Toggle */}
              <div className="text-center text-sm pt-5 mt-2 text-slate-500"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
              >
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
                <button
                  id="auth-toggle"
                  onClick={() => { setIsSignUp(!isSignUp); setError(null); setLoading(false); setEmailSent(false); }}
                  className="font-semibold ml-1.5 cursor-pointer text-blue-400 hover:text-blue-300 transition-colors underline-offset-2 hover:underline"
                >
                  {isSignUp ? 'Sign in' : 'Sign up'}
                </button>
              </div>
            </div>

            {/* Tagline below card */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5, duration: 2 }}
              className="text-center text-[12px] text-white/30 mt-6 italic tracking-wider"
            >
              The storm is here. Are you ready to act?
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
