import React, { useState, useRef, useEffect } from "react";
import { Camera, Shield, X, CheckCircle, Sparkles, Check, Upload } from "lucide-react";
import { Language } from "../i18n";

interface ConnectFaceModalProps {
  onClose: () => void;
  activeWeddingId: string;
  lang: Language;
  isNightMode?: boolean;
  onFaceRegistered?: (faceImage: string) => void;
}

export default function ConnectFaceModal({ 
  onClose, 
  activeWeddingId, 
  lang, 
  isNightMode = false,
  onFaceRegistered 
}: ConnectFaceModalProps) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera on unmount
  useEffect(() => {
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
        video: { width: 480, height: 480, facingMode: cameraFacing }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera access failed:", err);
      setError(lang === "kh" 
        ? "មិនអាចបើកកាមេរ៉ាស្វែងរកបានទេ។ សូមផ្តល់ការអនុញ្ញាតកាមេរ៉ារួចព្យាយាមម្តងទៀត ឬប្រើជម្រើសបញ្ជូនឯកសារ។" 
        : "Failed to load device camera. Please grant webcam permissions or select the file upload option."
      );
      setCameraActive(false);
    }
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
          video: { width: 480, height: 480, facingMode: nextFacing }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err) {
        console.error("Camera facing switch failed:", err);
        setError("Failed to switch camera.");
      }
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const captureManualPhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 380;
      canvas.height = 380;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        if (cameraFacing === "user") {
          ctx.scale(-1, 1);
          ctx.translate(-380, 0);
        }
        ctx.drawImage(videoRef.current, 0, 0, 380, 380);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.90);
        setPhoto(dataUrl);
        stopCamera();
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX_SIZE = 380;
          let w = img.width;
          let h = img.height;
          if (w > h) {
            if (w > MAX_SIZE) {
              h *= MAX_SIZE / w;
              w = MAX_SIZE;
            }
          } else {
            if (h > MAX_SIZE) {
              w *= MAX_SIZE / h;
              h = MAX_SIZE;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.88);
          setPhoto(dataUrl);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRegisterWithPhoto = async () => {
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
      if (onFaceRegistered) {
         onFaceRegistered(photo);
      }
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
          : "bg-white border-rose-101 text-gray-900"
      }`}>
        {/* Header Block */}
        <div className={`flex items-center justify-between p-5 text-white ${
          isNightMode 
            ? "bg-gradient-to-r from-stone-955 via-rose-955 to-stone-900 border-b border-amber-500/10" 
            : "bg-gradient-to-r from-rose-800 to-rose-950"
        }`}>
          <div className="flex items-center gap-2.5">
            <Shield className="text-amber-400" size={20} />
            <span className="font-serif text-sm font-bold tracking-wide">
              {lang === "kh" ? "ភ្ជាប់គណនីជីវមាត្រមុខ" : "Link Biometric Face Login"}
            </span>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="rounded-lg p-1.5 transition-all hover:bg-white/15 text-white/85 hover:text-white cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className={`mb-4 rounded-xl p-3 text-xs font-semibold border ${
              isNightMode ? "bg-red-955/30 border-red-900/30 text-red-400" : "bg-rose-50 border-rose-100 text-rose-700"
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
                  ? "គណនីនៃការចូលប្រព័ន្ធរបស់អ្នក ត្រូវបានការពារនិងបានភ្ជាប់ជាមួយជីវមាត្រផ្ទៃមុខរួចរាល់។" 
                  : "Your account is now linked securely to your face profile. Use it in the login window to authenticate instantly."}
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
              
              {/* Photo Viewport (Larger frame) */}
              <div className={`relative w-64 h-64 mx-auto mb-5 flex items-center justify-center rounded-2xl overflow-hidden border ${
                isNightMode ? "bg-black border-stone-800" : "bg-gray-50 border-gray-200"
              }`}>
                {cameraActive ? (
                  <video 
                    ref={videoRef} 
                    className={`w-full h-full object-cover ${cameraFacing === "user" ? "scale-x-[-1]" : ""}`} 
                    playsInline 
                    autoPlay
                    muted
                  />
                ) : photo ? (
                  <img 
                    src={photo} 
                    alt="Captured face login" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="text-gray-400 flex flex-col items-center p-4 text-center">
                    <Camera size={36} className="mb-2 text-rose-200" />
                    <p className="text-xs font-semibold">{lang === "kh" ? "រៀបចំភ្ជាប់រូបភាពមុខ" : "Link Face Biometrics"}</p>
                    <p className="text-[10px] text-gray-550 mt-1 max-w-[170px] leading-relaxed">
                      {lang === "kh" ? "ប្រើប្រាស់កាមេរ៉ា ឬផ្ទុកឡើងឯកសាររូបថតផ្ទៀងផ្ទាត់មុខ" : "Use interactive camera stream or upload a face profile snapshot manually."}
                    </p>
                  </div>
                )}
              </div>

              {/* Action Rows */}
              {cameraActive ? (
                <div className="w-full flex justify-center gap-2 mb-4">
                  <button
                    type="button"
                    onClick={captureManualPhoto}
                    className="flex-1 py-2 text-xs font-bold text-white bg-rose-800 hover:bg-rose-900 rounded-xl cursor-pointer flex items-center justify-center gap-1 shadow active:scale-95 transition-all"
                  >
                    <Camera size={14} />
                    {lang === "kh" ? "ថតរូបភាព" : "Capture Photo"}
                  </button>
                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className={`px-3 py-2 text-xs font-bold rounded-xl border cursor-pointer flex items-center justify-center gap-1 active:scale-95 transition-all ${
                      isNightMode ? "bg-stone-900 text-amber-400 border-amber-500/20" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-55"
                    }`}
                  >
                    {lang === "kh" ? "ប្តូរកាមេរ៉ា" : "🔄 Switch Cam"}
                  </button>
                </div>
              ) : photo ? (
                <div className="w-full space-y-3 mb-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={startCamera}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl border cursor-pointer active:scale-95 transition-all ${
                        isNightMode ? "bg-stone-900 text-amber-300 border-stone-800" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {lang === "kh" ? "ថតជាថ្មី" : "Retake Live"}
                    </button>
                    <label className={`flex-1 py-1.5 text-xs font-bold rounded-xl border cursor-pointer flex items-center justify-center gap-1 active:scale-95 transition-all ${
                      isNightMode ? "bg-stone-900 text-amber-300 border-stone-800" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                    }`}>
                      <Upload size={13} />
                      <span>{lang === "kh" ? "ផ្ទុកឡើងរូបថ្មី" : "Browse File"}</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleRegisterWithPhoto}
                    disabled={registering}
                    className={`w-full py-2.5 text-xs font-bold rounded-xl cursor-pointer shadow flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
                      isNightMode 
                        ? "bg-amber-500 text-rose-955 hover:bg-amber-400" 
                        : "bg-rose-800 text-white hover:bg-rose-900"
                    }`}
                  >
                    {registering ? (
                      <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    {lang === "kh" ? "រក្សាទុកភ្ជាប់ជីវមាត្រ" : "Connect Face Now"}
                  </button>
                </div>
              ) : (
                <div className="w-full flex gap-3 mb-4 justify-center">
                  <button
                    type="button"
                    onClick={startCamera}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                      isNightMode ? "bg-amber-955/35 border-amber-500/20 text-amber-300 hover:bg-amber-955/50" : "bg-white border-gray-250 text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Camera size={13} strokeWidth={2.5} />
                    {lang === "kh" ? "ម៉ាស៊ីនថតកាមេរ៉ា" : "Webcam Snap"}
                  </button>
                  <label className={`flex-1 py-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                    isNightMode ? "bg-amber-955/35 border-amber-500/20 text-amber-300 hover:bg-amber-955/50" : "bg-white border-gray-250 text-gray-700 hover:bg-gray-50"
                  }`}>
                    <Upload size={13} />
                    {lang === "kh" ? "បញ្ជូនឯកសារ" : "File Upload"}
                    <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                  </label>
                </div>
              )}
              
              <p className="text-[10px] text-gray-400 text-center max-w-[280px]">
                {lang === "kh" 
                  ? "ប្រព័ន្ធជីវមាត្រមុខនេះអនុញ្ញាតការចូលដោយផ្ទាល់ពីកាមេរ៉ាដោយសុវត្ថិភាពខ្ពស់។" 
                  : "Linked biometric facial keys encrypt your device logs to facilitate seamless cashier-desk authentication."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

