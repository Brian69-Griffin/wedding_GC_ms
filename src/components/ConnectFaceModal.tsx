import React, { useState, useRef, useEffect } from "react";
import { Camera, Shield, X, CheckCircle, Smartphone, User, Sparkles } from "lucide-react";
import { Language } from "../types";

interface ConnectFaceModalProps {
  onClose: () => void;
  activeWeddingId: string;
  lang: Language;
  isNightMode?: boolean;
}

export default function ConnectFaceModal({ onClose, activeWeddingId, lang, isNightMode = false }: ConnectFaceModalProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    // Auto-prompt camera start
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    setError("");
    setCameraActive(true);
    setPhoto(null);
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
      console.error("Camera access failed:", err);
      setError(lang === "kh" 
        ? "មិនអាចបើកកាមេរ៉ាស្វែងរកបានទេ។ សូមផ្តល់ការអនុញ្ញាតកាមេរ៉ារួចព្យាយាមម្តងទៀត។" 
        : "Failed to load device camera. Please grant webcam access permissions and try again."
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 360;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Mirror-flipped for organic face viewing
        ctx.scale(-1, 1);
        ctx.translate(-360, 0);
        ctx.drawImage(videoRef.current, 0, 0, 360, 360);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.88); // 88% high-fidelity JPEG
        setPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const handleRegister = async () => {
    if (!photo) return;
    setError("");
    setRegistering(true);

    try {
      const response = await fetch("/api/auth/register-face", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wedding-id": activeWeddingId,
        },
        body: JSON.stringify({ faceImage: photo }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Linking biometric face key failed");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to handshake with biometric registry");
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <div className={`w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl transition-all ${
        isNightMode 
          ? "bg-[#0b0101] border-amber-500/20 text-white" 
          : "bg-white border-rose-100 text-gray-900"
      }`}>
        {/* Header Block with Red/Gold Biometric Title */}
        <div className={`flex items-center justify-between p-5 text-white ${
          isNightMode 
            ? "bg-gradient-to-r from-stone-950 via-rose-950 to-stone-900 border-b border-amber-500/10" 
            : "bg-gradient-to-r from-rose-800 to-rose-950"
        }`}>
          <div className="flex items-center gap-2.5">
            <Shield className="text-amber-400 animate-pulse" size={20} />
            <span className="font-serif text-sm font-bold tracking-wide">
              {lang === "kh" ? "ប្រព័ន្ធស្កែនទម្រង់មុខធនាគារ" : "Bank-Grade Face ID Linker"}
            </span>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="rounded-lg p-1.5 transition-all hover:bg-white/15 text-white/80 hover:text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className={`mb-4 rounded-xl p-3 text-xs font-semibold border ${
              isNightMode ? "bg-red-950/30 border-red-900/30 text-red-400" : "bg-rose-50 border-rose-100 text-rose-700"
            }`}>
              {error}
            </div>
          )}

          {success ? (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <div className={`h-20 w-20 rounded-full flex items-center justify-center animate-bounce ${
                  isNightMode ? "bg-amber-500/10 border border-amber-400/30 text-amber-400" : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                }`}>
                  <CheckCircle size={44} />
                </div>
              </div>
              <h4 className="font-serif text-lg font-bold mb-2">
                {lang === "kh" ? "ភ្ជាប់ជោគជ័យ!" : "Face Connected Successfully!"}
              </h4>
              <p className={`text-xs max-w-xs mx-auto leading-relaxed mb-6 ${
                isNightMode ? "text-amber-200/80" : "text-gray-500"
              }`}>
                {lang === "kh" 
                  ? "គណនីរបស់អ្នកឥឡូវនេះត្រូវបានការពារដោយប្រព័ន្ធជីវមាត្រ។ អ្នកអាចចូលគណនីដោយគ្រាន់តែប្រើទម្រង់មុខរបស់អ្នកនៅពេលក្រោយ។" 
                  : "Your wedding ledger is now biometrically protected. You can instantly sign in using your face next session."}
              </p>
              <button
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className={`w-full py-2.5 text-xs font-bold rounded-xl cursor-pointer ${
                  isNightMode 
                    ? "bg-amber-500 text-rose-950 hover:bg-amber-400" 
                    : "bg-rose-800 text-white hover:bg-rose-900"
                }`}
              >
                {lang === "kh" ? "យល់ព្រម" : "Completed"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {/* Webcam Scanning Container */}
              <div className="relative w-64 h-64 mx-auto mb-6 flex items-center justify-center rounded-3xl overflow-hidden bg-black border border-gray-800">
                
                {/* Simulated high-tech radar overlay */}
                <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                  {/* Outer circle guide matching high security standards */}
                  <div className={`w-48 h-48 rounded-full border-2 border-dashed animate-[spin_10s_linear_infinite] ${
                    isNightMode ? "border-amber-400/30" : "border-rose-450/40"
                  }`} />
                  
                  {/* Inside high-contrast scanning overlay bounds */}
                  <div className={`absolute w-44 h-44 rounded-full border border-double ${
                    isNightMode ? "border-amber-400/50" : "border-rose-500/60"
                  }`} />

                  {/* High-speed glowing laser scanline */}
                  <div className={`absolute left-0 right-0 h-0.5 animate-[bounce_3s_infinite] shadow-lg ${
                    isNightMode 
                      ? "bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-amber-400/70" 
                      : "bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-rose-500/70"
                  }`} />
                  
                  {/* Reticle angles */}
                  <div className={`absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 ${isNightMode ? "border-amber-400" : "border-rose-700"}`} />
                  <div className={`absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 ${isNightMode ? "border-amber-400" : "border-rose-700"}`} />
                  <div className={`absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 ${isNightMode ? "border-amber-400" : "border-rose-700"}`} />
                  <div className={`absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 ${isNightMode ? "border-amber-400" : "border-rose-700"}`} />
                </div>

                {cameraActive ? (
                  <video 
                    ref={videoRef} 
                    className="w-full h-full object-cover scale-x-[-1]" 
                    playsInline 
                    muted 
                  />
                ) : photo ? (
                  <img 
                    src={photo} 
                    alt="Captured preview" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="text-gray-600 text-xs text-center p-4">
                    {lang === "kh" ? "កំពុងបើកកាមេរ៉ា..." : "Initializing facial scanners..."}
                  </div>
                )}
              </div>

              {/* Status helper text */}
              <p className={`text-center text-[11px] mb-6 leading-relaxed max-w-xs ${
                isNightMode ? "text-amber-200/70" : "text-gray-500"
              }`}>
                {!photo 
                  ? (lang === "kh" ? "សូមដាក់ផ្ទៃមុខរបស់អ្នកឲ្យចំកណ្តាលរង្វង់ សម្រាប់ការផ្ទៀងផ្ទាត់កម្រិតខ្ពស់។" : "Align your facial structure centered in the active zone for biometric hashing.")
                  : (lang === "kh" ? "រូបភាពជោគជ័យ។ ចុច 'រក្សាទុក' ដើម្បីភ្ជាប់ប្រព័ន្ធស្កែនមុខ។" : "Snapshot locked. Confirm connection registry below.")
                }
              </p>

              {/* Controls */}
              <div className="w-full flex gap-3">
                {!photo ? (
                  <button
                    onClick={capturePhoto}
                    className={`w-full py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all active:scale-98 cursor-pointer ${
                      isNightMode 
                        ? "bg-amber-500 text-rose-955 hover:bg-amber-400" 
                        : "bg-rose-800 text-white hover:bg-rose-900 shadow"
                    }`}
                  >
                    <Camera size={14} />
                    <span>{lang === "kh" ? "ចាប់យកទម្រង់មុខ" : "Scan & Save Frame"}</span>
                  </button>
                ) : (
                  <>
                    <button
                      onClick={startCamera}
                      disabled={registering}
                      className={`w-1/3 py-2.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        isNightMode 
                          ? "border-amber-500/20 bg-black text-amber-400 hover:bg-amber-500/10" 
                          : "border-gray-250 bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {lang === "kh" ? "ថតឡើងវិញ" : "Retake"}
                    </button>
                    <button
                      onClick={handleRegister}
                      disabled={registering}
                      className={`w-2/3 py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                        isNightMode 
                          ? "bg-amber-500 text-rose-955 hover:bg-amber-400" 
                          : "bg-rose-800 text-white hover:bg-rose-900"
                      }`}
                    >
                      <Sparkles size={13} className="animate-pulse" />
                      <span>{registering ? (lang === "kh" ? "កំពុងភ្ជាប់..." : "Linking...") : (lang === "kh" ? "រក្សាទុកស្កែនមុខ" : "Confirm Link")}</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
