import React, { useState, useRef, useEffect } from "react";
import { Camera, Upload, X, Search, Sparkles, Smile, ShieldAlert } from "lucide-react";
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
        video: { width: 380, height: 380, facingMode: "user" }
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
      canvas.width = 320;
      canvas.height = 320;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Draw centered square mirror-flipped for natural look
        ctx.scale(-1, 1);
        ctx.translate(-320, 0);
        ctx.drawImage(videoRef.current, 0, 0, 320, 320);
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
          const MAX_SIZE = 320;
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
          const dataUrl = canvas.toDataURL("image/jpeg", 0.82); // 82% quality compress
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
        // Enforce the 85% similarity filter as per requirements (already filtered server-side but double-guarded)
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-rose-950/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-2xl">
        {/* Header decoration */}
        <div className="flex items-center justify-between bg-gradient-to-r from-rose-800 to-rose-950 p-5 text-white">
          <div className="flex items-center gap-2">
            <Sparkles className="text-amber-300 animate-pulse" size={20} />
            <h3 className="font-serif text-lg font-bold">{lang === "kh" ? t.searchByFaceTitle : "Smart Face Finder"}</h3>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="rounded-lg p-1 transition-all hover:bg-white/10"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
            {/* Visual Search Upload / Snapshot Panel */}
            <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-gray-50/50 p-4 min-h-[250px] relative">
              {cameraActive ? (
                <div className="w-full h-full flex flex-col justify-between">
                  <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-black aspect-square max-w-[200px] mx-auto scale-x-[-1]">
                    <video ref={videoRef} className="object-cover w-full h-full" />
                  </div>
                  <button
                    onClick={capturePhoto}
                    className="mt-3 mx-auto px-4 py-2 rounded-xl bg-rose-800 text-xs text-white font-bold tracking-wide flex items-center gap-1 hover:bg-rose-900 shadow active:scale-95 cursor-pointer"
                  >
                    <Smile size={14} />
                    {lang === "kh" ? "ថតយកទម្រង់មុខ" : "Capture Face"}
                  </button>
                </div>
              ) : photo ? (
                <div className="text-center w-full">
                  <img
                    src={photo}
                    alt="Target query"
                    className="mx-auto h-36 w-36 rounded-xl object-cover border border-rose-100 shadow-md mb-3"
                  />
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={startCamera}
                      className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-gray-700 hover:bg-gray-50"
                    >
                      {lang === "kh" ? "ថតរូបជាថ្មី" : "Retake Frame"}
                    </button>
                    <label className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-gray-700 hover:bg-gray-50 cursor-pointer">
                      <span>{lang === "kh" ? "ជ្រើសរើសឯកសារ" : "Choose File"}</span>
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-rose-50 text-rose-800 border border-rose-100">
                    <Camera size={26} />
                  </div>
                  <p className="text-xs font-semibold text-gray-800 mb-1">{lang === "kh" ? "កត់ត្រា/បញ្ចូលទម្រង់មុខស្វែងរក" : "Upload query face"}</p>
                  <p className="text-[10px] text-gray-400 max-w-[140px] mx-auto leading-normal">
                    {lang === "kh" ? "ថតយករូបភាពតាមកាមេរ៉ា ឬទាញយកឯកសារភ្ញៀវ" : "Snapshot via webcam or import guest image"}
                  </p>

                  <div className="mt-4 flex gap-2 justify-center">
                    <button
                      onClick={startCamera}
                      className="flex items-center gap-1 rounded-lg bg-rose-800 px-3 py-1.5 text-[10px] font-bold text-white hover:bg-rose-900 cursor-pointer"
                    >
                      <Camera size={12} />
                      {lang === "kh" ? "កាមេរ៉ា" : "Use Webcam"}
                    </button>
                    <label className="flex items-center gap-1 rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-[10px] font-bold text-rose-800 hover:bg-rose-100 cursor-pointer">
                      <Upload size={12} />
                      {lang === "kh" ? "ស្វែងរកឯកសារ" : "Browse Image"}
                      <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Results matched panel */}
            <div className="rounded-2xl border border-gray-100 p-4 bg-gray-50/20 flex flex-col justify-between text-left">
              <div>
                <h4 className="text-xs font-bold text-gray-800 tracking-wider uppercase border-b border-gray-100 pb-2 mb-3">
                  {lang === "kh" ? "លទ្ធផលស្វែងរកភាពត្រូវគ្នា" : "Match Identification Outputs"}
                </h4>

                {searching && (
                  <div className="flex flex-col items-center justify-center py-10 text-center">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-rose-800 border-t-transparent mb-2"></div>
                    <p className="text-xs text-rose-800 font-semibold leading-normal">{lang === "kh" ? "កំពុងស្កែនរកទម្រង់មុខ..." : "Scanning face angles..."}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{lang === "kh" ? "ប្រៀបធៀបកម្រិតភាពត្រឹមត្រូវ ៨៥%..." : "Matching 85% vectors in database"}</p>
                  </div>
                )}

                {!searching && !photo && (
                  <p className="text-xs text-gray-400 text-center py-12">
                    {lang === "kh" ? "សូមថតរូប ឬបញ្ចូលឯកសារដើម្បីប្រៀបធៀបទម្រង់មុខក្នុងប្រព័ន្ធ" : "Submit or snap a visual face photo to trigger similarity calculations."}
                  </p>
                )}

                {!searching && photo && matches.length === 0 && !hasNoMatches && (
                  <div className="text-center py-10">
                    <button
                      id="trigger_face_search_button"
                      onClick={handleFaceSearch}
                      className="mx-auto flex items-center justify-center gap-1.5 rounded-xl bg-rose-800 px-5 py-3 text-xs font-bold text-white shadow hover:bg-rose-900 transition-all cursor-pointer"
                    >
                      <Search size={14} />
                      {lang === "kh" ? "ផ្ទៀងផ្ទាត់ទម្រង់មុខ" : "Find Stored Match"}
                    </button>
                  </div>
                )}

                {!searching && hasNoMatches && (
                  <div className="text-center py-10">
                    <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 border border-rose-100 text-rose-700">
                      <ShieldAlert size={18} />
                    </div>
                    <p className="text-xs font-bold text-rose-900 leading-snug">{lang === "kh" ? "មិនរកឃើញព័ត៌មានឡើយ" : "No matching records found"}</p>
                    <p className="text-[10px] text-gray-400 max-w-[160px] mx-auto mt-1 leading-normal">
                      {lang === "kh" ? "គ្មានទិន្នន័យចំណងដៃណាមានកម្រិតភាពត្រូវគ្នាលើសពី ៨៥% ឡើយ" : "No guest face matched with >= 85% similarity confidence score in database."}
                    </p>
                  </div>
                )}

                {!searching && matches.length > 0 && (
                  <div className="space-y-3 max-h-[190px] overflow-y-auto pr-1">
                    {fallbackMode && (
                      <p className="text-[9px] bg-amber-50 text-amber-800 border border-amber-100 px-2 py-1 rounded leading-normal">
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
                          className="flex items-center justify-between p-2 rounded-xl border border-rose-100 bg-rose-50/20 hover:bg-rose-100/40 hover:border-rose-200 cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-2">
                            {guest.imageUrl ? (
                              <img
                                src={guest.imageUrl}
                                alt="match preview"
                                className="h-9 w-9 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="h-9 w-9 rounded-lg bg-rose-100 flex items-center justify-center text-xs text-rose-800 font-bold font-serif">
                                {guest.fullName.charAt(0)}
                              </div>
                            )}
                            <div className="truncate max-w-[110px]">
                              <p className="text-xs font-bold text-gray-900 truncate leading-tight">
                                {guest.fullName}
                              </p>
                              <p className="text-[9px] text-gray-500 truncate leading-tight mt-0.5">
                                {guest.address}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-black text-rose-800 tracking-tight font-serif">
                              {m.confidence}% {lang === "kh" ? "ត្រូវគ្នា" : "Match"}
                            </span>
                            <p className="text-[8px] text-gray-400 tracking-wide mt-0.5 uppercase">85% Approved</p>
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

        <div className="border-t border-gray-50 bg-gray-50/50 p-4 text-center text-[10px] text-gray-450">
          {lang === "kh" ? "ប្រព័ន្ធដំណើរការប្រៀបធៀបទម្រង់មុខស្វ័យប្រវត្តិចាប់ពី ៨៥%" : "Neural facial logic powered by self-hosted visual recognition patterns at 85% match."}
        </div>
      </div>
    </div>
  );
}
