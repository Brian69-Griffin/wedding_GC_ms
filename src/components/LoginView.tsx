import React, { useState, useRef, useEffect } from "react";
import { Heart, Lock, User, Sparkles, Eye, EyeOff, Shield, Smile, X, Camera } from "lucide-react";
import { SecurityUser } from "../types";
import { Language, translations } from "../i18n";

interface LoginViewProps {
  onLoginSuccess: (user: SecurityUser) => void;
  lang: Language;
  toggleLang: (newLang: Language) => void;
  isNightMode?: boolean;
  toggleNightMode?: () => void;
}

export default function LoginView({
  onLoginSuccess,
  lang,
  toggleLang,
  isNightMode = false,
  toggleNightMode,
}: LoginViewProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Biometric Face Login states
  const [faceModalOpen, setFaceModalOpen] = useState(false);
  const [facePhoto, setFacePhoto] = useState<string | null>(null);
  const [faceScanning, setFaceScanning] = useState(false);
  const [faceError, setFaceError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [faceScanProgress, setFaceScanProgress] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const t = translations[lang];

  // Auto-sweep scanning execution when biometric view open
  useEffect(() => {
    let timer: any = null;
    if (faceModalOpen && cameraActive && !faceScanning && !facePhoto) {
      setFaceScanProgress(0);
      timer = setInterval(() => {
        setFaceScanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timer);
            // Grab the frame automatically on full sweep completion!
            setTimeout(() => {
              captureAndAuthenticateFace();
            }, 100);
            return 100;
          }
          return prev + 2; // Complete sweep in ~1.5 seconds
        });
      }, 30);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [faceModalOpen, cameraActive, faceScanning, facePhoto]);

  const handleSubmit = async (e: React.FormEvent, customUser?: string, customPass?: string) => {
    e?.preventDefault();
    setError("");
    setLoading(true);

    const targetUser = customUser || username;
    const targetPass = customPass || password;

    if (!targetUser || !targetPass) {
      setError(lang === "kh" ? "សូមបញ្ចូលព័ត៌មានលម្អិតទាំងអស់" : "Please fill in all credentials");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: targetUser, password: targetPass }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      onLoginSuccess(data);
    } catch (err: any) {
      setError(err.message || (lang === "kh" ? "ការភ្ជាប់ទៅម៉ាស៊ីនបម្រើបានបរាជ័យ" : "Failed to establish server connection"));
    } finally {
      setLoading(false);
    }
  };

  // Face Login actions
  const startFaceLogin = async () => {
    setFaceModalOpen(true);
    setFacePhoto(null);
    setFaceError("");
    setCameraActive(true);
    
    // Tiny delay to ensure video element is safely rendered in DOM
    setTimeout(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 400, height: 400, facingMode: "user" }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err) {
        console.error("Biometric face camera loading failed:", err);
        setFaceError(lang === "kh" 
          ? "មិនអាចបើកកាមេរ៉ាស្វែងរកបានទេ។ សូមផ្តល់ការអនុញ្ញាតកាមេរ៉ារួចព្យាយាមម្តងទៀត។" 
          : "Webcam access denied. Please grant camera hardware permissions."
        );
        setCameraActive(false);
      }
    }, 150);
  };

  const stopFaceCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const captureAndAuthenticateFace = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 360;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Capture with mirror inversion for realistic preview
        ctx.scale(-1, 1);
        ctx.translate(-360, 0);
        ctx.drawImage(videoRef.current, 0, 0, 360, 360);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85); // Compress JPEG for efficient bandwidth
        setFacePhoto(dataUrl);
        stopFaceCamera();
        
        // Auto trigger server-side verification immediately
        authenticateFaceOnServer(dataUrl);
      }
    }
  };

  const authenticateFaceOnServer = async (photoData: string) => {
    setFaceScanning(true);
    setFaceError("");

    try {
      const response = await fetch("/api/auth/login-by-face", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ faceImage: photoData }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Biometric authentication failed");
      }

      // Success login!
      setFaceModalOpen(false);
      onLoginSuccess(data);
    } catch (err: any) {
      setFaceError(err.message || "Failed to authenticate biometrics");
    } finally {
      setFaceScanning(false);
    }
  };

  const closeFaceModal = () => {
    stopFaceCamera();
    setFaceModalOpen(false);
  };

  return (
    <div id="login_container" className="flex flex-col min-h-[85vh] items-center justify-center p-4">
      {/* Floating Language Switcher and Lucky Toggle */}
      <div className="mb-4 flex items-center gap-2">
        <div className={`flex backdrop-blur border p-1 rounded-xl shadow-sm gap-1 ${
          isNightMode ? "bg-black/55 border-amber-500/20 text-white" : "bg-white/85 border-rose-100"
        }`}>
          <button
            type="button"
            onClick={() => toggleLang("en")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              lang === "en"
                ? "bg-rose-800 text-white shadow"
                : "text-gray-400 hover:text-gray-900"
            }`}
          >
            English (EN)
          </button>
          <button
            type="button"
            onClick={() => toggleLang("kh")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              lang === "kh"
                ? "bg-rose-800 text-white shadow"
                : "text-gray-400 hover:text-gray-900"
            }`}
          >
            ភាសាខ្មែរ (KH)
          </button>
        </div>

        {toggleNightMode && (
          <button
            type="button"
            onClick={toggleNightMode}
            className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
              isNightMode
                ? "bg-amber-400 text-rose-955 border-amber-300 shadow-md"
                : "bg-white border-rose-100 hover:bg-rose-50 text-rose-850"
            }`}
            title={t.nightModeLabel}
          >
            <span className="text-sm select-none">🧧</span>
          </button>
        )}
      </div>

      <div className={`w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl transition-all duration-300 ${
        isNightMode 
          ? "bg-black/45 border-amber-500/20 shadow-amber-950/20 text-white" 
          : "bg-white border-rose-100 shadow-rose-100/50 text-gray-900"
      }`}>
        {/* Banner with lucky red/gold styling */}
        <div className={`relative p-8 text-center text-white bg-gradient-to-br transition-all ${
          isNightMode 
            ? "from-[#1a0000] via-rose-950 to-amber-950 border-b border-amber-500/20" 
            : "from-rose-800 to-rose-950"
        }`}>
          <div className="absolute top-2 right-2 opacity-10">
            <Heart size={140} fill="currentColor" />
          </div>
          <div className={`mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full border backdrop-blur-sm ${
            isNightMode ? "border-amber-400/40 bg-amber-900/30" : "border-rose-300/30 bg-rose-900/40"
          }`}>
            <Heart className="animate-pulse text-amber-350" size={32} fill="currentColor" />
          </div>
          <h2 className="font-serif text-2xl font-bold tracking-wide text-amber-100">{t.appName}</h2>
          <p className="mt-1 text-sm text-amber-200/80">{lang === "kh" ? "ប្រព័ន្ធគ្រប់គ្រងសៀវភៅចំណងដៃអាពាហ៍ពិពាហ៍" : "Wedding Cash Gift Management Ledger"}</p>
        </div>

        {/* Form Body */}
        <div className="p-8">
          {error && (
            <div className={`mb-4 rounded-lg p-3 text-xs font-medium border ${
              isNightMode 
                ? "bg-red-500/10 border-red-505/20 text-red-400" 
                : "bg-rose-50 border-rose-100 text-rose-600"
            }`}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                {t.usernameLabel}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-550">
                  <User size={16} />
                </span>
                <input
                  id="login_username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. couple"
                  style={{ colorScheme: isNightMode ? "dark" : "light" }}
                  className={`w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm outline-none transition-all ${
                    isNightMode 
                      ? "bg-black/35 border-amber-500/20 text-white placeholder-gray-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-250" 
                      : "bg-white border-gray-200 text-gray-800 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                {t.password}
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-555">
                  <Lock size={16} />
                </span>
                <input
                  id="login_password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ colorScheme: isNightMode ? "dark" : "light" }}
                  className={`w-full rounded-xl border py-2.5 pl-10 pr-10 text-sm outline-none transition-all ${
                    isNightMode 
                      ? "bg-black/35 border-amber-500/20 text-white placeholder-gray-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-250" 
                      : "bg-white border-gray-200 text-gray-800 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-rose-500 transition-colors focus:outline-none cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              id="login_btn"
              type="submit"
              disabled={loading}
              className={`mt-6 w-full rounded-xl py-3 font-medium transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer text-sm font-bold shadow-lg ${
                isNightMode 
                  ? "bg-gradient-to-r from-amber-500 to-[#b57c1e] text-rose-955 shadow-amber-900/10" 
                  : "bg-gradient-to-r from-rose-700 to-rose-900 text-white shadow-rose-950/25"
              }`}
            >
              {loading ? (lang === "kh" ? "កំពុងផ្ទៀងផ្ទាត់..." : "Authenticating Digital Lock...") : t.enterCeremony}
            </button>

            {/* Seamless Secure Biometric Login Trigger */}
            <div className="flex items-center justify-center pt-2">
              <span className="w-1/4 h-[1px] bg-gray-150 dark:bg-zinc-800" />
              <span className="text-[10px] font-bold text-gray-400 mx-3 uppercase tracking-wider">
                {lang === "kh" ? "ឬប្រើប្រព័ន្ធស្កែន" : "OR SECURE OPTION"}
              </span>
              <span className="w-1/4 h-[1px] bg-gray-150 dark:bg-zinc-800" />
            </div>

            <button
              id="face_login_trigger_btn"
              type="button"
              onClick={startFaceLogin}
              className={`w-full rounded-xl py-2.5 text-xs font-bold transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2 border shadow-sm ${
                isNightMode 
                  ? "bg-black border-amber-500/20 text-amber-400 hover:bg-amber-500/10 shadow-amber-950/5" 
                  : "bg-rose-50 border-rose-100 text-rose-800 hover:bg-rose-100/60"
              }`}
            >
              <Smile size={14} className="text-amber-400 animate-pulse" />
              <span>{lang === "kh" ? "ចូលគណនីជាមួយការស្កែនមុខ" : "Login with Secure Face ID"}</span>
            </button>
          </form>
        </div>
      </div>

      {/* Modern High-End Visual Biometric Face Scanner Dialog */}
      {faceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-md">
          <div className={`w-full max-w-sm overflow-hidden rounded-2xl border shadow-2xl transition-all ${
            isNightMode 
              ? "bg-[#0b0101] border-amber-500/20 text-white shadow-amber-950/30" 
              : "bg-white border-rose-150 text-gray-900 shadow-rose-100/50"
          }`}>
            <div className={`flex items-center justify-between p-4 text-white ${
              isNightMode ? "bg-stone-950 border-b border-amber-500/10" : "bg-gradient-to-r from-rose-800 to-rose-950"
            }`}>
              <div className="flex items-center gap-2">
                <Shield className="text-amber-400 animate-pulse" size={16} />
                <span className="font-serif text-xs font-bold tracking-wide">
                  {lang === "kh" ? "ស្កែនទម្រង់មុខជីវមាត្រ" : "Biometric Face Authentication"}
                </span>
              </div>
              <button
                type="button"
                onClick={closeFaceModal}
                className="rounded-lg p-1 transition-all hover:bg-white/15 text-white/80 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center">
              {faceError && (
                <div className={`w-full mb-4 rounded-xl p-3 text-xs font-semibold border ${
                  isNightMode ? "bg-red-950/30 border-red-900/30 text-red-450" : "bg-rose-50 border-rose-100 text-rose-700"
                }`}>
                  {faceError}
                </div>
              )}

              {/* Secure Scanning viewport */}
              <div className="relative w-56 h-56 mx-auto mb-5 flex items-center justify-center rounded-full overflow-hidden bg-black border border-gray-800">
                
                {/* Visual circular progress meter */}
                <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                  <svg className="w-52 h-52 absolute transform -rotate-90">
                    <circle
                      cx="104"
                      cy="104"
                      r="90"
                      stroke={isNightMode ? "rgba(245,158,11,0.06)" : "rgba(159,18,57,0.04)"}
                      strokeWidth="4"
                      fill="transparent"
                    />
                    <circle
                      cx="104"
                      cy="104"
                      r="90"
                      stroke={isNightMode ? "#fbbf24" : "#9f1239"}
                      strokeWidth="5"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 90}
                      strokeDashoffset={2 * Math.PI * 90 * (1 - faceScanProgress / 100)}
                      className="transition-all duration-75"
                    />
                  </svg>
                  
                  {/* Glowing laser line swept down */}
                  <div className={`absolute left-4 right-4 h-0.5 animate-[bounce_2s_infinite] shadow ${
                    isNightMode 
                      ? "bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-amber-400/60" 
                      : "bg-gradient-to-r from-transparent via-rose-550 to-transparent shadow-rose-500/65"
                  }`} />
                </div>

                {cameraActive ? (
                  <video 
                    ref={videoRef} 
                    className="w-full h-full object-cover scale-x-[-1]" 
                    playsInline 
                    muted 
                  />
                ) : facePhoto ? (
                  <img 
                    src={facePhoto} 
                    alt="Scanned look" 
                    className="w-full h-full object-cover animate-pulse" 
                  />
                ) : (
                  <div className="text-gray-500 text-[10px] uppercase font-bold text-center p-4">
                    {lang === "kh" ? "កាមេរ៉ាកំពុងដំណើរការ..." : "Accessing optics..."}
                  </div>
                )}
              </div>

              {/* Biometric Scan status pill */}
              <div className={`mb-4 px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase flex items-center gap-1.5 ${
                isNightMode ? "bg-amber-955/50 border border-amber-500/10 text-amber-300 animate-pulse" : "bg-rose-50 border border-rose-100 text-rose-900"
              }`}>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-ping" />
                <span>
                  {lang === "kh" ? `កម្រិតស្កែន៖ ${faceScanProgress}%` : `BIOMETRIC PROGRESS: ${faceScanProgress}%`}
                </span>
              </div>

              <p className={`text-center text-xs font-semibold mb-6 max-w-xs ${
                isNightMode ? "text-amber-200/90" : "text-rose-950"
              }`}>
                {faceScanning 
                  ? (lang === "kh" ? "📡 ម៉ាស៊ីនបម្រើកំពុងផ្ទៀងផ្ទាត់ទិន្នន័យ..." : "📡 Matchmaking biometric registry keys...") 
                  : faceScanProgress < 30 
                  ? (lang === "kh" ? "🔍 កំពុងតម្រង់ទម្រង់ផ្ទៃមុខ..." : "🔍 Tracking facial profile dimensions...")
                  : faceScanProgress < 70 
                  ? (lang === "kh" ? "🔒 កំពុងវិភាគកូអរដោណេភ្នែក..." : "🔒 Comparing ocular feature positions...")
                  : (lang === "kh" ? "✨ ស្ទើរតែរួចរាល់ហើយ! កំពុងផ្ទៀងផ្ទាត់..." : "✨ Almost completed! Finalizing handshake...")
                }
              </p>

              <div className="w-full flex gap-2">
                <button
                  type="button"
                  onClick={closeFaceModal}
                  disabled={faceScanning}
                  className={`w-full py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    isNightMode 
                      ? "border-amber-500/10 bg-black text-amber-400 hover:bg-amber-500/5" 
                      : "border-gray-250 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {lang === "kh" ? "បោះបង់" : "Cancel Scan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
