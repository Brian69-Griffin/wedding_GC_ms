import React, { useState, useRef, useEffect } from "react";
import { Heart, Lock, User, Eye, EyeOff, Shield, Smile, X, Camera } from "lucide-react";
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
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const t = translations[lang];

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
          video: { width: 400, height: 400, facingMode: cameraFacing }
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

  const toggleCameraFacing = async () => {
    const nextFacing = cameraFacing === "user" ? "environment" : "user";
    setCameraFacing(nextFacing);
    if (cameraActive) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 400, height: 400, facingMode: nextFacing }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err) {
        console.error("Camera switch failed:", err);
        setFaceError("Failed to switch camera device.");
      }
    }
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
        if (cameraFacing === "user") {
          ctx.scale(-1, 1);
          ctx.translate(-360, 0);
        }
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
          ? "bg-black/45 border-amber-500/20 shadow-amber-955/20 text-white" 
          : "bg-white border-rose-100 shadow-rose-100/50 text-gray-900"
      }`}>
        {/* Banner with lucky red/gold styling */}
        <div className={`relative p-8 text-center text-white bg-gradient-to-br transition-all ${
          isNightMode 
            ? "from-[#1a0000] via-rose-955 to-amber-955 border-b border-amber-500/20" 
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
                ? "bg-red-500/10 border-red-505/20 text-red-100" 
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
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
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
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
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
                  : "bg-gradient-to-r from-rose-700 to-rose-900 text-white shadow-rose-955/25"
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
                  ? "bg-black border-amber-500/20 text-amber-400 hover:bg-amber-500/10 shadow-amber-955/5" 
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
              ? "bg-[#0b0101] border-amber-500/20 text-white shadow-amber-955/35" 
              : "bg-white border-rose-100 text-gray-900 shadow-rose-100/50"
          }`}>
            <div className={`flex items-center justify-between p-4 text-white ${
              isNightMode ? "bg-stone-955 border-b border-amber-500/10" : "bg-gradient-to-r from-rose-800 to-rose-955"
            }`}>
              <div className="flex items-center gap-2">
                <Shield className="text-amber-400" size={16} />
                <span className="font-serif text-xs font-bold tracking-wide">
                  {lang === "kh" ? "ស្កែនទម្រង់មុខជីវមាត្រ" : "Biometric Face Authentication"}
                </span>
              </div>
              <button
                type="button"
                onClick={closeFaceModal}
                className="rounded-lg p-1 transition-all hover:bg-white/14 text-white/80 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            <div className="p-6 flex flex-col items-center">
              {faceError && (
                <div className={`w-full mb-4 rounded-xl p-3 text-xs font-semibold border ${
                  isNightMode ? "bg-red-955/30 border-red-900/30 text-red-100" : "bg-rose-50 border-rose-100 text-rose-700"
                }`}>
                  {faceError}
                </div>
              )}

              {/* Secure Scanning viewport */}
              <div className="relative w-52 h-52 mx-auto mb-5 flex items-center justify-center rounded-2xl overflow-hidden bg-black border border-gray-800 shadow-inner">
                {cameraActive ? (
                  <video 
                    ref={videoRef} 
                    className={`w-full h-full object-cover ${cameraFacing === "user" ? "scale-x-[-1]" : ""}`} 
                    playsInline 
                    autoPlay
                  />
                ) : facePhoto ? (
                  <img 
                    src={facePhoto} 
                    alt="Captured biometric" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="text-gray-655 flex flex-col items-center">
                    <Camera size={36} className="text-rose-200" />
                  </div>
                )}
                
                {faceScanning && (
                  <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center text-center p-3">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-amber-400 border-t-transparent mb-2"></div>
                    <p className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                      {lang === "kh" ? "កំពុងវិភាគមុខ..." : "Verifying Biometrics..."}
                    </p>
                  </div>
                )}
              </div>

              {cameraActive && !faceScanning && (
                <div className="w-full flex gap-2 mb-5 justify-center">
                  <button
                    type="button"
                    onClick={captureAndAuthenticateFace}
                    className="flex-1 py-2 text-xs font-bold text-white bg-rose-800 hover:bg-rose-900 rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow active:scale-95 transition-all"
                  >
                    <Camera size={13} />
                    {lang === "kh" ? "ថតរូប និងចូល" : "Capture & Login"}
                  </button>
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border cursor-pointer active:scale-95 transition-all ${
                      isNightMode ? "bg-stone-900 text-amber-400 border-amber-500/20" : "bg-white text-gray-750 border-gray-300 hover:bg-gray-50"
                    }`}
                  >
                    {lang === "kh" ? "ប្តូរ" : "🔄 Switch"}
                  </button>
                </div>
              )}

              {facePhoto && !faceScanning && (
                <button
                  type="button"
                  onClick={startFaceLogin}
                  className={`w-full py-2.5 text-xs font-bold rounded-xl mb-5 cursor-pointer active:scale-95 transition-all text-center ${
                    isNightMode ? "bg-stone-900 text-amber-400 border border-amber-500/20" : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {lang === "kh" ? "ព្យាយាមម្តងទៀត" : "Retry Capture"}
                </button>
              )}

              <p className={`text-center text-xs ml-1 mr-1 mb-6 max-w-xs ${
                isNightMode ? "text-amber-200/90" : "text-gray-500"
              }`}>
                {faceScanning 
                  ? (lang === "kh" ? "📡 ម៉ាស៊ីនបម្រើកំពុងផ្ទៀងផ្ទាត់ទិន្នន័យ..." : "📡 Matchmaking biometric registry keys...") 
                  : (lang === "kh" ? "🔍 សូមតម្រង់មុខរបស់អ្នកចំកាមេរ៉ា រួចចុចប៊ូតុងថត" : "🔍 Point camera directly at your face and click capture")
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
                      : "border-gray-250 bg-white text-gray-700 hover:bg-gray-54"
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
