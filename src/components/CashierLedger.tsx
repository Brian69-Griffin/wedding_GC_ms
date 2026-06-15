import React, { useState, useEffect, useRef } from "react";
import {
  Plus, Search, SlidersHorizontal, ArrowUpDown, FileText, Download,
  Camera, Upload, Eye, CheckCircle2, DollarSign, RefreshCw, Trash2, Edit3,
  Calendar, MapPin, Notebook, UserCheck, ShieldAlert, Sparkles, AlertCircle,
  Printer
} from "lucide-react";
import { GiftRecord, QRCodeConfig } from "../types";
import { Language, translations } from "../i18n";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import ConfirmationModal from "./ConfirmationModal";
import LoadingSpinner from "./LoadingSpinner";

interface CashierLedgerProps {
  currentUser: any;
  activeWeddingId: string;
  onLogout: () => void;
  allGifts: GiftRecord[];
  qrcodes: QRCodeConfig[];
  onGiftLedgerUpdated: () => void;
  scannedMatchId: string | null;
  clearScannedMatch: () => void;
  onOpenFaceSearch: () => void;
  lang: Language;
  isNightMode?: boolean;
}

export default function CashierLedger({
  currentUser, activeWeddingId, onLogout, allGifts, qrcodes,
  onGiftLedgerUpdated, scannedMatchId, clearScannedMatch, onOpenFaceSearch, lang,
  isNightMode = false
}: CashierLedgerProps) {
  const t = translations[lang];

  // Local state for recording new gift
  const [formName, setFormName] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formRiel, setFormRiel] = useState<number | string>("");
  const [formUsd, setFormUsd] = useState<number | string>("");
  const [formNotes, setFormNotes] = useState("");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formImage, setFormImage] = useState<string | null>(null);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);

  // Client sorting, filtering, and searches
  const [searchQuery, setSearchQuery] = useState("");
  const [curFilter, setCurFilter] = useState<"ALL" | "USD" | "RIEL" | "MIXED">("ALL");
  const [sortField, setSortField] = useState<"date" | "name" | "amount">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [groupingMode, setGroupingMode] = useState<"list" | "address">("list");

  // Error/Success UI feedbacks
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formLoading, setFormLoading] = useState(false);

  // Camera capture inside form
  const [webcamFormActive, setWebcamFormActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: "info" | "danger" | "warning" | "success" | "logout";
    onConfirm: () => void;
  } | null>(null);

  // Statistics totals calculated dynamically in high precision
  const countTotalGuests = allGifts.length;
  const totalUSDCollected = allGifts.reduce((acc, curr) => acc + curr.amountUsd, 0);
  const totalRielCollected = allGifts.reduce((acc, curr) => acc + curr.amountRiel, 0);

  // Trigger focus when face search locates a guest
  useEffect(() => {
    if (scannedMatchId) {
      setSearchQuery("");
      setCurFilter("ALL");
      setGroupingMode("list");
      
      const targetElement = document.getElementById(`gift_item_${scannedMatchId}`);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
        targetElement.classList.add("bg-rose-50", "border-rose-300", "scale-[1.01]", "shadow-md");
        
        setTimeout(() => {
          targetElement.classList.remove("bg-rose-50", "border-rose-300", "scale-[1.01]", "shadow-md");
          clearScannedMatch(); // clean trigger state
        }, 3500);
      }
    }
  }, [scannedMatchId]);

  // Start Form Camera
  const startFormWebcam = async () => {
    setWebcamFormActive(true);
    setFormImage(null);
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 300, height: 300, facingMode: "user" }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setError("Unable to launch weapon camera. Try selecting a file instead.");
      setWebcamFormActive(false);
    }
  };

  // Stop Form Camera
  const stopFormWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setWebcamFormActive(false);
  };

  // Capture Form Camera Snapshot
  const captureFormPhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = 300;
      canvas.height = 300;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // center capture
        ctx.scale(-1, 1);
        ctx.translate(-300, 0);
        ctx.drawImage(videoRef.current, 0, 0, 300, 300);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8); // 80% JPEG compression
        setFormImage(dataUrl);
        stopFormWebcam();
      }
    }
  };

  // Compress and set uploaded file
  const handleFormFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 250; // Optimized size for extremely fast uploads on phones
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
        const dataUrl = canvas.toDataURL("image/jpeg", 0.6); // Client compressed to ultra-small size (~25KB-45KB) for maximum speed matching PC
        setFormImage(dataUrl);
        URL.revokeObjectURL(objectUrl);
      };
      img.onerror = () => {
        setError("Invalid image file selected.");
        URL.revokeObjectURL(objectUrl);
      };
      img.src = objectUrl;
    }
  };

  // Inner execute action for submitting/updating gift after confirmation is approved
  const executeSubmitGift = async () => {
    setFormLoading(true);
    setError("");
    setSuccess("");

    const payload = {
      fullName: formName,
      address: formAddress || "Unspecified",
      amountRiel: Number(formRiel) || 0,
      amountUsd: Number(formUsd) || 0,
      date: formDate,
      otherNotes: formNotes,
      imageUrl: formImage || undefined,
      removeImage: formImage === null,
    };

    try {
      const url = editingId ? `/api/gifts/${editingId}` : "/api/gifts";
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          "x-wedding-id": activeWeddingId,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to commit ledger entry to database");
      }

      setSuccess(
        editingId
          ? (lang === "kh" ? "បានធ្វើបច្ចុប្បន្នភាពទិន្នន័យចំណងដៃជោគជ័យ។" : "Digital transaction updated.")
          : (lang === "kh" ? "បានកត់ត្រាការជូនពរ និងថវិកាចំណងដៃដោយជោគជ័យ។" : "Blessing entry added successfully.")
      );
      
      // Reset form controls
      setFormName("");
      setFormAddress("");
      setFormRiel("");
      setFormUsd("");
      setFormNotes("");
      setFormImage(null);
      setEditingId(null);
      stopFormWebcam();
      
      onGiftLedgerUpdated();
    } catch (err: any) {
      setError(err.message || "Failed to communicate with local db engine.");
    } finally {
      setFormLoading(false);
    }
  };

  // Save/Edit submit handler
  const handleSubmitGift = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!formName) {
      setError(lang === "kh" ? "សូមបញ្ចូលឈ្មោះភ្ញៀវមកជាមុនសិន។" : "Please supply the Guest Full Name.");
      return;
    }

    // Double-confirmation for crucial submits (create/update)
    const confirmMsg = editingId
      ? t.confirmModifyGift
      : t.confirmSubmitGift;

    setConfirmModal({
      isOpen: true,
      title: editingId
               ? (lang === "kh" ? "បញ្ជាក់ការកែប្រែទិន្នន័យ" : "Confirm Modification")
               : (lang === "kh" ? "បញ្ជាក់ការកត់ត្រា" : "Confirm Cash Blessing"),
      message: confirmMsg,
      confirmText: lang === "kh" ? "យល់ព្រម" : "Yes, Proceed",
      cancelText: lang === "kh" ? "បោះបង់" : "No, Cancel",
      type: "warning",
      onConfirm: () => {
        setConfirmModal(null);
        executeSubmitGift();
      }
    });
  };

  const handleEditClick = (g: GiftRecord) => {
    setEditingId(g.id);
    setFormName(g.fullName);
    setFormAddress(g.address === "Unspecified" ? "" : g.address);
    setFormRiel(g.amountRiel === 0 ? "" : g.amountRiel);
    setFormUsd(g.amountUsd === 0 ? "" : g.amountUsd);
    setFormNotes(g.otherNotes || "");
    setFormDate(g.date);
    setFormImage(g.imageUrl || null);
    stopFormWebcam();

    // Scroll back to entry form elegantly
    document.getElementById("recording_form_root")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleDeleteClick = async (id: string, name: string) => {
    const confirmMsg = t.confirmDeleteGift;
    setConfirmModal({
      isOpen: true,
      title: lang === "kh" ? "លុបទិន្នន័យចំណងដៃ" : "Delete Gift Record",
      message: `${confirmMsg} (${name})?`,
      confirmText: lang === "kh" ? "លុបចោល" : "Delete",
      cancelText: lang === "kh" ? "បោះបង់" : "Cancel",
      type: "danger",
      onConfirm: async () => {
        setConfirmModal(null);
        setFormLoading(true);
        try {
          const response = await fetch(`/api/gifts/${id}`, {
            method: "DELETE",
            headers: {
              "x-wedding-id": activeWeddingId,
            },
          });

          if (response.ok) {
            setSuccess(
              lang === "kh"
                ? `បានលុបទិន្នន័យចំណងដៃរបស់ "${name}" ជាស្ថាពរ។`
                : `Meticulously purged transaction from "${name}".`
            );
            onGiftLedgerUpdated();
          } else {
            setError(lang === "kh" ? "ការលុបបរាជ័យ" : "Failed to purge ledger transaction");
          }
        } catch (err) {
          setError("Server connection disrupted deleting code");
        } finally {
          setFormLoading(false);
        }
      }
    });
  };

  const handleRemoveImageOnly = () => {
    setFormImage(null);
  };

  // Clean form cancels action
  const handleCancelEditing = () => {
    const executeCancel = () => {
      setEditingId(null);
      setFormName("");
      setFormAddress("");
      setFormRiel("");
      setFormUsd("");
      setFormNotes("");
      setFormImage(null);
      stopFormWebcam();
    };

    if (editingId) {
      const confirmMsg = t.confirmCancelEdit;
      setConfirmModal({
        isOpen: true,
        title: lang === "kh" ? "បោះបង់ការកែសម្រួល" : "Cancel Editing",
        message: confirmMsg,
        confirmText: lang === "kh" ? "បោះបង់ការកែសម្រួល" : "Discard Changes",
        cancelText: lang === "kh" ? "បន្តការកែប្រែ" : "Keep Editing",
        type: "warning",
        onConfirm: () => {
          setConfirmModal(null);
          executeCancel();
        }
      });
    } else {
      executeCancel();
    }
  };

  // Dynamic filtering, sorting, and grouping transformations on the fly
  const processedGifts = () => {
    let list = [...allGifts];

    // 1. Filter by keyword search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        g => g.fullName.toLowerCase().includes(q) || g.address.toLowerCase().includes(q)
      );
    }

    // 2. Filter by Currency
    if (curFilter !== "ALL") {
      if (curFilter === "USD") {
        list = list.filter(g => g.amountUsd > 0 && g.amountRiel === 0);
      } else if (curFilter === "RIEL") {
        list = list.filter(g => g.amountRiel > 0 && g.amountUsd === 0);
      } else if (curFilter === "MIXED") {
        list = list.filter(g => g.amountUsd > 0 && g.amountRiel > 0);
      }
    }

    // 3. Sorting logic
    list.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      if (sortField === "date") {
        valA = a.date;
        valB = b.date;
      } else if (sortField === "name") {
        valA = a.fullName.toLowerCase();
        valB = b.fullName.toLowerCase();
      } else if (sortField === "amount") {
        // Combined theoretic weight (e.g. 1 USD = 4000 KHR)
        valA = a.amountUsd + a.amountRiel / 4000;
        valB = b.amountUsd + b.amountRiel / 4000;
      }

      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return list;
  };

  // Group items by physical address
  const getGroupedByAddress = (items: GiftRecord[]) => {
    // Sort items by address to keep consecutive ones together
    const sorted = [...items].sort((a, b) => a.address.localeCompare(b.address));
    const groups: { [address: string]: GiftRecord[] } = {};
    
    sorted.forEach((item) => {
      const addr = item.address || "Unspecified";
      if (!groups[addr]) {
        groups[addr] = [];
      }
      groups[addr].push(item);
    });

    return groups;
  };

  // Client-side high fidelity pdf export with thumbnails
  const exportPDFLedger = () => {
    const doc = new jsPDF("p", "pt", "a4");
    
    // Page theme styling (Golden / Maroon Wedding vibes)
    doc.setFillColor(136, 19, 55); // maroon
    doc.rect(0, 0, 595, 80, "F");

    doc.setFont("Helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text(currentUser.weddingName || "Wedding Cash Registry List", 40, 42);

    doc.setFont("Helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(255, 244, 244);
    doc.text(`Official Digital Ledger Export • Compiled: ${new Date().toLocaleDateString()}`, 40, 60);

    // Dynamic stats header metrics
    doc.setFillColor(245, 245, 245);
    doc.rect(40, 100, 515, 45, "F");
    doc.setFontSize(9);
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(80, 80, 80);
    doc.text(`Total Attendants: ${countTotalGuests}`, 60, 126);
    doc.text(`Total Collections USD: $${totalUSDCollected.toLocaleString()}`, 200, 126);
    doc.text(`Total Collections Riel: ${totalRielCollected.toLocaleString()} KHR`, 380, 126);

    const columns = [
      { title: "No.", dataKey: "no" },
      { title: "Guest Full Name", dataKey: "name" },
      { title: "Primary Residency Address", dataKey: "address" },
      { title: "USD Amount", dataKey: "usd" },
      { title: "Riel Amount", dataKey: "riel" },
      { title: "Date Handed", dataKey: "date" },
      { title: "Other Ceremony Notes", dataKey: "notes" }
    ];

    const rows = allGifts.map((g, idx) => ({
      no: idx + 1,
      name: g.fullName,
      address: g.address,
      usd: g.amountUsd > 0 ? `$${g.amountUsd.toLocaleString()}` : "$0",
      riel: g.amountRiel > 0 ? `${g.amountRiel.toLocaleString()} KHR` : "0 KHR",
      date: g.date,
      notes: g.otherNotes || "-"
    }));

    (doc as any).autoTable({
      columns: columns,
      body: rows,
      startY: 170,
      margin: { left: 40, right: 40 },
      styles: { fontSize: 8, cellPadding: 8 },
      headStyles: { fillColor: [136, 19, 55], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        usd: { fontStyle: "bold", textColor: [150, 10, 10] },
        riel: { fontStyle: "bold", textColor: [15, 100, 15] }
      }
    });

    doc.save(`Ceremony_Cash_Gift_Ledger-${activeWeddingId}.pdf`);
  };

  // Client-side high fidelity excel sheet export
  const exportExcelLedger = () => {
    const wsData = [
      ["WEDDING RECEPTION CASH GIFT DIGITAL LEDGER"],
      ["Wedding Name", currentUser.weddingName],
      ["Export Date", new Date().toLocaleString()],
      ["Total Attendants", countTotalGuests],
      ["Grand Total USD", `${totalUSDCollected} USD`],
      ["Grand Total Riel", `${totalRielCollected} KHR`],
      [],
      ["Guest Full Name", "Primary Address", "USD Gift Value", "Riel Gift Value", "Recipient Date", "Other Ledger Notes", "Created At"]
    ];

    allGifts.forEach((g) => {
      wsData.push([
        g.fullName,
        g.address,
        g.amountUsd,
        g.amountRiel,
        g.date,
        g.otherNotes || "",
        new Date(g.createdAt).toLocaleString()
      ]);
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Apply basic column widths
    const colWidths = [
      { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 30 }, { wch: 22 }
    ];
    ws["!cols"] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, "Ceremony Ledger Output");
    XLSX.writeFile(wb, `Wedding_Cash_Gifts-${activeWeddingId}.xlsx`);
  };

  const confirmLogoutAction = () => {
    const confirmMsg = t.confirmLogout;
    setConfirmModal({
      isOpen: true,
      title: lang === "kh" ? "ចាកចេញពីប្រព័ន្ធ" : "Sign Out",
      message: confirmMsg,
      confirmText: lang === "kh" ? "ចាកចេញ" : "Sign Out",
      cancelText: lang === "kh" ? "បោះបង់" : "Cancel",
      type: "logout",
      onConfirm: () => {
        onLogout();
        setConfirmModal(null);
      }
    });
  };

  const finalGiftsToRender = processedGifts();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* Wedding Reception Greeting banner */}
      <div className="mb-8 p-6 rounded-2xl border border-rose-100 bg-white shadow-xl shadow-rose-50/30 flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden">
        {/* Heart background pattern */}
        <div className="absolute right-0 top-0 text-rose-50 opacity-20 pointer-events-none select-none text-[200px] leading-none translate-x-[40px] translate-y-[-40px]">
          ♥
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left relative z-10 w-full sm:w-auto">
          <div className="flex h-14 w-14 shrink-0 mx-auto sm:mx-0 items-center justify-center rounded-full bg-rose-50 border border-rose-100 text-rose-800">
            <Notebook size={28} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-widest text-rose-800 block">
              {lang === "kh" ? "សៀវភៅកត់ត្រាចំណងដៃឌីជីថល" : "Active Digital Desk Ledger"}
            </span>
            <h1 className="font-serif text-2xl font-bold text-gray-900 mt-1 leading-snug">
              {currentUser.weddingName || (lang === "kh" ? "គណនីរក្សាទុកចំណងដៃរបស់ខ្ញុំ" : "My Saved Ceremony Workspace")}
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {lang === "kh" ? "ចុះឈ្មោះភ្ញៀវ កត់ត្រាថវិកាបាវចនា ឬកូដ QR ផ្ទៀងផ្ទាត់សម្រាប់ការផ្សព្វផ្សាយ" : "Securely register guest names, cash envelopes, digital QR proof snapshots."}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 relative z-10 w-full sm:w-auto justify-center sm:justify-end">
          <button
            id="face_search_trigger_btn"
            onClick={onOpenFaceSearch}
            className="flex items-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-850 hover:bg-rose-100 transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <Camera size={14} />
            <span>{t.searchByFaceBtn}</span>
          </button>
        </div>
      </div>

      {/* Ceremony Overview statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Card 1: Attended Guests */}
        <div className={`rounded-2xl border p-5 shadow-sm hover:shadow transition-all flex items-center justify-between ${
          isNightMode 
            ? "bg-black/35 border-amber-500/25 text-white" 
            : "bg-white border-gray-100 text-gray-950"
        }`}>
          <div className="truncate">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t.attendedGuests}</p>
            <h3 className={`text-3xl font-black font-sans tracking-tight mt-1 ${isNightMode ? "text-amber-300" : "text-gray-950"}`}>
              {countTotalGuests}
            </h3>
            <p className="text-[10px] text-gray-400 mt-1">{lang === "kh" ? "បានចុះបញ្ជីរួចរាល់" : "Fully recorded transactions"}</p>
          </div>
          <div className={`h-10 w-10 flex items-center justify-center rounded-lg shrink-0 ${
            isNightMode ? "bg-amber-500/15 text-amber-400" : "bg-rose-50 text-rose-800"
          }`}>
            <UserCheck size={18} />
          </div>
        </div>

        {/* Card 2: Grand Total USD */}
        <div className={`rounded-2xl border p-5 shadow-sm hover:shadow transition-all flex items-center justify-between ${
          isNightMode 
            ? "bg-black/35 border-amber-500/25 text-white" 
            : "bg-white border-gray-100 text-gray-950"
        }`}>
          <div className="truncate">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t.grandTotalUSD}</p>
            <h3 className={`text-3xl font-black font-sans tracking-tight mt-1 ${isNightMode ? "text-amber-300" : "text-rose-850"}`}>
              ${totalUSDCollected.toLocaleString()}
            </h3>
            <p className="text-[10px] text-gray-400 mt-1">{lang === "kh" ? "ក្រដាស់ប្រាក់ដុល្លារ ($)" : "In official bank notes"}</p>
          </div>
          <div className={`h-10 w-10 flex items-center justify-center rounded-lg shrink-0 ${
            isNightMode ? "bg-amber-500/15 text-amber-400" : "bg-amber-50 text-amber-850"
          }`}>
            <DollarSign size={18} />
          </div>
        </div>

        {/* Card 3: Grand Total KHR */}
        <div className={`rounded-2xl border p-5 shadow-sm hover:shadow transition-all flex items-center justify-between ${
          isNightMode 
            ? "bg-black/35 border-amber-500/25 text-white" 
            : "bg-white border-gray-100 text-gray-950"
        }`}>
          <div className="truncate">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t.grandTotalRiel}</p>
            <h3 className={`text-3xl font-black font-sans tracking-tight mt-1 ${isNightMode ? "text-emerald-450" : "text-emerald-800"}`}>
              {totalRielCollected.toLocaleString()} <span className="text-xs font-normal text-gray-400">KHR</span>
            </h3>
            <p className="text-[10px] text-gray-400 mt-1">{lang === "kh" ? "ក្រដាស់ប្រាក់រៀលជាតិ" : "Khmer National Currency"}</p>
          </div>
          <div className={`h-10 w-10 flex items-center justify-center rounded-lg shrink-0 ${
            isNightMode ? "bg-emerald-500/15 text-emerald-400" : "bg-emerald-50 text-emerald-800"
          }`}>
            <RefreshCw size={18} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Adding or Editing entries */}
        <div className="lg:col-span-5" id="recording_form_root">
          <div className={`rounded-2xl border p-6 shadow-md transition-all ${
            isNightMode 
              ? "bg-black/35 border-amber-500/25 text-white" 
              : "bg-white border-gray-100 shadow-md text-gray-900"
          }`}>
            <div className={`border-b pb-4 mb-6 flex justify-between items-center ${isNightMode ? "border-amber-500/10" : "border-gray-50"}`}>
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Sparkles className={isNightMode ? "text-amber-400" : "text-rose-800"} size={18} />
                <span className={isNightMode ? "text-amber-100" : "text-gray-900"}>{editingId ? t.modifyBlessingEntry : t.newCashBlessing}</span>
              </h2>
              {editingId && (
                <button
                  onClick={handleCancelEditing}
                  className={`text-xs underline font-medium ${isNightMode ? "text-amber-400 hover:text-amber-200" : "text-rose-800 hover:text-rose-950"}`}
                >
                  {t.cancelEdit}
                </button>
              )}
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-rose-100 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 rounded-xl border border-emerald-150 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-850 flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmitGift} className="space-y-4">
               <div>
                 <label className={`block text-xs font-bold uppercase ${isNightMode ? "text-amber-400" : "text-gray-500"}`}>{t.guestNameLabel}</label>
                 <input
                   id="form_guest_name"
                   type="text"
                   required
                   value={formName}
                   onChange={(e) => setFormName(e.target.value)}
                   placeholder="e.g. Sok Sokha"
                   style={{ colorScheme: isNightMode ? "dark" : "light" }}
                   className={`w-full mt-1 rounded-xl border p-3 text-sm outline-none transition-all ${
                     isNightMode 
                       ? "bg-black/30 border-amber-500/20 text-white placeholder-gray-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-250" 
                       : "bg-white border-gray-200 text-gray-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-100"
                   }`}
                 />
               </div>
 
               <div>
                 <label className={`block text-xs font-bold uppercase ${isNightMode ? "text-amber-400" : "text-gray-500"}`}>{t.guestAddressLabel}</label>
                 <input
                   id="form_guest_address"
                   type="text"
                   value={formAddress}
                   onChange={(e) => setFormAddress(e.target.value)}
                   placeholder="e.g. Mao Tse Toung Road, Phnom Penh"
                   style={{ colorScheme: isNightMode ? "dark" : "light" }}
                   className={`w-full mt-1 rounded-xl border p-3 text-sm outline-none transition-all ${
                     isNightMode 
                       ? "bg-black/30 border-amber-500/20 text-white placeholder-gray-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-250" 
                       : "bg-white border-gray-200 text-gray-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-100"
                   }`}
                 />
               </div>
 
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className={`block text-xs font-bold uppercase ${isNightMode ? "text-amber-400" : "text-gray-500"}`}>{t.usdAmountLabel}</label>
                   <input
                     id="form_amount_usd"
                     type="number"
                     min="0"
                     value={formUsd}
                     onChange={(e) => setFormUsd(e.target.value === "" ? "" : Number(e.target.value))}
                     placeholder="e.g. 50"
                     style={{ colorScheme: isNightMode ? "dark" : "light" }}
                     className={`w-full mt-1 rounded-xl border p-3 text-sm font-semibold outline-none transition-all ${
                       isNightMode 
                         ? "bg-black/30 border-amber-500/20 text-amber-300 placeholder-amber-700/50 focus:border-amber-400 focus:ring-1 focus:ring-amber-250" 
                         : "bg-white border-gray-200 text-rose-900 focus:border-rose-500 focus:ring-1 focus:ring-rose-100"
                     }`}
                   />
                 </div>
                 <div>
                   <label className={`block text-xs font-bold uppercase ${isNightMode ? "text-amber-400" : "text-gray-500"}`}>{t.rielAmountLabel}</label>
                   <input
                     id="form_amount_riel"
                     type="number"
                     min="0"
                     value={formRiel}
                     onChange={(e) => setFormRiel(e.target.value === "" ? "" : Number(e.target.value))}
                     placeholder="e.g. 200000"
                     style={{ colorScheme: isNightMode ? "dark" : "light" }}
                     className={`w-full mt-1 rounded-xl border p-3 text-sm font-semibold outline-none transition-all ${
                       isNightMode 
                         ? "bg-black/30 border-amber-500/20 text-emerald-300 placeholder-emerald-700/50 focus:border-amber-400 focus:ring-1 focus:ring-amber-250" 
                         : "bg-white border-gray-200 text-emerald-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-100"
                     }`}
                   />
                 </div>
               </div>
 
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className={`block text-xs font-bold uppercase ${isNightMode ? "text-amber-400" : "text-gray-500"}`}>{lang === "kh" ? "កាលបរិច្ឆេទទទួល" : "Receiving Date"}</label>
                   <input
                     type="date"
                     value={formDate}
                     onChange={(e) => setFormDate(e.target.value)}
                     style={{ colorScheme: isNightMode ? "dark" : "light" }}
                     className={`w-full mt-1 rounded-xl border p-3 text-xs outline-none transition-all ${
                       isNightMode 
                         ? "bg-black/30 border-amber-500/20 text-white focus:border-amber-400 focus:ring-1 focus:ring-amber-250" 
                         : "bg-white border-gray-200 text-gray-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-100"
                     }`}
                   />
                 </div>
                <div className="flex flex-col justify-end">
                  <p className="text-[10px] text-gray-400 leading-normal">
                    {lang === "kh"
                      ? "*ភ្ញៀវអាចចូលរួមចំណងដៃជាលុយរៀល និងលុយដុល្លារលាយគ្នាក្នុងស្រោមសំបុត្រតែមួយបាន។"
                      : "*Guests can contribute mixed Riel + USD cash in a single envelope as per tradition."}
                  </p>
                </div>
              </div>

              <div>
                <label className={`block text-xs font-bold uppercase ${isNightMode ? "text-amber-400" : "text-gray-500"}`}>{t.notesLabel}</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Handed to Dara's cousin. ABA reference shown."
                  rows={2}
                  style={{ colorScheme: isNightMode ? "dark" : "light" }}
                  className={`w-full mt-1 rounded-xl border p-3 text-xs outline-none resize-none transition-all ${
                    isNightMode 
                      ? "bg-black/30 border-amber-500/20 text-white placeholder-gray-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-250" 
                      : "bg-white border-gray-200 text-gray-700 focus:border-rose-500 focus:ring-1 focus:ring-rose-100"
                  }`}
                />
              </div>

              {/* Guest Face Photo Attachment */}
              <div>
                <label className={`block text-xs font-bold uppercase mb-2 ${isNightMode ? "text-amber-400" : "text-gray-500"}`}>{t.guestIdentitySnapshot}</label>
                
                <div className={`rounded-xl border border-dashed p-4 text-center relative overflow-hidden min-h-[140px] flex flex-col justify-center items-center transition-all ${
                  isNightMode ? "bg-black/30 border-amber-500/20 text-white" : "bg-gray-50 border-gray-250 text-gray-800"
                }`}>
                  {webcamFormActive ? (
                    <div className="w-full">
                      <video ref={videoRef} className="mx-auto rounded-lg h-28 w-28 object-cover bg-black scale-x-[-1]" />
                      <button
                        type="button"
                        onClick={captureFormPhoto}
                        className="mt-2 text-[10px] bg-rose-800 text-white font-bold py-1 px-3 rounded-full hover:bg-rose-900 cursor-pointer"
                      >
                        {lang === "kh" ? "ថតរូបភាព" : "Capture Frame"}
                      </button>
                    </div>
                  ) : formImage ? (
                    <div className="text-center relative">
                      <img
                        src={formImage}
                        alt="attachment view"
                        className="mx-auto h-24 w-24 object-cover rounded-xl shadow border border-rose-100"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveImageOnly}
                        className="absolute -top-1 -right-1 h-5 w-5 bg-red-150 text-red-700 border border-red-200 rounded-full flex items-center justify-center text-[10px] font-bold hover:bg-red-200 focus:outline-none"
                        title="Delete image only"
                      >
                        ×
                      </button>
                      <p className="text-[9px] text-gray-400 mt-2">{lang === "kh" ? "រូបភាពត្រូវបានរក្សាទុកសម្រាប់សម្របសម្រួលស្វែងរក។" : "1 image stored for search matching."}</p>
                    </div>
                  ) : (
                    <div>
                      <Camera className="mx-auto text-gray-300 mb-1" size={24} />
                      <p className="text-[10px] text-gray-400">{lang === "kh" ? "ប្រសិនបើភ្ញៀវអនុញ្ញាត សូមថតរូបពួកគេ" : "If guest grants permission, take a photo"}</p>
                      
                      <div className="mt-3 flex gap-2 justify-center">
                        <button
                          type="button"
                          onClick={startFormWebcam}
                          className={`flex items-center gap-1 border rounded px-2.5 py-1 text-[9px] font-bold transition-all cursor-pointer ${
                            isNightMode ? "bg-amber-955/40 border-amber-500/30 text-amber-300 hover:bg-amber-955/65" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          <Camera size={10} />
                          {lang === "kh" ? "ម៉ាស៊ីនថតកាមេរ៉ា" : "Webcam Snap"}
                        </button>
                        <label className={`flex items-center gap-1 border rounded px-2.5 py-1 text-[9px] font-bold transition-all cursor-pointer ${
                          isNightMode ? "bg-amber-955/40 border-amber-500/30 text-amber-300 hover:bg-amber-955/65" : "bg-white border-gray-200 text-gray-700 hover:bg-gray-100"
                        }`}>
                          <Upload size={10} />
                          {lang === "kh" ? "បញ្ជូនឯកសារ" : "File Upload"}
                          <input type="file" accept="image/*" onChange={handleFormFileUpload} className="hidden" />
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-50 flex gap-3">
                {editingId && (
                  <button
                    type="button"
                    onClick={handleCancelEditing}
                    className="flex-1 rounded-xl bg-gray-100 py-3 text-xs font-bold text-gray-600 hover:bg-gray-200 cursor-pointer"
                  >
                    {t.cancelEdit}
                  </button>
                )}
                <button
                  id="ledger_form_submit_btn"
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 rounded-xl bg-rose-850 py-3 text-xs font-bold text-white shadow hover:bg-rose-900 transition-all cursor-pointer select-none"
                >
                  {formLoading
                    ? (lang === "kh" ? "កំពុងរក្សាទុកក្នុងប្រព័ន្ធ..." : "Saving Envelopes on Cloud...")
                    : editingId
                      ? (lang === "kh" ? "បញ្ជាក់ការកែប្រែទិន្នន័យ" : "Confirm Ledger Changes")
                      : (lang === "kh" ? "កត់ត្រាថវិកាពរជ័យ" : "Commit Blessing Cash")}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side: Ledger Table, Groupings, Searches, Exports */}
        <div className="lg:col-span-7">
          <div className={`rounded-2xl border p-6 shadow-md transition-all ${
            isNightMode 
              ? "bg-black/35 border-amber-500/25 text-white" 
              : "bg-white border-gray-100 shadow-md text-gray-900"
          }`}>
            {/* Action Bar: Search, Filters, Groupings */}
            <div className={`flex flex-col gap-4 border-b pb-5 mb-5 md:flex-row md:items-center md:justify-between ${
              isNightMode ? "border-amber-500/10" : "border-gray-50"
            }`}>
              <div className="relative flex-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <Search size={14} />
                </span>
                <input
                  id="search_ledger_input"
                  type="text"
                  placeholder={lang === "kh" ? "ស្វែងរកឈ្មោះភ្ញៀវ ឬអាសយដ្ឋាន..." : "Query guest names or addresses..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ colorScheme: isNightMode ? "dark" : "light" }}
                  className={`w-full rounded-xl border py-2 pl-9 pr-4 text-xs outline-none transition-all ${
                    isNightMode 
                      ? "bg-black/30 border-amber-500/20 text-white placeholder-gray-650 focus:border-amber-400 focus:ring-1 focus:ring-amber-250" 
                      : "bg-white border-gray-200 text-gray-800 focus:border-rose-500 focus:ring-1 focus:ring-rose-100"
                  }`}
                />
              </div>

              {/* Grouping Toggle */}
              <div className={`flex items-center gap-1 p-1 rounded-xl border transition-all self-start ${
                isNightMode ? "bg-[#100101]/40 border-amber-500/20" : "bg-gray-50 border-gray-150"
              }`}>
                <button
                  id="view_grouped_list_btn"
                  onClick={() => setGroupingMode("list")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none transition-all cursor-pointer ${
                    groupingMode === "list" 
                      ? (isNightMode ? "bg-amber-955 text-amber-300 font-bold shadow-sm" : "bg-white text-rose-850 shadow-sm font-bold") 
                      : (isNightMode ? "text-amber-500/65 hover:text-amber-350" : "text-gray-500 hover:text-gray-900")
                  }`}
                >
                  {lang === "kh" ? "បញ្ជីរាយនាមទាំងអស់" : "Full Directory"}
                </button>
                <button
                  id="view_grouped_address_btn"
                  onClick={() => setGroupingMode("address")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold select-none transition-all cursor-pointer ${
                    groupingMode === "address" 
                      ? (isNightMode ? "bg-amber-955 text-amber-300 font-bold shadow-sm" : "bg-white text-rose-850 shadow-sm font-bold") 
                      : (isNightMode ? "text-amber-500/65 hover:text-amber-350" : "text-gray-500 hover:text-gray-900")
                  }`}
                >
                  {lang === "kh" ? "ក្រុមតាមអាសយដ្ឋាន" : "Group by Address"}
                </button>
              </div>
            </div>

            {/* Sub-Filters: Sort variables, Currency filters, Export Buttons */}
            <div className={`flex flex-col gap-4 pb-5 border-b mb-5 md:flex-row md:items-center md:justify-between ${
              isNightMode ? "border-amber-500/10" : "border-gray-50"
            }`}>
              
              {/* Currency pills filter */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`text-[10px] uppercase font-bold mr-1.5 ${
                  isNightMode ? "text-amber-500/80" : "text-gray-400"
                }`}>{lang === "kh" ? "បង្ហាញ:" : "Show:"}</span>
                {(["ALL", "USD", "RIEL", "MIXED"] as const).map((fil) => (
                  <button
                    key={fil}
                    onClick={() => setCurFilter(fil)}
                    className={`rounded-full px-2.5 py-1 text-[10px] font-bold select-none cursor-pointer border transition-all ${
                      curFilter === fil
                        ? (isNightMode ? "bg-amber-950 text-amber-300 border-amber-500/30 font-black" : "bg-rose-50 text-rose-800 border-rose-200 font-black")
                        : (isNightMode ? "bg-black/30 text-amber-400/70 border-amber-500/20 hover:bg-black/50 hover:text-amber-300" : "bg-white text-gray-500 border-gray-150 hover:bg-gray-50 hover:text-gray-800")
                    }`}
                  >
                    {fil === "ALL" && (lang === "kh" ? "ស្រោមសំបុត្រទាំងអស់" : "All Envelopes")}
                    {fil === "USD" && (lang === "kh" ? "លុយដុល្លារប៉ុណ្ណោះ" : "USD Only")}
                    {fil === "RIEL" && (lang === "kh" ? "លុយរៀលប៉ុណ្ណោះ" : "Riel Only")}
                    {fil === "MIXED" && (lang === "kh" ? "លាយទាំងពីរ" : "Mixed Both")}
                  </button>
                ))}
              </div>

              {/* PDF & Excel & Printing exports */}
              <div className="flex items-center gap-2 justify-end self-start">
                <button
                  id="print_ledger_button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-bold text-amber-900 hover:bg-amber-100 cursor-pointer shadow-sm select-none transition-all active:scale-95"
                  title="Print custom wedding gift ledger folder directly"
                >
                  <Printer size={11} className="text-amber-700 animate-pulse" />
                  <span>{lang === "kh" ? "បោះពុម្ពបញ្ជី" : "Print Ledger"}</span>
                </button>
                <button
                  id="export_pdf_button"
                  onClick={exportPDFLedger}
                  className="flex items-center gap-1 rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-[10px] font-bold text-rose-800 hover:bg-rose-100 cursor-pointer shadow-sm"
                  title="Export official printable guest list PDF"
                >
                  <FileText size={11} />
                  <span>PDF Directory</span>
                </button>
                <button
                  id="export_excel_button"
                  onClick={exportExcelLedger}
                  className="flex items-center gap-1 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer shadow-sm"
                  title="Export records to editable Excel spreadsheet"
                >
                  <Download size={11} />
                  <span>Excel Ledger</span>
                </button>
              </div>
            </div>

            {/* Sorter Variables select bar - Modern Dropdown List */}
            <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl mb-4 border text-[11px] font-bold ${
              isNightMode ? "bg-black/35 border-amber-500/10 text-amber-200" : "bg-gray-50/50 border-gray-100 text-gray-700"
            }`}>
              <div className="flex items-center gap-2">
                <ArrowUpDown size={13} className={isNightMode ? "text-amber-400" : "text-rose-800"} />
                <span>{lang === "kh" ? "តម្រៀបតាមការកំណត់:" : "Sort Ledger Records By:"}</span>
              </div>
              <div className="relative w-full sm:w-72">
                <select
                  value={`${sortField}-${sortOrder}`}
                  onChange={(e) => {
                    const [field, order] = e.target.value.split("-");
                    setSortField(field as "date" | "name" | "amount");
                    setSortOrder(order as "asc" | "desc");
                  }}
                  className={`w-full appearance-none rounded-lg border px-3.5 py-1.5 pr-8 text-xs font-semibold focus:outline-none focus:ring-1 cursor-pointer transition-all ${
                    isNightMode 
                      ? "bg-zinc-950 border-amber-500/15 text-amber-100 focus:border-amber-500/40 focus:ring-amber-500" 
                      : "bg-white border-gray-200 text-gray-800 focus:border-rose-500 focus:ring-rose-200"
                  }`}
                >
                  <option value="date-desc">{lang === "kh" ? "កាលបរិច្ឆេទ: ថ្មីបំផុតមុន" : "Date: Newest First"}</option>
                  <option value="date-asc">{lang === "kh" ? "កាលបរិច្ឆេទ: ចាស់បំផុតមុន" : "Date: Oldest First"}</option>
                  <option value="name-asc">{lang === "kh" ? "ឈ្មោះភ្ញៀវ: ក - ហ" : "Guest Name: A to Z"}</option>
                  <option value="name-desc">{lang === "kh" ? "ឈ្មោះភ្ញៀវ: ហ - ក" : "Guest Name: Z to A"}</option>
                  <option value="amount-desc">{lang === "kh" ? "ទឹកប្រាក់: ច្រើនទៅតិច (ខ្ពស់បំផុត)" : "Cash: Highest to Lowest"}</option>
                  <option value="amount-asc">{lang === "kh" ? "ទឹកប្រាក់: តិចទៅច្រើន (ទាបបំផុត)" : "Cash: Lowest to Highest"}</option>
                </select>
                <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-400">
                  <span className="text-[8px]">▼</span>
                </div>
              </div>
            </div>

            {/* Main Registry render container */}
            {finalGiftsToRender.length === 0 ? (
              <div className={`flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-2xl transition-all ${
                isNightMode ? "bg-black/25 border-amber-500/15" : "bg-gray-50/30 border-gray-150"
              }`}>
                <ShieldAlert className="text-gray-300 mb-2 font-light" size={40} />
                <p className={`text-sm font-semibold ${isNightMode ? "text-amber-100" : "text-gray-750"}`}>No entry records matching parameters</p>
                <p className="text-xs text-gray-400 mt-1 max-w-[200px] leading-normal mx-auto">
                  Verify search spelling, adjust currency sub-filters, or click face scan to trace matches.
                </p>
              </div>
            ) : groupingMode === "address" ? (
              /* Address Grouping Visual Board */
              <div className="space-y-6 text-left">
                {Object.entries(getGroupedByAddress(finalGiftsToRender)).map(([addr, items]) => (
                  <div key={addr} className={`rounded-xl border shadow-sm overflow-hidden transition-all ${
                    isNightMode ? "bg-black/35 border-amber-500/20 text-white" : "bg-white border-gray-100"
                  }`}>
                    {/* Visual explore header */}
                    <div className={`p-3 flex items-center justify-between border-b ${
                      isNightMode ? "bg-amber-955/20 border-amber-500/10 text-amber-350" : "bg-rose-50/30 border-rose-100/40"
                    }`}>
                      <div className="flex items-center gap-1.5 truncate">
                        <MapPin size={13} className={isNightMode ? "text-amber-450 shrink-0" : "text-rose-800 shrink-0"} />
                        <h4 className={`text-xs font-black truncate ${isNightMode ? "text-amber-100" : "text-rose-955"}`}>{addr}</h4>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[9px] font-bold ${
                        isNightMode ? "bg-amber-500/15 text-amber-300" : "bg-rose-100 text-rose-900"
                      }`}>
                        {items.length} Representatives
                      </span>
                    </div>

                    {/* Group rows list */}
                    <div className={`divide-y ${isNightMode ? "divide-amber-500/10" : "divide-gray-50"}`}>
                      {items.map((g) => (
                        <div
                          id={`gift_item_${g.id}`}
                          key={g.id}
                          className={`p-3 flex items-center justify-between gap-4 transition-all ${
                            isNightMode ? "bg-transparent hover:bg-amber-950/10" : "bg-white hover:bg-rose-50/5"
                          }`}
                        >
                          <div className="flex items-center gap-3 truncate">
                            {g.imageUrl ? (
                              <img
                                src={g.imageUrl}
                                alt="guest preview"
                                className={`h-9 w-9 rounded-lg object-cover shrink-0 border ${
                                  isNightMode ? "border-amber-500/15" : "border-gray-100"
                                }`}
                              />
                            ) : (
                              <div className={`h-9 w-9 font-serif text-xs font-bold rounded-lg flex items-center justify-center shrink-0 border ${
                                isNightMode ? "bg-amber-950/10 border-amber-500/20 text-amber-300" : "bg-rose-50 border-rose-100 text-rose-700"
                              }`}>
                                {g.fullName.charAt(0)}
                              </div>
                            )}

                            <div className="truncate">
                              <p className={`text-xs font-bold leading-tight truncate ${isNightMode ? "text-amber-100" : "text-gray-900"}`}>{g.fullName}</p>
                              {g.otherNotes && (
                                <p className="text-[10px] text-gray-400 truncate mt-1 leading-none">{g.otherNotes}</p>
                              )}
                              <p className="text-[8px] text-gray-400 font-mono mt-1 flex items-center gap-1">
                                <Calendar size={9} />
                                <span>{g.date}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            {/* Contributions values display side by side */}
                            <div className="text-right">
                              {g.amountUsd > 0 && (
                                <p className={`text-xs font-bold tracking-tight font-serif ${isNightMode ? "text-amber-300" : "text-rose-900"}`}>${g.amountUsd.toLocaleString()}</p>
                              )}
                              {g.amountRiel > 0 && (
                                <p className={`text-[10px] font-black mt-0.5 font-sans ${isNightMode ? "text-emerald-400" : "text-emerald-850"}`}>
                                  {g.amountRiel.toLocaleString()} <span className="text-[8px] font-normal text-gray-400">KHR</span>
                                </p>
                              )}
                            </div>

                            <div className={`flex items-center gap-1 border-l pl-3 ${isNightMode ? "border-amber-500/10" : "border-gray-100"}`}>
                              <button
                                onClick={() => handleEditClick(g)}
                                className={`p-1 transition-all rounded ${
                                  isNightMode ? "text-amber-500 hover:text-amber-300 hover:bg-amber-500/10" : "text-gray-400 hover:text-rose-800 hover:bg-rose-50"
                                }`}
                                title="Edit Blessing values"
                              >
                                <Edit3 size={12} />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(g.id, g.fullName)}
                                className={`p-1 transition-all rounded ${
                                  isNightMode ? "text-rose-400 hover:text-rose-300 hover:bg-rose-500/10" : "text-gray-400 hover:text-red-700 hover:bg-red-50"
                                }`}
                                title="Purge from ledger"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Flat directory list view */
              <div className={`divide-y border rounded-xl overflow-hidden shadow-sm transition-all ${
                isNightMode ? "divide-amber-500/10 border-amber-500/15" : "divide-gray-100 border-gray-100"
              }`}>
                {finalGiftsToRender.map((g) => (
                  <div
                    id={`gift_item_${g.id}`}
                    key={g.id}
                    className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                      isNightMode ? "bg-black/25 hover:bg-amber-955/10 text-gray-200" : "bg-white hover:bg-rose-50/5 text-gray-900"
                    }`}
                  >
                    <div className="flex items-start gap-3.5 truncate text-left font-sans">
                      {g.imageUrl ? (
                        <div className="relative group shrink-0">
                          <img
                            src={g.imageUrl}
                            alt="avatar snapshot"
                            className={`h-10 w-10 shrink-0 rounded-xl object-cover border ${
                              isNightMode ? "border-amber-500/15" : "border-gray-100"
                            }`}
                          />
                        </div>
                      ) : (
                        <div className={`h-10 w-10 shrink-0 font-serif text-sm font-bold rounded-xl flex items-center justify-center border ${
                          isNightMode ? "bg-amber-955/20 border-amber-500/20 text-amber-300" : "bg-rose-50 border-rose-100 text-rose-800"
                        }`}>
                          {g.fullName.charAt(0)}
                        </div>
                      )}

                      <div className="truncate">
                        <h4 className={`text-xs font-extrabold leading-tight truncate ${isNightMode ? "text-amber-200" : "text-gray-900"}`}>{g.fullName}</h4>
                        <p className={`text-[10px] flex items-center gap-1 mt-1 truncate ${isNightMode ? "text-gray-400" : "text-gray-500"}`}>
                          <MapPin size={9} className="text-gray-400 animate-pulse" />
                          <span className="truncate">{g.address}</span>
                        </p>
                        {g.otherNotes && (
                          <p className="text-[10px] text-gray-400 leading-snug truncate mt-1">{g.otherNotes}</p>
                        )}
                        <p className="text-[8px] text-gray-400 mt-1 font-mono flex items-center gap-1 leading-none">
                          <Calendar size={9} />
                          <span>Registered contribution date {g.date}</span>
                        </p>
                      </div>
                    </div>

                    <div className={`flex items-center justify-between sm:justify-end gap-5 border-t sm:border-0 pt-3.5 sm:pt-0 shrink-0 ${
                      isNightMode ? "border-amber-500/5" : "border-gray-50"
                    }`}>
                      {/* Cash value denominations */}
                      <div className="text-left sm:text-right">
                        {g.amountUsd > 0 && (
                          <p className={`text-sm font-extrabold font-serif tracking-tight ${isNightMode ? "text-amber-300" : "text-rose-900"}`}>
                            ${g.amountUsd.toLocaleString()}
                          </p>
                        )}
                        {g.amountRiel > 0 && (
                          <p className={`text-xs font-extrabold mt-0.5 tracking-tight ${isNightMode ? "text-emerald-400" : "text-emerald-800"}`}>
                            {g.amountRiel.toLocaleString()} <span className="text-[8px] font-normal text-gray-400">KHR</span>
                          </p>
                        )}
                        {g.amountUsd === 0 && g.amountRiel === 0 && (
                          <p className="text-[10px] text-gray-400">Signature Only</p>
                        )}
                      </div>

                      <div className={`flex items-center gap-1.5 border-l pl-4 ${isNightMode ? "border-amber-500/10" : "border-gray-100"}`}>
                        <button
                          id={`edit_gift_btn_${g.id}`}
                          onClick={() => handleEditClick(g)}
                          className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
                            isNightMode ? "border-amber-500/15 text-amber-500 hover:text-amber-300 hover:bg-amber-500/10" : "border-gray-100 text-gray-500 hover:text-rose-800 hover:bg-rose-50"
                          }`}
                          title="Modify Ledger details"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          id={`delete_gift_btn_${g.id}`}
                          onClick={() => handleDeleteClick(g.id, g.fullName)}
                          className={`h-8 w-8 flex items-center justify-center rounded-lg border transition-all cursor-pointer ${
                            isNightMode ? "border-rose-900/40 text-rose-350 hover:bg-rose-500/10" : "border-red-50 text-red-650 hover:bg-red-50"
                          }`}
                          title="Erase transaction"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Confirmation Dialog */}
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

      {/* Saving / Deleting Ledger Loading States */}
      {formLoading && (
        <LoadingSpinner 
          overlay 
          message={lang === "kh" ? "កំពុងកត់ត្រា និងដោះស្រាយទិន្នន័យ..." : "Synchronizing ledger entry on cloud..."} 
        />
      )}
    </div>
  );
}
