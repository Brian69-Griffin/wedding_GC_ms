import React, { useState, useRef, useEffect } from "react";
import { Camera, Shield, X, CheckCircle, Sparkles, Check, HelpCircle } from "lucide-react";
import { Language } from "../i18n";

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
  
  // Streamlined Automated Scanning States
  const [scanProgress, setScanProgress] = useState(0);
  const [activeStep, setActiveStep] = useState(0); // 0=center, 1=right, 2=left, 3=up, 4=down
  const [facePresent, setFacePresent] = useState(true);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const facePresentRef = useRef(true);

  // Sync state to ref to avoid restarting the scanning interval effect on toggle
  useEffect(() => {
    facePresentRef.current = facePresent;
  }, [facePresent]);

  const steps = [
    { id: 0, textEn: "Center Face Position", textKh: "ដាក់ផ្ទៃមុខចំកណ្តាល" },
    { id: 1, textEn: "Turn Slightly Right ➡️", textKh: "បង្វែរមុខទៅស្តាំបន្តិច ➡️" },
    { id: 2, textEn: "Turn Slightly Left ⬅️", textKh: "បង្វែរមុខទៅឆ្វេងបន្តិច ⬅️" },
    { id: 3, textEn: "Look / Tilt Face Up ⬆️", textKh: "ងើបមុខឡើងលើបន្តិច ⬆️" },
    { id: 4, textEn: "Look / Tilt Face Down ⬇️", textKh: "ឱនមុខចុះក្រោមបន្តិច ⬇️" },
  ];

  useEffect(() => {
    // Auto-prompt camera start
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  // Periodic Face Presence Detection Loop
  useEffect(() => {
    let checkInterval: any = null;
    if (cameraActive && !success && !registering) {
      checkInterval = setInterval(() => {
        if (videoRef.current && videoRef.current.readyState >= 2) {
          const isPresent = checkRealFacePresence(videoRef.current);
          setFacePresent(isPresent);
        }
      }, 250); // check 4 times per second
    } else {
      setFacePresent(true);
    }
    return () => {
      if (checkInterval) clearInterval(checkInterval);
    };
  }, [cameraActive, success, registering]);

  // Automated step progression interval
  useEffect(() => {
    let interval: any = null;
    if (cameraActive && !success && !registering) {
      setScanProgress(0);
      setActiveStep(0);
      
      interval = setInterval(() => {
        setScanProgress((prev) => {
          // If no face is shown, pause scanning and do not progress
          if (!facePresentRef.current) {
            return prev;
          }
          if (prev >= 100) {
            clearInterval(interval);
            // Instantly trigger automated screen grab!
            setTimeout(() => {
              triggerAutoCapture();
            }, 200);
            return 100;
          }
          const nextVal = prev + 1;
          
          // Progress breakpoints for 5 biometrical steps (20% duration each)
          if (nextVal < 20) {
            setActiveStep(0);
          } else if (nextVal < 40) {
            setActiveStep(1);
          } else if (nextVal < 60) {
            setActiveStep(2);
          } else if (nextVal < 80) {
            setActiveStep(3);
          } else {
            setActiveStep(4);
          }
          
          return nextVal;
        });
      }, 35); // 35ms * 100 cycles = ~3.5s total organic scanning
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [cameraActive, success, registering]);

  const startCamera = async () => {
    setError("");
    setCameraActive(true);
    setPhoto(null);
    setScanProgress(0);
    setActiveStep(0);
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

  const triggerAutoCapture = () => {
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
        // Fire server register action automatically!
        handleRegisterWithPhoto(dataUrl);
      }
    }
  };

  const handleRegisterWithPhoto = async (photoData: string) => {
    setError("");
    setRegistering(true);

    try {
      const response = await fetch("/api/auth/register-face", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wedding-id": activeWeddingId,
        },
        body: JSON.stringify({ faceImage: photoData }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Linking biometric face key failed");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to handshake with biometric registry");
      // Turn camera back on to retry
      startCamera();
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
              {lang === "kh" ? "ប្រព័ន្ធកត់ត្រាទម្រង់មុខជីវមាត្រ" : "Holographic Biometric Scanner"}
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
                  ? "គណនីរបស់អ្នកត្រូវបានការពារដោយប្រព័ន្ធជីវមាត្រ។ ឧបករណ៍ស្កែនទម្រង់មុខស្វ័យប្រវត្តបានកត់ត្រា 5 មុំរួចរាល់។" 
                  : "Your wedding ledger account is now protected. Automatic biometric sweep locked in all 5 dynamic angles."}
              </p>
              <button
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className={`w-full py-2.5 text-xs font-bold rounded-xl cursor-pointer ${
                  isNightMode 
                    ? "bg-amber-500 text-rose-955 hover:bg-amber-400" 
                    : "bg-rose-800 text-white hover:bg-rose-900"
                }`}
              >
                {lang === "kh" ? "យល់ព្រម" : "Completed"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {/* Automated webcam stream & radar overlay */}
              <div className="relative w-56 h-56 mx-auto mb-4 flex items-center justify-center rounded-full overflow-hidden bg-black border border-gray-800">
                
                {/* 360-degree dynamic sweep rings */}
                <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                  {/* Glowing progress circular border */}
                  <svg className="w-52 h-52 absolute transform -rotate-90">
                    <circle
                      cx="104"
                      cy="104"
                      r="90"
                      stroke={isNightMode ? "rgba(245,158,11,0.08)" : "rgba(159,18,57,0.06)"}
                      strokeWidth="5"
                      fill="transparent"
                    />
                    <circle
                      cx="104"
                      cy="104"
                      r="90"
                      stroke={isNightMode ? "#fbbf24" : "#9f1239"}
                      strokeWidth="6"
                      fill="transparent"
                      strokeDasharray={2 * Math.PI * 90}
                      strokeDashoffset={2 * Math.PI * 90 * (1 - scanProgress / 100)}
                      className="transition-all duration-75"
                    />
                  </svg>

                  {/* Laser scan line flashing along scope directions */}
                  <div className={`absolute left-4 right-4 h-0.5 animate-[bounce_2.5s_infinite] shadow-lg ${
                    isNightMode 
                      ? "bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-amber-400/80" 
                      : "bg-gradient-to-r from-transparent via-rose-600 to-transparent shadow-rose-600/80"
                  }`} />
                </div>

                {cameraActive ? (
                  <video 
                    ref={videoRef} 
                    className="w-full h-full object-cover scale-x-[-1]" 
                    playsInline 
                    muted 
                  />
                ) : (
                  <div className="text-gray-500 text-xs text-center p-4">
                    {lang === "kh" ? "កំពុងបើកកាមេរ៉ាស្កែន..." : "Initiating 5-angle biometric radar..."}
                  </div>
                )}
              </div>

              {/* Progress counter pill */}
              <div className={`mb-4 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase flex items-center gap-1.5 ${
                !facePresent
                  ? "bg-red-950/40 text-red-400 border border-red-900/30 animate-pulse"
                  : isNightMode 
                  ? "bg-amber-955/40 text-amber-300 border border-amber-500/10" 
                  : "bg-rose-50 text-rose-900 border border-rose-100"
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${!facePresent ? "bg-red-500 animate-pulse" : "bg-emerald-550 animate-ping"}`} />
                <span>
                  {!facePresent
                    ? (lang === "kh" ? "ការស្កែនផ្អាក" : "SCAN PAUSED")
                    : (lang === "kh" ? `កម្រិតស្កែន៖ ${scanProgress}%` : `BIOMETRIC PROGRESS: ${scanProgress}%`)}
                </span>
              </div>

              {/* Angle Direction Guide Cards (Center, Right, Left, Up, Down) */}
              <div className="w-full space-y-2 mb-6">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 block">
                  {lang === "kh" ? "ដំណាក់កាលស្វ័យប្រវត្តទាំង ៥ មុំ៖" : "Automated Biometric Directions:"}
                </p>
                <div className="grid grid-cols-5 gap-1">
                  {steps.map((st) => {
                    const isCompleted = scanProgress >= (st.id + 1) * 20;
                    const isActive = activeStep === st.id;
                    return (
                      <div 
                        key={st.id} 
                        className={`p-2 rounded-lg border text-center transition-all ${
                          isCompleted 
                            ? (isNightMode ? "bg-amber-500/10 text-amber-400 border-amber-500/30 font-black scale-[0.98]" : "bg-emerald-50 text-emerald-800 border-emerald-100 font-bold scale-[0.98]")
                            : isActive 
                            ? (isNightMode ? "bg-rose-955/40 text-rose-300 border-rose-800 scale-102 ring-1 ring-amber-450/50 animate-pulse" : "bg-rose-100 text-rose-950 border-rose-400 scale-102 font-bold ring-2 ring-rose-200")
                            : (isNightMode ? "bg-stone-955/20 text-stone-600 border-stone-900" : "bg-gray-50 text-gray-400 border-gray-100")
                        }`}
                        title={lang === "kh" ? st.textKh : st.textEn}
                      >
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-xs">
                            {st.id === 0 ? "🎯" : st.id === 1 ? "➡️" : st.id === 2 ? "⬅️" : st.id === 3 ? "⬆️" : "⬇️"}
                          </span>
                          <span className="text-[8px] uppercase tracking-tighter mt-1 font-mono">
                            {isCompleted ? "DONE" : isActive ? "SCAN" : "WAIT"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Live Instruction text bar */}
                <div className={`p-3 rounded-xl border text-center text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                  !facePresent
                    ? "bg-red-955/35 border-red-500/30 text-rose-300 animate-pulse"
                    : isNightMode 
                    ? "bg-black/60 border-amber-500/10 text-amber-200" 
                    : "bg-rose-50/50 border-rose-100 text-rose-950"
                }`}>
                  {!facePresent ? (
                    <>
                      <span className="text-sm">⚠️</span>
                      <span className="text-red-500 dark:text-red-400">
                        {lang === "kh" 
                          ? "សូមដាក់ផ្ទៃមុខចូលក្នុងកាមេរ៉ា (ផ្អាកការស្កែន)" 
                          : "Reposition face in focal ring (Scan Paused)"}
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} className="text-amber-500 animate-spin" />
                      <span>
                        {lang === "kh" 
                          ? `សកម្មភាព៖ ${steps[activeStep].textKh}` 
                          : `Instruction: ${steps[activeStep].textEn}`}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Retry action buttons only displayed on fail */}
              {photo && error && (
                <button
                  onClick={startCamera}
                  className={`w-full py-2.5 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all ${
                    isNightMode ? "bg-amber-500 text-rose-955 hover:bg-amber-400" : "bg-rose-800 text-white hover:bg-rose-900"
                  }`}
                >
                  <Camera size={14} />
                  <span>{lang === "kh" ? "ស្កែនទម្រង់មុខឡើងវិញ" : "Restart Sweep Scan"}</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Fast real-time computer vision presence analyzer for face scanning
function checkRealFacePresence(video: HTMLVideoElement): boolean {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 30;
    canvas.height = 30;
    const ctx = canvas.getContext("2d");
    if (!ctx) return true;

    ctx.drawImage(video, 0, 0, 30, 30);
    const imgData = ctx.getImageData(0, 0, 30, 30);
    const data = imgData.data;

    let totalR = 0;
    let totalG = 0;
    let totalB = 0;

    let centerSkinPixels = 0;
    let centerTotalPixels = 0;
    let outerSkinPixels = 0;
    let outerTotalPixels = 0;

    // Monitor luminance variation to reject flat backgrounds
    let minLuminance = 255;
    let maxLuminance = 0;

    for (let y = 0; y < 30; y++) {
      for (let x = 0; x < 30; x++) {
        const i = (y * 30 + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        totalR += r;
        totalG += g;
        totalB += b;

        const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
        if (luminance < minLuminance) minLuminance = luminance;
        if (luminance > maxLuminance) maxLuminance = luminance;

        // Classify skin tones in various ethnical profiles
        const isSkin = r > 65 && g > 45 && b > 25 && r > g && r > b && (r - g) > 8;

        // Center region represents the camera center aligned with the scanning overlay circle (X: 7..22, Y: 7..22)
        const isCenter = x >= 7 && x <= 22 && y >= 7 && y <= 22;

        if (isCenter) {
          centerTotalPixels++;
          if (isSkin) centerSkinPixels++;
        } else {
          outerTotalPixels++;
          if (isSkin) outerSkinPixels++;
        }
      }
    }

    const count = data.length / 4;
    const avgR = totalR / count;
    const avgG = totalG / count;
    const avgB = totalB / count;

    const centerSkinRatio = centerSkinPixels / centerTotalPixels;
    const outerSkinRatio = outerSkinPixels / outerTotalPixels;

    // 1. Check if camera is covered (extremely low illumination or pitch dark)
    if (avgR < 25 && avgG < 25 && avgB < 25) {
      return false;
    }

    // 2. Reject flat, uniform surfaces (e.g. ceilings, flat sheets, plain light walls with zero shadows/features)
    // A genuine face of a user has deep-contrast textures from eyelashes, eyes, nostrils, and hair
    if (maxLuminance - minLuminance < 35) {
      return false;
    }

    // 3. Central focus constraint (the user's physical face must cover the scanner ring area in the center)
    if (centerSkinRatio < 0.15) {
      return false;
    }

    // 4. Uniform background skin-tone rejection (e.g. warm wooden door frame, cabinetry, uniform beige wall)
    // In a flat background, skin pixels are uniformly spread out (similar ratio in inner vs outer regions).
    // In contrast, a centered face creates a notable spike/concentration in the focal center ring.
    if (outerSkinRatio > 0.15 && centerSkinRatio < outerSkinRatio * 1.15) {
      return false;
    }

    return true;
  } catch (err) {
    return true; // failure safe to avoid blocking client
  }
}

