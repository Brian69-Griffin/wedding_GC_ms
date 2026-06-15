import React, { useState, useEffect } from "react";
// @ts-ignore
import jsQR from "jsqr";
import { QrCode, Save, DollarSign, Landmark, Plus, Trash2, Edit2, Upload, X, ArrowLeft, Image as ImageIcon } from "lucide-react";
import { QRCodeConfig } from "../types";
import { Language, translations } from "../i18n";
import ConfirmationModal from "./ConfirmationModal";
import LoadingSpinner from "./LoadingSpinner";

interface QRPanelProps {
  qrcodes: QRCodeConfig[];
  onQRUpdated: () => void;
  activeWeddingId: string;
  lang: Language;
  isNightMode?: boolean;
}

export default function QRPanel({ qrcodes, onQRUpdated, activeWeddingId, lang, isNightMode = false }: QRPanelProps) {
  const t = translations[lang];

  // Local state for optimistic updates and smooth instantaneous UI changes
  const [localQRs, setLocalQRs] = useState<QRCodeConfig[]>(qrcodes);
  
  // Sync prop changes
  useEffect(() => {
    setLocalQRs(qrcodes);
  }, [qrcodes]);

  // Form states for creating/editing a QR item
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [currencyType, setCurrencyType] = useState<"USD" | "RIEL">("USD");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [description, setDescription] = useState("");
  const [qrImageUrl, setQrImageUrl] = useState("");

  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  // Confirmation modal states
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: "info" | "danger" | "warning" | "success" | "logout";
    onConfirm: () => void;
  } | null>(null);

  // Form togglers
  const handleOpenAddForm = () => {
    setError("");
    setSuccess("");
    setEditingId(null);
    setCurrencyType("USD");
    setBankName("");
    setAccountName("");
    setAccountNumber("");
    setDescription("");
    setQrImageUrl("");
    setIsFormOpen(true);
  };

  const handleOpenEditForm = (qr: QRCodeConfig) => {
    setError("");
    setSuccess("");
    setEditingId(qr.id);
    setCurrencyType(qr.currencyType);
    setBankName(qr.bankName || "");
    setAccountName(qr.accountName || "");
    setAccountNumber(qr.accountNumber || "");
    setDescription(qr.description || "");
    setQrImageUrl(qr.qrImageUrl || "");
    setIsFormOpen(true);

    // Scroll to form smoothly
    setTimeout(() => {
      document.getElementById("qr_editor_card")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  // Drag and Drop files handling
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError(lang === "kh" ? "សូមជ្រើសរើសតែឯកសាររូបភាពប៉ុណ្ណោះ។" : "Please upload only image files.");
      return;
    }
    setError("");
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      
      // Load the image to process it on a canvas
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (!ctx) {
            setQrImageUrl(dataUrl);
            return;
          }
          
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Use jsQR to decode the QR code and locate its position
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code && code.location) {
            // Find bounding coordinates of the scanned QR Code box
            const xs = [
              code.location.topLeftCorner.x,
              code.location.topRightCorner.x,
              code.location.bottomRightCorner.x,
              code.location.bottomLeftCorner.x
            ];
            const ys = [
              code.location.topLeftCorner.y,
              code.location.topRightCorner.y,
              code.location.bottomRightCorner.y,
              code.location.bottomLeftCorner.y
            ];
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            
            const qrWidth = maxX - minX;
            const qrHeight = maxY - minY;
            
            // Add a proper "quiet zone" padding (15%) to neatly isolate the QR code square itself
            const padding = Math.max(qrWidth, qrHeight) * 0.15;
            
            const cropX = Math.max(0, minX - padding);
            const cropY = Math.max(0, minY - padding);
            const cropW = Math.min(img.width - cropX, qrWidth + 2 * padding);
            const cropH = Math.min(img.height - cropY, qrHeight + 2 * padding);
            
            // Create a cropped canvas
            const cropCanvas = document.createElement("canvas");
            cropCanvas.width = cropW;
            cropCanvas.height = cropH;
            const cropCtx = cropCanvas.getContext("2d");
            
            if (cropCtx) {
              cropCtx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
              const croppedDataUrl = cropCanvas.toDataURL("image/png");
              setQrImageUrl(croppedDataUrl);
              setSuccess(
                lang === "kh" 
                  ? "✓ បានរកឃើញកូដ QR និងកាត់តម្រឹមយកតែផ្នែកកូដដោយជោគជ័យ!" 
                  : "✓ Scanned & isolated QR code perfectly from screenshot!"
              );
            } else {
              setQrImageUrl(dataUrl);
            }
          } else {
            // If scanning fails or no QR localized, gracefully fallback to the original screenshot
            setQrImageUrl(dataUrl);
            setError(
              lang === "kh"
                ? "រកមិនឃើញរូបភាពកូដ QR ច្បាស់លាស់ទេ។ ប្រព័ន្ធនឹងរក្សាទុកនិងបង្ហាញរូបភាពទូទៅដែលអ្នកបានបញ្ជូន។"
                : "No clear QR code isolated. Displaying full screenshot as fallback."
            );
          }
        } catch (e) {
          console.error("Failed to crop/scan QR code:", e);
          setQrImageUrl(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setQrImageUrl("");
  };

  // Execute database QR creation / update
  const executeSaveQR = async () => {
    setFormLoading(true);
    setError("");
    setSuccess("");

    const payload = {
      id: editingId || undefined,
      currencyType,
      bankName,
      accountName,
      accountNumber,
      description,
      qrImageUrl: qrImageUrl || "",
    };

    // Optimistic item to inject directly into the view for instant local responsive feedback!
    const optimisticItem: QRCodeConfig = {
      id: editingId || `qr-optimistic-${Date.now()}`,
      weddingId: activeWeddingId,
      currencyType,
      bankName,
      accountName,
      accountNumber,
      description,
      qrImageUrl: qrImageUrl || undefined,
      createdAt: new Date().toISOString()
    };

    // Store old state for rollback fallback
    const oldQRs = [...localQRs];

    // Instantly modify local react state (Optimistic Update)
    if (editingId) {
      setLocalQRs(prev => prev.map(q => q.id === editingId ? optimisticItem : q));
    } else {
      setLocalQRs(prev => [...prev, optimisticItem]);
    }
    
    // Close form immediately for fluid speed feelings!
    setIsFormOpen(false);

    try {
      const response = await fetch("/api/qrcodes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wedding-id": activeWeddingId,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(lang === "kh" ? "ការរក្សាទុកការកំណត់បរាជ័យ" : "Failed to save QR code setup on server database");
      }

      setSuccess(
        lang === "kh"
          ? `បានកត់ត្រាកូដ QR វេរលុយប្រភេទ ${currencyType} ដោយជោគជ័យ។`
          : `Successfully configured ${currencyType} QR payment record.`
      );
      
      // Let the parent App.tsx fetch the actual state in the background silently
      onQRUpdated();
    } catch (e: any) {
      // Rollback optimistic state since API failed
      setLocalQRs(oldQRs);
      setError(e.message || "Failed to sync QR configuration");
    } finally {
      setFormLoading(false);
    }
  };

  // Request user confirmation
  const handleSaveQR = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bankName || !accountName || !accountNumber || !description) {
      setError(lang === "kh" ? "សូមបំពេញព័ត៌មានដែលត្រូវការទាំងអស់" : "Please supply all required bank parameters");
      return;
    }

    const confirmMsg = t.confirmSaveQRCode;
    setConfirmModal({
      isOpen: true,
      title: editingId 
        ? (lang === "kh" ? "ធ្វើបច្ចុប្បន្នភាពកូដ QR" : "Update QR Details")
        : (lang === "kh" ? "បន្ថែមគណនី QR ថ្មី" : "Add Custom QR Payment Channel"),
      message: confirmMsg,
      confirmText: lang === "kh" ? "យល់ព្រម" : "Save Changes",
      cancelText: lang === "kh" ? "បោះបង់" : "Cancel",
      type: "warning",
      onConfirm: () => {
        setConfirmModal(null);
        executeSaveQR();
      }
    });
  };

  // Perform permanent delete
  const handleDeleteQR = (qrId: string, bankLabel: string) => {
    const confirmMsg = t.confirmDeleteQR || t.confirmDeleteQRCode || "Are you sure you want to delete this payment option?";
    
    setConfirmModal({
      isOpen: true,
      title: lang === "kh" ? "លុបចោលកូដ QR" : "Delete QR Account",
      message: `${confirmMsg} (${bankLabel})`,
      confirmText: lang === "kh" ? "លុបចោល" : "Delete Account",
      cancelText: lang === "kh" ? "បោះបង់" : "Cancel",
      type: "danger",
      onConfirm: async () => {
        setConfirmModal(null);
        
        // Optimistic delete
        const oldQRs = [...localQRs];
        setLocalQRs(prev => prev.filter(q => q.id !== qrId));
        setSuccess(lang === "kh" ? "បានលុបកូដ QR ដោយជោគជ័យ" : "Successfully deleted QR channel option.");

        try {
          const response = await fetch(`/api/qrcodes/${qrId}`, {
            method: "DELETE",
            headers: {
              "x-wedding-id": activeWeddingId,
            }
          });

          if (!response.ok) {
            throw new Error();
          }
          onQRUpdated(); // sync parents background state
        } catch (err) {
          // Rollback
          setLocalQRs(oldQRs);
          setError(lang === "kh" ? "លុបចោលបរាជ័យ" : "Failed to remove QR configuration");
        }
      }
    });
  };

  // Render pre-designed vector KHQR fallbacks if no snapshot supplied, or overlays the uploaded bank QR image
  const renderMockKHQR = (curType: "USD" | "RIEL", bank: string, name: string, num: string, customQrImageUrl?: string) => {
    return (
      <div id={`sim_khqr_${curType}_${num}`} className="relative mx-auto w-56 rounded-2xl bg-gradient-to-b from-rose-850 to-rose-950 p-4 text-white shadow-lg border border-amber-300/30 text-center select-none overflow-hidden font-sans">
        <div className="absolute inset-0 opacity-5 pointer-events-none flex items-center justify-center">
          <span className="text-9xl">♥</span>
        </div>

        {/* Top Header */}
        <div className="flex items-center justify-between text-[9px] font-bold tracking-wider text-amber-300 uppercase leading-none border-b border-rose-700/60 pb-2">
          <span>KHQR Payment Gate</span>
          <span className="bg-amber-400 text-rose-950 px-1 py-0.5 rounded text-[8px] font-black">{curType}</span>
        </div>

        {/* Bank brand logo */}
        <div className="my-3 flex items-center justify-center gap-1">
          <Landmark size={13} className="text-amber-400 shrink-0" />
          <span className="text-xs font-black uppercase tracking-wide truncate max-w-[130px]">
            {bank || "CHELSA BANK"}
          </span>
        </div>

        {/* QR Core Box Container */}
        <div className="relative mx-auto flex h-34 w-34 items-center justify-center rounded-xl bg-white p-2">
          <div className="absolute top-1 left-1 border-t-2 border-l-2 border-rose-950 w-2.5 h-2.5"></div>
          <div className="absolute top-1 right-1 border-t-2 border-r-2 border-rose-950 w-2.5 h-2.5"></div>
          <div className="absolute bottom-1 left-1 border-b-2 border-l-2 border-rose-950 w-2.5 h-2.5"></div>
          <div className="absolute bottom-1 right-1 border-b-2 border-r-2 border-rose-950 w-2.5 h-2.5"></div>

          {customQrImageUrl ? (
            <img
              src={customQrImageUrl}
              alt="Mapped Bank Account QR"
              className="w-full h-full object-contain rounded-md"
              referrerPolicy="no-referrer"
            />
          ) : (
            <>
              <div className="grid grid-cols-6 gap-0.5 opacity-90 w-full h-full p-1.5 matches-qr border border-gray-100">
                {Array.from({ length: 36 }).map((_, i) => {
                  const isDark = (i % 2 === 0 && i % 3 !== 0) || (i < 8 && i % 2 === 0) || (i > 28) || (i % 7 === 1);
                  return (
                    <div
                      key={i}
                      className={`rounded-[1px] ${
                        isDark ? "bg-rose-950" : "bg-transparent"
                      }`}
                    />
                  );
                })}
              </div>

              <div className="absolute flex h-7 w-7 items-center justify-center rounded-full border border-amber-300 bg-rose-50 select-none shadow">
                <span className="text-rose-700 text-[10px] font-bold leading-none">♥</span>
              </div>
            </>
          )}
        </div>

        {/* Card Holder Account fields */}
        <div className="mt-3 truncate">
          <p className="text-[10px] uppercase font-bold text-amber-200 tracking-wide truncate">
            {name || "Receiver Name"}
          </p>
          <p className="text-[8px] font-mono text-rose-200 mt-0.5 truncate select-all">
            {num || "No account number"}
          </p>
        </div>

        {/* Footnotes */}
        <div className="mt-2.5 border-t border-rose-700/60 pt-2 flex justify-between text-[6.5px] text-rose-300 px-1 font-mono uppercase">
          <span>Secure Merchant</span>
          <span>Bakong Interop</span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* Dynamic Header Toolbar */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <span className="font-semibold text-rose-800 text-xs uppercase tracking-widest block mb-1">
            {lang === "kh" ? "ការកំណត់ទទួលប្រាក់ឌីជីថល" : "Cashier QR Display Center"}
          </span>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-gray-900">
            {t.qrEnvelopeSettings}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {t.qrSubtitleHelp}
          </p>
        </div>

        {!isFormOpen && (
          <button
            id="add_new_qr_btn"
            onClick={handleOpenAddForm}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-800 px-5 py-3 text-xs font-bold text-white shadow-md shadow-rose-900/10 hover:bg-rose-900 transition-all select-none active:scale-95 cursor-pointer self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>{lang === "kh" ? "បន្ថែមគណនី QR" : "Add Bank QR"}</span>
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-rose-100 bg-rose-50 p-3 text-xs font-medium text-rose-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-6 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 flex items-center gap-2">
          <span className="text-emerald-500 font-bold">&#10003;</span>
          <span>{success}</span>
        </div>
      )}

      {/* Accordion / Embedded QR Editor form inside standard UI constraints */}
      {isFormOpen && (
        <div id="qr_editor_card" className="mb-8 rounded-2xl border border-gray-150 bg-white p-6 shadow-md shadow-rose-900/[0.02]">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-6">
            <h2 className="font-serif text-lg font-bold text-gray-900 flex items-center gap-2">
              <QrCode size={18} className="text-rose-800" />
              <span>
                {editingId 
                  ? (lang === "kh" ? `កែសម្រួលគណនី៖ ${bankName}` : `Edit Account: ${bankName}`) 
                  : (lang === "kh" ? "បន្ថែមគណនីទទួលប្រាក់ QR ថ្មី" : "Add New Ceremony Cashier QR")}
              </span>
            </h2>
            <button
              onClick={handleCloseForm}
              className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-all cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <form onSubmit={handleSaveQR} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Form Input fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">{lang === "kh" ? "ដុល្លារ/រៀល" : "USD / RIEL"}</label>
                  <select
                    id="form_currency_type"
                    value={currencyType}
                    onChange={(e) => setCurrencyType(e.target.value as "USD" | "RIEL")}
                    className="w-full mt-1 rounded-lg border border-gray-200 p-2.5 text-xs text-gray-800 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-100 bg-white"
                  >
                    <option value="USD">USD/ដុល្លារ</option>
                    <option value="RIEL">RIEL/រៀល</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">{t.bankNameLabel}</label>
                  <input
                    id="form_bank_name"
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. ABA Bank, ACLEDA, Wing"
                    className="w-full mt-1 rounded-lg border border-gray-200 p-2.5 text-xs text-gray-800 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-100"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">{t.accountNameLabel}</label>
                  <input
                    id="form_account_name"
                    type="text"
                    required
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                    placeholder="e.g. SENG SOKPHAL"
                    className="w-full mt-1 rounded-lg border border-gray-200 p-2.5 text-xs text-gray-800 uppercase outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-100"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">{t.accountNumLabel}</label>
                  <input
                    id="form_account_number"
                    type="text"
                    required
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="e.g. 000 123 456"
                    className="w-full mt-1 rounded-lg border border-gray-200 p-2.5 text-xs text-gray-800 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-100"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase">{t.displayLabel}</label>
                  <input
                    id="form_description"
                    type="text"
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Scan to pay via USD"
                    className="w-full mt-1 rounded-lg border border-gray-200 p-2.5 text-xs text-gray-800 outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-100"
                  />
                </div>
              </div>

              {/* Screenshot Uploader Component */}
              <div className="flex flex-col">
                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">
                  {lang === "kh" ? "រូបភាពកូដ QR ពីកម្មវិធីធនាគារ (ស្រ្គីនសត)" : "Bank Account QR Screenshot Image"}
                </label>
                
                <div
                  onClick={() => {
                    document.getElementById("qr_file_input")?.click();
                  }}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`flex-1 border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center transition-all min-h-[220px] cursor-pointer ${
                    isDragOver ? "border-rose-500 bg-rose-50" : "border-gray-250 hover:border-gray-350 bg-gray-50/50"
                  }`}
                >
                  <input
                    id="qr_file_input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {qrImageUrl ? (
                    <div className="relative w-full max-w-[190px] mx-auto group">
                      <img
                        src={qrImageUrl}
                        alt="Bank QR Code Screenshot"
                        className="rounded-lg shadow border border-gray-200 mx-auto max-h-[190px] object-contain"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage();
                        }}
                        className="absolute -top-2 -right-2 bg-rose-800 text-white rounded-full p-1 shadow hover:bg-rose-950 transition-all cursor-pointer"
                        title="Remove Image"
                      >
                        <X size={14} />
                      </button>
                      <p className="text-[10px] text-emerald-600 font-bold mt-2">
                        {lang === "kh" ? "✓ បានបញ្ចូលរូបភាពកូដសមស្រប" : "✓ Screenshot mapped successfully"}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="mx-auto h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400">
                        <Upload size={22} />
                      </div>
                      <div className="text-xs text-gray-500">
                        <span className="font-bold text-rose-800 hover:underline">
                          {lang === "kh" ? "ចុចផ្ទាំងនេះដើម្បីបញ្ចូលរូបភាព" : "Click to select screenshot"}
                        </span>
                        <p className="mt-1 text-[10px] text-gray-400">
                          {lang === "kh" ? "ឬ អូសទម្លាក់រូបភាពទីនេះ (PNG, JPG)" : "or drag and drop bank image receipt"}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Form control buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-50 pt-4">
              <button
                type="button"
                onClick={handleCloseForm}
                className="rounded-xl border border-gray-200 px-5 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-all cursor-pointer"
              >
                {lang === "kh" ? "បោះបង់" : "Cancel"}
              </button>
              
              <button
                id="submit_qr_form_btn"
                type="submit"
                disabled={formLoading}
                className="flex items-center gap-1.5 rounded-xl bg-rose-800 px-6 py-2.5 text-xs font-bold text-white shadow hover:bg-rose-950 transition-all select-none cursor-pointer"
              >
                <Save size={14} />
                <span>
                  {formLoading 
                    ? (lang === "kh" ? "កំពុងរក្សាទុក..." : "Saving...") 
                    : (lang === "kh" ? "រក្សាទុកការកំណត់" : "Save Changes")}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dynamic List grid - No fixed USD/KHR limits */}
      {localQRs.length === 0 ? (
        <div className="rounded-2xl border border-gray-150 bg-white p-12 text-center">
          <div className="mx-auto w-12 h-12 bg-rose-50 text-rose-800 flex items-center justify-center rounded-xl mb-4">
            <QrCode size={24} />
          </div>
          <h3 className="font-serif text-lg font-bold text-gray-900 leading-tight">
            {lang === "kh" ? "មិនទាន់មានកូដ QR វេរលុយឡើយ" : "No Cashier QR Envelopes Configured"}
          </h3>
          <p className="text-gray-500 text-xs mt-1.5 max-w-sm mx-auto">
            {lang === "kh" ? "សូមចុចប៊ូតុងនៅខាងលើដើម្បីបង្កើត និងកំណត់កូដ QR គណនីធនាគារដំបូងសម្រាប់កម្មវិធីរបស់អ្នក។" : "Click 'Add Bank QR' to store the first digital pathway to display on your wedding cash registration screens."}
          </p>
          <button
            onClick={handleOpenAddForm}
            className="mt-5 rounded-xl bg-rose-850 px-4 py-2.5 text-xs font-bold text-white shadow hover:bg-rose-900 transition-all select-none cursor-pointer"
          >
            {lang === "kh" ? "បង្កើតកូដ QR ដំបូង" : "Configure First QR Channel"}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {localQRs.map((qr) => (
            <div
              key={qr.id}
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between border-b border-gray-50 pb-3.5 mb-4">
                  <h3 className="flex items-center gap-1.5 font-serif text-sm font-bold text-gray-900">
                    <span className="bg-rose-50 text-rose-800 p-1.5 rounded-lg border border-rose-100/60 font-black text-xs leading-none">
                      {qr.currencyType === "USD" ? "USD/ដុល្លារ" : "RIEL/រៀល"}
                    </span>
                    <span className="truncate max-w-[130px] font-sans text-xs uppercase text-gray-500">
                      {qr.bankName || "BANK"}
                    </span>
                  </h3>
                  <div className="flex items-center gap-1.5">
                    <button
                      title="Edit option"
                      onClick={() => handleOpenEditForm(qr)}
                      className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-950 transition-all cursor-pointer"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      title="Delete option"
                      onClick={() => handleDeleteQR(qr.id, `${qr.bankName} - ${qr.accountNumber}`)}
                      className="rounded-lg p-1.5 text-rose-300 hover:bg-rose-50 hover:text-rose-850 transition-all cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Display QR view core */}
                <div className="my-4 flex justify-center">
                  {/* Always render premium card design. If screenshot is present, it will overlay inside the Scan Centerpiece perfectly. */}
                  {renderMockKHQR(qr.currencyType, qr.bankName || "", qr.accountName || "", qr.accountNumber || "", qr.qrImageUrl)}
                </div>

                <div className="mt-4 pt-3.5 border-t border-gray-50 text-center">
                  <span className="text-[11px] text-gray-600 italic block font-sans tracking-wide">
                    "{qr.description || "Digital Blessing QR"}"
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Inline Add Quick Card in place */}
          <div
            onClick={handleOpenAddForm}
            className="rounded-2xl border-2 border-dashed border-gray-250 bg-gray-50 hover:bg-gray-100/35 hover:border-rose-400/50 transition-all flex flex-col justify-center items-center p-8 text-center cursor-pointer min-h-[300px]"
          >
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-gray-400 mb-3 border border-gray-100">
              <Plus size={18} />
            </div>
            <p className="text-xs font-bold text-gray-600">{lang === "kh" ? "បន្ថែមគណនីបង់ប្រាក់ QR ថ្មី" : "Add Another Bank QR"}</p>
            <p className="text-[10px] text-gray-400 mt-1 max-w-[180px]">{lang === "kh" ? "ចុចដើម្បីដំណើរការបញ្ចូលគណនីធនាគារថ្មីមួយទៀតដោយសេរី" : "Expand your digital blessing routes by adding customized accounts"}</p>
          </div>
        </div>
      )}

      {/* QR Panel Confirmation modal */}
      {confirmModal?.isOpen && (
        <ConfirmationModal
          isOpen={confirmModal.isOpen}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmText={confirmModal.confirmText}
          cancelText={confirmModal.cancelText}
          type={confirmModal.type}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
    </div>
  );
}
