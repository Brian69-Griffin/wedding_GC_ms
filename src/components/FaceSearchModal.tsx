import React, { useState, useRef, useEffect } from "react";
import { Camera, Upload, X, Search, Sparkles, Smile, ShieldAlert, Trash2 } from "lucide-react";
import { FaceMatchResult, GiftRecord } from "../types";
import { Language, translations } from "../i18n";

interface FaceSearchModalProps {
  onClose: () => void;
  activeWeddingId: string;
  onMatchSelect: (giftId: string) => void;
  allGifts: GiftRecord[];
  lang: Language;
  isNightMode?: boolean;
}

export default function FaceSearchModal({ onClose, activeWeddingId, onMatchSelect, allGifts, lang, isNightMode = false }: FaceSearchModalProps) {
  const t = translations[lang];
  const [photo, setPhoto] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [matches, setMatches] = useState<FaceMatchResult[]>([]);
  const [hasNoMatches, setHasNoMatches] = useState(false);
  const [error, setError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stop camera stream on unmount
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
      setError("Unable to access system webcam camera. Please proceed with file upload instead.");
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
          video: { width: 485, height: 485, facingMode: nextFacing }
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      } catch (err) {
        console.error("Camera facing switch failed:", err);
        setError("Unable to switch camera facing orientation.");
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

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 440;
      canvas.height = 440;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        if (cameraFacing === "user") {
          ctx.scale(-1, 1);
          ctx.translate(-440, 0);
        }
        ctx.drawImage(videoRef.current, 0, 0, 440, 440);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85); // 85% compressed JPEG
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
          const MAX_SIZE = 440;
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
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setPhoto(dataUrl);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFaceSearch = async () => {
    if (!photo) return;
    setError("");
    setSearching(true);
    setMatches([]);
    setHasNoMatches(false);
    setFallbackMode(false);

    try {
      const response = await fetch("/api/face-compare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wedding-id": activeWeddingId,
        },
        body: JSON.stringify({ searchImage: photo }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Face search matching failed");
      }

      const matchResults: FaceMatchResult[] = data.matches || [];
      if (data.usingFallback) {
        setFallbackMode(true);
      }

      if (matchResults.length === 0) {
        setHasNoMatches(true);
      } else {
        const validated = matchResults.filter(m => m.confidence >= 85);
        if (validated.length === 0) {
          setHasNoMatches(true);
        } else {
          setMatches(validated);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to establish API handshake with visual agent");
    } finally {
      setSearching(false);
    }
  };

  const getGuestDetails = (id: string) => {
    return allGifts.find(g => g.id === id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <div className={`w-full max-w-2xl overflow-hidden rounded-2xl border transition-all duration-300 shadow-2xl ${
        isNightMode ? "bg-stone-900 border-amber-500/20 text-white" : "bg-white border-rose-100 text-gray-900"
      }`}>
        {/* Header decoration */}
        <div className={`flex items-center justify-between p-5 text-white ${
          isNightMode ? "bg-[#180202] border-b border-amber-500/10" : "bg-gradient-to-r from-rose-800 to-rose-955"
        }`}>
          <div className="flex items-center gap-2">
            <Sparkles className="text-amber-300 animate-pulse" size={20} />
            <h3 className="font-serif text-base font-bold">{lang === "kh" ? t.searchByFaceTitle : "Smart Face Finder"}</h3>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="rounded-lg p-1 transition-all hover:bg-white/10 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
            {/* Visual Search Upload / Snapshot Panel */}
            <div className={`flex flex-col items-center justify-center rounded-2xl border p-4 min-h-[300px] relative transition-all ${
              isNightMode 
                ? "bg-black/30 border-amber-500/10 text-white" 
                : "bg-gray-50 border-gray-150 text-gray-800"
            }`}>
              {cameraActive ? (
                <div className="w-full text-center">
                  <span className={`text-[9px] font-mono font-bold block mb-2 tracking-widest uppercase animate-pulse ${
                    isNightMode ? "text-amber-400" : "text-rose-800"
                  }`}>
                    {lang === "kh" 
                      ? `កាមេរ៉ាសកម្ម៖ ${cameraFacing === "user" ? "ខាងមុខ (Selfie)" : "ខាងក្រោយ (បន្ទប់)"}` 
                      : `Active Optic: ${cameraFacing === "user" ? "Front (User)" : "Rear (Room)"}`}
                  </span>
                  
                  {/* High Quality Camera Viewport */}
                  <div className={`relative overflow-hidden rounded-2xl border-2 mx-auto w-56 h-56 md:w-60 md:h-60 bg-black ${
                    isNightMode ? "border-amber-500/30" : "border-rose-450/40 shadow-inner"
                  }`}>
                    <video 
                      ref={videoRef} 
                      className="object-cover w-full h-full"
                      style={{ transform: cameraFacing === "user" ? "scaleX(-1)" : "none" }}
                      playsInline
                      autoPlay
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="text-xs bg-rose-800 hover:bg-rose-900 border border-rose-900/40 text-white font-bold py-2 px-4 rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
                    >
                      <Camera size={13} />
                      <span>{lang === "kh" ? "ថតរូបភាព" : "Capture Photo"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      className={`text-xs font-bold py-2 px-3.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 ${
                        isNightMode 
                          ? "bg-amber-955/40 border-amber-500/30 text-amber-300 hover:bg-amber-955/65" 
                          : "bg-white border-gray-250 text-gray-700 hover:bg-gray-100 shadow-sm"
                      }`}
                    >
                      <span>{lang === "kh" ? "🔄 ប្តូរកាមេរ៉ា" : "🔄 Switch Cam"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={stopCamera}
                      className={`text-xs font-bold py-2 px-3 rounded-xl border flex items-center gap-1 transition-all cursor-pointer active:scale-95 ${
                        isNightMode
                          ? "bg-stone-800 border-stone-700 text-stone-350 hover:bg-stone-700"
                          : "bg-gray-150 border-gray-250 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      <span>{lang === "kh" ? "បិទ" : "Stop"}</span>
                    </button>
                  </div>
                </div>
              ) : photo ? (
                <div className="text-center w-full">
                  <span className={`text-[9px] font-bold block mb-2 tracking-widest uppercase ${
                    isNightMode ? "text-emerald-400" : "text-gray-400"
                  }`}>
                    {lang === "kh" ? "រូបភាពស្វែងរក" : "Query Snapshot Selected"}
                  </span>
                  
                  <div className={`relative overflow-hidden rounded-2xl border mx-auto w-56 h-56 md:w-60 md:h-60 bg-black ${
                    isNightMode ? "border-amber-500/20" : "border-rose-100 shadow"
                  }`}>
                    <img
                      src={photo}
                      alt="Target query"
                      className="object-cover w-full h-full"
                    />
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2 justify-center">
                    <button
                      type="button"
                      onClick={startCamera}
                      className={`flex items-center gap-1 border rounded-xl px-3 py-2 text-[10px] font-bold transition-all cursor-pointer active:scale-95 ${
                        isNightMode ? "bg-amber-955/40 border-amber-500/30 text-amber-300 hover:bg-amber-955/65" : "bg-white border-gray-205 text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <Camera size={11} />
                      {lang === "kh" ? "ថតរូបជាថ្មី" : "Retake Frame"}
                    </button>
                    <label className={`flex items-center gap-1 border rounded-xl px-3 py-2 text-[10px] font-bold transition-all cursor-pointer active:scale-95 ${
                      isNightMode ? "bg-amber-955/40 border-amber-500/30 text-amber-300 hover:bg-amber-955/65" : "bg-white border-gray-205 text-gray-700 hover:bg-gray-100"
                    }`}>
                      <Upload size={11} />
                      <span>{lang === "kh" ? "ជ្រើសរើសឯកសារ" : "Choose File"}</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                    <button
                      type="button"
                      onClick={() => setPhoto(null)}
                      className={`flex items-center gap-1 border rounded-xl px-3 py-2 text-[10px] font-bold transition-all cursor-pointer active:scale-95 ${
                        isNightMode ? "bg-red-950/20 border-red-900/30 text-red-400 hover:bg-red-900/20" : "bg-red-50 border-red-150 text-red-700 hover:bg-red-100/50"
                      }`}
                    >
                      <Trash2 size={11} />
                      {lang === "kh" ? "លុប" : "Clear"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border ${
                    isNightMode ? "bg-amber-955/20 text-amber-400 border-amber-500/10" : "bg-rose-50 text-rose-800 border-rose-100"
                  }`}>
                    <Camera size={26} />
                  </div>
                  <p className={`text-xs font-semibold mb-1 ${isNightMode ? "text-amber-200" : "text-gray-800"}`}>
                    {lang === "kh" ? "កត់ត្រា/បញ្ចូលទម្រង់មុខស្វែងរក" : "Upload query face"}
                  </p>
                  <p className="text-[10px] text-gray-400 max-w-[150px] mx-auto leading-normal">
                    {lang === "kh" ? "ថតយករូបភាពតាមកាមេរ៉ា ឬទាញយកឯកសារភ្ញៀវ" : "Snapshot via webcam or import guest image"}
                  </p>

                  <div className="mt-4 flex gap-2 justify-center">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex items-center gap-1.5 rounded-xl bg-rose-800 px-3.5 py-2 text-[11px] font-bold text-white hover:bg-rose-900 cursor-pointer transition-all active:scale-95"
                    >
                      <Camera size={12} />
                      {lang === "kh" ? "ម៉ាស៊ីនថតកាមេរ៉ា" : "Webcam Snap"}
                    </button>
                    <label className={`flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-[11px] font-bold cursor-pointer transition-all active:scale-95 ${
                      isNightMode ? "bg-amber-955/40 border-amber-500/30 text-amber-300 hover:bg-amber-955/65" : "bg-white border-rose-100 text-rose-850 hover:bg-rose-50"
                    }`}>
                      <Upload size={12} />
                      <span>{lang === "kh" ? "បញ្ជូនឯកសារ" : "File Upload"}</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Results matched panel */}
            <div className={`rounded-2xl border p-4 flex flex-col justify-between text-left transition-all ${
              isNightMode 
                ? "bg-black/10 border-amber-500/10 text-white" 
                : "bg-gray-50/20 border-gray-100 text-gray-800"
            }`}>
              <div>
                <h4 className={`text-xs font-bold tracking-wider uppercase border-b pb-2 mb-3 ${
                  isNightMode ? "text-amber-400 border-amber-500/10" : "text-gray-800 border-gray-100"
                }`}>
                  {lang === "kh" ? "លទ្ធផលស្វែងរកភាពត្រូវគ្នា" : "Match Identification Outputs"}
                </h4>

                {searching && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-rose-800 border-t-transparent mb-2"></div>
                    <p className={`text-xs font-semibold leading-normal ${isNightMode ? "text-amber-400" : "text-rose-800"}`}>
                      {lang === "kh" ? "កំពុងស្កែនរកទម្រង់មុខ..." : "Scanning face angles..."}
                    </p>
                    <p className="text-[10px] text-gray-450 mt-0.5">
                      {lang === "kh" ? "ប្រៀបធៀបកម្រិតភាពត្រឹមត្រូវ ៨៥%..." : "Matching 85% vectors in database"}
                    </p>
                  </div>
                )}

                {!searching && !photo && (
                  <p className="text-xs text-gray-400 text-center py-12">
                    {lang === "kh" ? "សូមថតរូប ឬបញ្ចូលឯកសារដើម្បីប្រៀបធៀបទម្រង់មុខក្នុងប្រព័ន្ធ" : "Submit or snap a visual face photo to trigger similarity calculations."}
                  </p>
                )}

                {!searching && photo && matches.length === 0 && !hasNoMatches && (
                  <div className="text-center py-12">
                    <button
                      id="trigger_face_search_button"
                      onClick={handleFaceSearch}
                      className="mx-auto flex items-center justify-center gap-1.5 rounded-xl bg-rose-800 px-5 py-3 text-xs font-bold text-white shadow hover:bg-rose-900 transition-all cursor-pointer active:scale-95"
                    >
                      <Search size={14} />
                      {lang === "kh" ? "ផ្ទៀងផ្ទាត់ទម្រង់មុខ" : "Find Stored Match"}
                    </button>
                  </div>
                )}

                {!searching && hasNoMatches && (
                  <div className="text-center py-10 w-full flex flex-col items-center">
                    <div className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full border ${
                      isNightMode ? "bg-red-955/20 border-red-900/30 text-red-450" : "bg-red-50 border-red-100 text-red-700"
                    }`}>
                      <ShieldAlert size={18} />
                    </div>
                    <p className={`text-xs font-bold leading-snug ${isNightMode ? "text-red-400" : "text-rose-900"}`}>
                      {lang === "kh" ? "មិនរកឃើញព័ត៌មានឡើយ" : "No matching records found"}
                    </p>
                    <p className="text-[10px] text-gray-400 max-w-[160px] mx-auto mt-1 leading-normal text-center">
                      {lang === "kh" ? "គ្មានទិន្នន័យចំណងដៃណាមានកម្រិតភាពត្រូវគ្នាលើសពី ៨៥% ឡើយ" : "No guest face matched with >= 85% similarity confidence score in database."}
                    </p>
                  </div>
                )}

                {!searching && matches.length > 0 && (
                  <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                    {fallbackMode && (
                      <p className={`text-[9px] border px-2 py-1 rounded leading-normal ${
                        isNightMode ? "bg-amber-950/20 border-amber-500/10 text-amber-300" : "bg-amber-50 text-amber-850 border-amber-100"
                      }`}>
                        Simulated Face Match Demo mode on. Apply GEMINI_API_KEY for true mathematical neural comparison.
                      </p>
                    )}
                    {matches.map((m) => {
                      const guest = getGuestDetails(m.giftId);
                      if (!guest) return null;
                      return (
                        <div
                          id={`matched_item_${m.giftId}`}
                          key={m.giftId}
                          onClick={() => {
                            onMatchSelect(m.giftId);
                            onClose();
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                            isNightMode
                              ? "border-amber-500/10 bg-amber-500/5 hover:bg-amber-550/10 hover:border-amber-500/20 text-white"
                              : "border-rose-100 bg-rose-50/20 hover:bg-rose-100/40 hover:border-rose-200 text-gray-900"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {guest.imageUrl ? (
                              <img
                                src={guest.imageUrl}
                                alt="match preview"
                                className="h-9 w-9 rounded-lg object-cover"
                              />
                            ) : (
                              <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-xs font-bold font-serif ${
                                isNightMode ? "bg-amber-955/40 text-amber-305" : "bg-rose-100 text-rose-800"
                              }`}>
                                {guest.fullName.charAt(0)}
                              </div>
                            )}
                            <div className="truncate max-w-[110px]">
                              <p className={`text-xs font-bold truncate leading-tight ${isNightMode ? "text-amber-200" : "text-gray-900"}`}>
                                {guest.fullName}
                              </p>
                              <p className="text-[9px] text-gray-400 truncate leading-tight mt-0.5 animate-none">
                                {guest.address}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className={`text-xs font-black tracking-tight font-serif ${isNightMode ? "text-amber-400" : "text-rose-800"}`}>
                              {m.confidence}% {lang === "kh" ? "ត្រូវគ្នា" : "Match"}
                            </span>
                            <p className="text-[8px] text-gray-400 tracking-wide mt-0.5 uppercase font-mono">85% Approved</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={`border-t p-4 text-center text-[10px] tracking-wide font-medium font-sans ${
          isNightMode ? "border-amber-500/10 bg-[#120202]/50 text-amber-405" : "border-gray-100 bg-gray-50/50 text-gray-450"
        }`}>
          {lang === "kh" ? "ប្រព័ន្ធដំណើរការប្រៀបធៀបទម្រង់មុខស្វ័យប្រវត្តិចាប់ពី ៨៥%" : "Neural facial logic powered by self-hosted visual recognition patterns at 85% match."}
        </div>
      </div>
    </div>
  );
}
