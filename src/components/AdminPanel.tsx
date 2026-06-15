import React, { useState, useEffect } from "react";
import { UserPlus, Trash2, Heart, ShieldAlert, Users, Calendar, ArrowRight, LogOut, Check, Edit, X, Image, Sparkles, Search, Loader2 } from "lucide-react";
import { SecurityUser } from "../types";
import { Language, translations } from "../i18n";
import ConfirmationModal from "./ConfirmationModal";
import LoadingSpinner from "./LoadingSpinner";

interface WeddingRecord {
  id: string;
  username: string;
  weddingName: string;
  avatarSeed: string;
  createdAt: string;
  password?: string;
  profilePicture?: string;
}

interface AdminPanelProps {
  currentUser: SecurityUser;
  onLogout: () => void;
  lang: Language;
  toggleLang: (newLang: Language) => void;
  isNightMode?: boolean;
  toggleNightMode?: () => void;
  onAdminUserUpdated?: (newAdmin: SecurityUser) => void;
}

export default function AdminPanel({
  currentUser,
  onLogout,
  lang,
  toggleLang,
  isNightMode = false,
  toggleNightMode,
  onAdminUserUpdated,
}: AdminPanelProps) {
  const [weddings, setWeddings] = useState<WeddingRecord[]>([]);
  const [usernameInput, setUsernameInput] = useState("");
  const [weddingNameInput, setWeddingNameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [profilePicture, setProfilePicture] = useState("");
  const [editingWedding, setEditingWedding] = useState<WeddingRecord | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialSync, setInitialSync] = useState(true);

  // Super Admin security credentials form states (non-hardcoded)
  const [adminUserReset, setAdminUserReset] = useState(currentUser.username);
  const [adminPassReset, setAdminPassReset] = useState("");
  const [adminNameReset, setAdminNameReset] = useState(currentUser.weddingName || "Super Administration Panel");
  const [securityError, setSecurityError] = useState("");
  const [securitySuccess, setSecuritySuccess] = useState("");
  const [securityLoading, setSecurityLoading] = useState(false);

  // Search & Filter state hooks (Username searchable + date filters newest/oldest, year, month)
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");

  // Extract all unique years from wedding records for the year dropdown
  const availableYears = Array.from(
    new Set(
      weddings
        .map((w) => {
          try {
            return w.createdAt ? new Date(w.createdAt).getFullYear().toString() : "";
          } catch {
            return "";
          }
        })
        .filter((y) => y !== "")
    )
  ).sort((a: string, b: string) => b.localeCompare(a)); // sorted descending

  const monthsList = [
    { value: "0", en: "January", kh: "មករា" },
    { value: "1", en: "February", kh: "កុម្ភៈ" },
    { value: "2", en: "March", kh: "មីនា" },
    { value: "3", en: "April", kh: "មេសា" },
    { value: "4", en: "May", kh: "ឧសភា" },
    { value: "5", en: "June", kh: "មិថុនា" },
    { value: "6", en: "July", kh: "កក្កដា" },
    { value: "7", en: "August", kh: "សីហា" },
    { value: "8", en: "September", kh: "កញ្ញា" },
    { value: "9", en: "October", kh: "តុលា" },
    { value: "10", en: "November", kh: "វិច្ឆិកា" },
    { value: "11", en: "December", kh: "ធ្នូ" },
  ];

  const filteredWeddings = weddings
    .filter((w) => {
      const mSearch = searchTerm.toLowerCase().trim();
      const matchSearch =
        !mSearch ||
        w.username.toLowerCase().includes(mSearch) ||
        w.weddingName.toLowerCase().includes(mSearch);

      let wDate: Date | null = null;
      try {
        if (w.createdAt) {
          wDate = new Date(w.createdAt);
        }
      } catch {
        // ignore
      }

      if (!wDate || isNaN(wDate.getTime())) {
        return matchSearch && selectedYear === "all" && selectedMonth === "all";
      }

      const matchYear =
        selectedYear === "all" ||
        wDate.getFullYear().toString() === selectedYear;

      const matchMonth =
        selectedMonth === "all" ||
        wDate.getMonth().toString() === selectedMonth;

      return matchSearch && matchYear && matchMonth;
    })
    .sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (sortBy === "newest") {
        return timeB - timeA;
      } else {
        return timeA - timeB;
      }
    });

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

  const t = translations[lang];

  const fetchWeddings = async () => {
    try {
      const response = await fetch("/api/weddings");
      if (response.ok) {
        const data = await response.json();
        setWeddings(data);
      }
    } catch (e) {
      console.error("Failed to fetch wedding lists:", e);
    } finally {
      setInitialSync(false);
    }
  };

  useEffect(() => {
    fetchWeddings();
  }, []);

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCancelEdit = () => {
    setEditingWedding(null);
    setUsernameInput("");
    setWeddingNameInput("");
    setPasswordInput("");
    setProfilePicture("");
    setError("");
    setSuccess("");
  };

  const executeCreateWedding = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/weddings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameInput,
          weddingName: weddingNameInput,
          password: passwordInput,
          profilePicture: profilePicture,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to create ceremony ledger account");
      }

      setSuccess(
        lang === "kh"
          ? `បានបង្កើតគណនីគូស្នេហ៍សម្រាប់ "${data.weddingName}" ដោយជោគជ័យ!`
          : `Ledger created successfully for "${data.weddingName}"!`
      );
      setUsernameInput("");
      setWeddingNameInput("");
      setPasswordInput("");
      setProfilePicture("");
      fetchWeddings();
    } catch (err: any) {
      setError(err.message || "Failed to submit new wedding space");
    } finally {
      setLoading(false);
    }
  };

  const executeUpdateWedding = async () => {
    if (!editingWedding) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/weddings/${editingWedding.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameInput,
          weddingName: weddingNameInput,
          password: passwordInput,
          profilePicture: profilePicture,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update ceremony details");
      }

      setSuccess(
        lang === "kh"
          ? `បានកែសម្រួលគណនី (${data.weddingName}) ដោយជោគជ័យ!`
          : `Successfully updated account details for ${data.weddingName}!`
      );
      handleCancelEdit();
      fetchWeddings();
    } catch (err: any) {
      setError(err.message || "Failed to update details");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitWeddingForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!usernameInput || !weddingNameInput || !passwordInput) {
      setError(lang === "kh" ? "សូមបញ្ចូលព័ត៌មានលម្អិតទាំងអស់" : "Please supply Username, Password, and Display Name");
      return;
    }

    if (editingWedding) {
      setConfirmModal({
        isOpen: true,
        title: lang === "kh" ? "កែសម្រួលព័ត៌មានគណនី" : "Update Wedding Account",
        message: lang === "kh" 
          ? `តើអ្នកចង់រក្សាទុកការកែប្រែលើគណនី "${editingWedding.weddingName}" ដែរឬទេ?`
          : `Are you sure you want to update account details for "${editingWedding.weddingName}"?`,
        confirmText: lang === "kh" ? "រក្សាទុក" : "Save Changes",
        cancelText: lang === "kh" ? "បោះបង់" : "Cancel",
        type: "warning",
        onConfirm: () => {
          setConfirmModal(null);
          executeUpdateWedding();
        }
      });
    } else {
      setConfirmModal({
        isOpen: true,
        title: lang === "kh" ? "បង្កើតគណនីគូស្នេហ៍ថ្មី" : "Create Ceremony Account",
        message: t.confirmCreateAccount,
        confirmText: lang === "kh" ? "បង្កើតគណនី" : "Create Account",
        cancelText: lang === "kh" ? "បោះបង់" : "Cancel",
        type: "warning",
        onConfirm: () => {
          setConfirmModal(null);
          executeCreateWedding();
        }
      });
    }
  };

  const handleDeleteWedding = async (id: string, name: string) => {
    const confirmMsg = t.confirmDeleteAccount;
    setConfirmModal({
      isOpen: true,
      title: lang === "kh" ? "លុបគណនីអាពាហ៍ពិពាហ៍" : "Delete Ceremony Account",
      message: `${confirmMsg}\n\n[${name}]`,
      confirmText: lang === "kh" ? "លុបចោល" : "Delete Permanently",
      cancelText: lang === "kh" ? "បោះបង់" : "Cancel",
      type: "danger",
      onConfirm: async () => {
        setConfirmModal(null);
        setLoading(true);
        try {
          const response = await fetch(`/api/weddings/${id}`, { method: "DELETE" });
          if (response.ok) {
            setSuccess(
              lang === "kh"
                ? `បានលុបគណនីអាពាហ៍ពិពាហ៍របស់ "${name}" ជាអចិន្ត្រៃយ៍។`
                : `Permanently removed wedding space matching "${name}".`
            );
            fetchWeddings();
          } else {
            setError(lang === "kh" ? "ការលុបគណនីបានបរាជ័យ" : "Failed to delete wedding record from ledger database");
          }
        } catch (err) {
          setError("Server connection issue deleting record");
        } finally {
          setLoading(false);
        }
      }
    });
  };

  const handleUpdateAdminProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUserReset.trim() || !adminPassReset.trim()) {
      setSecurityError(lang === "kh" ? "សូមបំពេញកន្លែងទំនេរទាំងអស់" : "Please submit all required credentials.");
      return;
    }

    setSecurityLoading(true);
    setSecurityError("");
    setSecuritySuccess("");

    try {
      const response = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentUsername: currentUser.username,
          newUsername: adminUserReset.trim(),
          newPassword: adminPassReset.trim(),
          newWeddingName: adminNameReset.trim()
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSecuritySuccess(t.adminUpdateSuccess);
        
        // Update active session dynamically
        if (onAdminUserUpdated) {
          onAdminUserUpdated({
            token: currentUser.token,
            role: "admin",
            username: data.username,
            weddingName: data.weddingName
          });
        }
      } else {
        const errData = await response.json();
        setSecurityError(errData.error || (lang === "kh" ? "ការលុបគណនីបានបរាជ័យ" : "Failed to reset admin credentials"));
      }
    } catch (err) {
      setSecurityError("Server connection issue updating admin profile");
    } finally {
      setSecurityLoading(false);
    }
  };

  const handleLogoutClick = () => {
    const confirmMsg = t.confirmLogout;
    setConfirmModal({
      isOpen: true,
      title: lang === "kh" ? "ចាកចេញពីប្រព័ន្ធ" : "Sign Out",
      message: confirmMsg,
      confirmText: lang === "kh" ? "ចាកចេញ" : "Sign Out",
      cancelText: lang === "kh" ? "បោះបង់" : "Cancel",
      type: "logout",
      onConfirm: () => {
        setConfirmModal(null);
        onLogout();
      }
    });
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8">
      {/* Header element */}
      <div className={`mb-8 flex flex-col justify-between gap-4 rounded-2xl border p-6 shadow-xl text-white md:flex-row md:items-center transition-all ${
        isNightMode 
          ? "bg-gradient-to-r from-red-950 via-rose-900 to-amber-950 border-amber-500/30"
          : "bg-gradient-to-r from-rose-800 to-rose-950 border-rose-100"
      }`}>
        <div>
          <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
            isNightMode ? "bg-amber-500/20 text-amber-300" : "bg-rose-700/60 text-rose-200"
          }`}>
            <Sparkles size={12} className="animate-pulse text-amber-300" />
            <span>{t.superAdminArea}</span>
          </span>
          <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight">
            {lang === "kh" ? "ប្រព័ន្ធគ្រប់គ្រងគណនីអាពាហ៍ពិពាហ៍" : "Ceremony Ledger Ecosystem"}
          </h1>
          <p className={`mt-1 text-sm ${isNightMode ? "text-amber-200/80" : "text-rose-200"}`}>
            {t.manageRegistryLogins}
          </p>
        </div>

        {/* Global language and logout switcher controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Night Mode lucky toggle */}
          {toggleNightMode && (
            <button
              onClick={toggleNightMode}
              className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                isNightMode
                  ? "bg-amber-400 text-rose-950 border-amber-300 shadow-md shadow-amber-500/10"
                  : "bg-white/10 text-rose-200 border-white/20 hover:bg-white/20"
              }`}
              title={t.nightModeLabel}
            >
              <span className="text-xs font-bold leading-none select-none flex items-center gap-1">
                <span>🧧</span>
                <span className="hidden sm:inline text-[10px] uppercase font-mono tracking-wider">{t.nightModeLabel}</span>
              </span>
            </button>
          )}

          <div className="flex bg-white/10 p-0.5 rounded-lg border border-white/20">
            <button
              onClick={() => toggleLang("en")}
              className={`px-2 py-1 text-[11px] font-bold rounded cursor-pointer ${
                lang === "en" ? "bg-white text-rose-950 shadow-sm" : "text-rose-100 hover:bg-white/10"
              }`}
            >
              EN
            </button>
            <button
              onClick={() => toggleLang("kh")}
              className={`px-2 py-1 text-[11px] font-bold rounded cursor-pointer ${
                lang === "kh" ? "bg-white text-rose-950 shadow-sm" : "text-rose-100 hover:bg-white/10"
              }`}
            >
              ខ្មែរ
            </button>
          </div>

          <div className="rounded-xl bg-white/10 px-4 py-2 text-right">
            <p className="text-xs text-rose-200">Active Admin Session</p>
            <p className="text-sm font-bold text-amber-300">@{currentUser.username}</p>
          </div>

          <button
            id="admin_logout_btn"
            onClick={handleLogoutClick}
            className={`flex items-center gap-1 text-xs font-bold uppercase rounded-xl px-4 py-2.5 transition-all active:scale-95 cursor-pointer ${
              isNightMode 
                ? "bg-amber-500 hover:bg-amber-400 text-rose-950" 
                : "bg-rose-700 hover:bg-rose-600 text-white"
            }`}
          >
            <LogOut size={14} />
            <span>{t.signOut}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Create / Edit Ceremony Account */}
        <div className="lg:col-span-5">
          <div className={`rounded-2xl border p-6 shadow-md transition-all ${
            isNightMode 
              ? "bg-black/45 border-amber-500/20 text-white" 
              : "bg-white border-gray-100 text-gray-900"
          }`}>
            <div className="flex items-center justify-between border-b pb-4 mb-4 border-gray-100">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <UserPlus className={isNightMode ? "text-amber-400" : "text-rose-700"} size={20} />
                <span>{editingWedding ? (lang === "kh" ? "កែសម្រួលគណនីកម្មវិធី" : "Edit Ceremony Details") : t.createAccountTitle}</span>
              </h2>
              {editingWedding && (
                <button
                  onClick={handleCancelEdit}
                  className="p-1 hover:bg-rose-100/10 rounded text-rose-400 hover:text-rose-500"
                  title="Cancel Edit"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {error && (
              <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3.5 text-xs text-red-400 font-medium font-sans">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-xs text-emerald-400 font-medium flex gap-2">
                <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmitWeddingForm} className="mt-6 space-y-4">
              {/* Profile Image selector & preview */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-2 text-gray-400">
                  {lang === "kh" ? "រូបភាពតំណាងគណនី" : "Couple Display Logo / Photo"}
                </label>
                <div className="flex items-center gap-4">
                  {profilePicture ? (
                    <div className="relative group shrink-0">
                      <img
                        src={profilePicture}
                        alt="Profile Preview"
                        className="h-16 w-16 rounded-xl object-cover border-2 border-rose-800"
                        referrerPolicy="no-referrer"
                      />
                      <button
                        type="button"
                        onClick={() => setProfilePicture("")}
                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white p-1 rounded-full text-[10px] leading-none text-center shadow"
                      >
                        <X size={10} />
                      </button>
                    </div>
                  ) : (
                    <div className={`h-16 w-16 rounded-xl flex items-center justify-center border-2 border-dashed ${
                      isNightMode ? "border-amber-500/30 bg-black/20" : "border-gray-200 bg-gray-50"
                    }`}>
                      <Heart size={20} className="text-gray-400" />
                    </div>
                  )}

                  <div className="flex-1">
                    <label className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-all border ${
                      isNightMode 
                        ? "bg-amber-500/10 border-amber-500/30 text-amber-200 hover:bg-amber-500/20" 
                        : "bg-rose-50 border-rose-100 text-rose-800 hover:bg-rose-100"
                    }`}>
                      <Image size={14} />
                      <span>{lang === "kh" ? "ជ្រើសរើសរូបថត" : "Choose Image"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleProfileImageChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {lang === "kh" ? "ប្រើប្រាស់រូបភាពប្រភេទ PNG, JPG ឬ WEBP" : "Works with standard formats (PNG, JPG)"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-gray-400">
                  {lang === "kh" ? "ឈ្មោះអ្នកប្រើ (Username)" : "Reception Account Username"}
                </label>
                <input
                  id="admin_couple_user"
                  type="text"
                  required
                  placeholder="e.g. srey-dara"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  style={{ colorScheme: isNightMode ? "dark" : "light" }}
                  className={`w-full rounded-xl border p-3 text-sm outline-none transition-all font-mono ${
                    isNightMode 
                      ? "bg-black/30 border-amber-500/20 text-white placeholder-gray-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-200" 
                      : "bg-white border-gray-200 text-gray-800 focus:border-rose-500 focus:ring-2 focus:focus:ring-rose-100"
                  }`}
                />
                <span className="mt-1 block text-[10px] text-gray-400">
                  {lang === "kh"
                    ? "ប្រើសម្រាប់ចូលទៅកត់ត្រាចំណងដៃ។ សូមកុំប្រើចន្លោះ (Space) ឬសញ្ញាពិសេស។"
                    : "Used by the wedding couple/recorder to sign in. Avoid spaces or symbols."}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-gray-400">
                  {lang === "kh" ? "ឈ្មោះកម្មវិធីអាពាហ៍ពិពាហ៍" : "Wedding Reception Display Name"}
                </label>
                <input
                  id="admin_couple_wedding_name"
                  type="text"
                  required
                  placeholder="e.g. Dara & Sreyneang's Marriage Reception"
                  value={weddingNameInput}
                  onChange={(e) => setWeddingNameInput(e.target.value)}
                  style={{ colorScheme: isNightMode ? "dark" : "light" }}
                  className={`w-full rounded-xl border p-3 text-sm outline-none transition-all ${
                    isNightMode 
                      ? "bg-black/30 border-amber-500/20 text-white placeholder-gray-650 focus:border-amber-400 focus:ring-1 focus:ring-amber-200" 
                      : "bg-white border-gray-200 text-gray-800 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-gray-400">
                  {lang === "kh" ? "លេខសម្ងាត់" : "Access Security Password"}
                </label>
                <input
                  id="admin_couple_password"
                  type="text"
                  required
                  placeholder="e.g. happycouple2026"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  style={{ colorScheme: isNightMode ? "dark" : "light" }}
                  className={`w-full rounded-xl border p-3 text-sm outline-none transition-all ${
                    isNightMode 
                      ? "bg-black/30 border-amber-500/20 text-white placeholder-gray-650 focus:border-amber-400 focus:ring-1 focus:ring-amber-200" 
                      : "bg-white border-gray-200 text-gray-800 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  }`}
                />
              </div>

              <div className="flex gap-3 pt-2">
                {editingWedding && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-rose-800 text-rose-500 hover:bg-rose-500/10 p-3.5 font-medium transition-all cursor-pointer"
                  >
                    <span>{lang === "kh" ? "បោះបង់" : "Cancel"}</span>
                  </button>
                )}

                <button
                  id="create_wedding_submit_btn"
                  type="submit"
                  disabled={loading}
                  className={`flex-2 flex items-center justify-center gap-2 rounded-xl p-3.5 font-medium transition-all disabled:opacity-50 cursor-pointer text-white ${
                    isNightMode 
                      ? "bg-amber-500 hover:bg-amber-400 text-rose-950" 
                      : "bg-rose-850 hover:bg-rose-900"
                  }`}
                >
                  <span>
                    {loading 
                      ? (lang === "kh" ? "កំពុងដំណើរការ..." : "Saving Ledger...") 
                      : editingWedding 
                        ? (lang === "kh" ? "រក្សាទុកការកែប្រែ" : "Update Account") 
                        : t.addNewWeddingCoupleBtn}
                  </span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </form>
          </div>

          {/* Super Admin Security Settings & Credentials Reset */}
          <div className={`mt-6 rounded-2xl border p-6 shadow-md transition-all ${
            isNightMode 
              ? "bg-black/45 border-amber-500/20 text-white" 
              : "bg-white border-gray-100 text-gray-900"
          }`}>
            <div className="flex items-center gap-2 border-b pb-4 mb-4 border-gray-100">
              <ShieldAlert className={isNightMode ? "text-amber-400" : "text-rose-700"} size={20} />
              <h2 className="text-lg font-bold">
                {t.adminSettingsTitle}
              </h2>
            </div>

            {securityError && (
              <div className="mt-4 rounded-xl bg-red-500/10 border border-red-500/20 p-3.5 text-xs text-red-400 font-medium font-sans">
                {securityError}
              </div>
            )}

            {securitySuccess && (
              <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3.5 text-xs text-emerald-400 font-medium flex gap-2">
                <Check size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                <span>{securitySuccess}</span>
              </div>
            )}

            <form onSubmit={handleUpdateAdminProfile} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-gray-400">
                  {t.newAdminUser}
                </label>
                <input
                  id="admin_username_reset"
                  type="text"
                  required
                  placeholder="e.g. admin"
                  value={adminUserReset}
                  onChange={(e) => setAdminUserReset(e.target.value)}
                  style={{ colorScheme: isNightMode ? "dark" : "light" }}
                  className={`w-full rounded-xl border p-3 text-sm outline-none transition-all font-mono ${
                    isNightMode 
                      ? "bg-black/30 border-amber-500/20 text-white placeholder-gray-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-250" 
                      : "bg-white border-gray-200 text-gray-800 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-gray-400">
                  {t.newAdminPass}
                </label>
                <input
                  id="admin_password_reset"
                  type="password"
                  required
                  placeholder="Enter secure password"
                  value={adminPassReset}
                  onChange={(e) => setAdminPassReset(e.target.value)}
                  style={{ colorScheme: isNightMode ? "dark" : "light" }}
                  className={`w-full rounded-xl border p-3 text-sm outline-none transition-all ${
                    isNightMode 
                      ? "bg-black/30 border-amber-500/20 text-white placeholder-gray-650 focus:border-amber-400 focus:ring-1 focus:ring-amber-250" 
                      : "bg-white border-gray-200 text-gray-800 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5 text-gray-400">
                  {t.newPanelName}
                </label>
                <input
                  id="admin_panel_name_reset"
                  type="text"
                  required
                  placeholder="Super Administration Panel"
                  value={adminNameReset}
                  onChange={(e) => setAdminNameReset(e.target.value)}
                  style={{ colorScheme: isNightMode ? "dark" : "light" }}
                  className={`w-full rounded-xl border p-3 text-sm outline-none transition-all ${
                    isNightMode 
                      ? "bg-black/30 border-amber-500/20 text-white placeholder-gray-650 focus:border-amber-400 focus:ring-1 focus:ring-amber-250" 
                      : "bg-white border-gray-200 text-gray-800 focus:border-rose-500 focus:ring-2 focus:ring-rose-100"
                  }`}
                />
              </div>

              <div className="pt-2">
                <button
                  id="update_admin_profile_btn"
                  type="submit"
                  disabled={securityLoading}
                  className={`w-full flex items-center justify-center gap-2 rounded-xl p-3.5 font-medium transition-all disabled:opacity-50 cursor-pointer text-white ${
                    isNightMode 
                      ? "bg-amber-500 hover:bg-amber-400 text-rose-950" 
                      : "bg-rose-850 hover:bg-rose-900"
                  }`}
                >
                  <span>
                    {securityLoading 
                      ? (lang === "kh" ? "កំពុងដំណើរការ..." : "Updating Settings...") 
                      : t.updateAdminBtn}
                  </span>
                  {securityLoading ? (
                    <Loader2 size={16} className="animate-spin text-white" />
                  ) : (
                    <ArrowRight size={16} />
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Side: Active Ceremony ledgers list */}
        <div className="lg:col-span-7">
          <div className={`rounded-2xl border p-6 shadow-md height-full transition-all ${
            isNightMode 
              ? "bg-black/45 border-amber-500/20 text-white" 
              : "bg-white border-gray-100 text-gray-900"
          }`}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Users className={isNightMode ? "text-amber-400" : "text-rose-700"} size={20} />
                <span>{t.activeWeddingRecords}</span>
              </h2>
              <span className={`rounded-full px-3 py-1 text-xs font-bold border ${
                isNightMode 
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-350" 
                  : "bg-rose-50 border-rose-100 text-rose-800"
              }`}>
                {filteredWeddings.length} / {weddings.length} {lang === "kh" ? "គណនីរក្សាទុក" : "Ceremony Drawers"}
              </span>
            </div>

            {/* Filter controls container */}
            {weddings.length > 0 && (
              <div className="mb-6 space-y-3.5">
                {/* Search bar */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder={lang === "kh" ? "ស្វែងរកតាមឈ្មោះអ្នកប្រើប្រាស់ ឬឈ្មោះពិធី..." : "Search by username or wedding name..."}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{ colorScheme: isNightMode ? "dark" : "light" }}
                    className={`w-full rounded-xl border py-2.5 pl-9 pr-8 text-xs outline-none transition-all ${
                      isNightMode 
                        ? "bg-black/35 border-amber-500/25 text-white placeholder-gray-550 focus:border-amber-400 focus:ring-1 focus:ring-amber-200" 
                        : "bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-200"
                    }`}
                  />
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-rose-500 text-xs cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Sub-filters grid: newest/oldest, year, month */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-gray-400">
                      {lang === "kh" ? "តម្រៀប" : "Sort Order"}
                    </label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className={`w-full rounded-xl border p-2.5 text-xs outline-none transition-all cursor-pointer ${
                        isNightMode 
                          ? "bg-black/40 border-amber-500/25 text-amber-100 focus:border-amber-400" 
                          : "bg-white border-gray-250 text-gray-800 focus:border-rose-500"
                      }`}
                    >
                      <option value="newest">{lang === "kh" ? "ថ្មីបំផុត" : "Newest"}</option>
                      <option value="oldest">{lang === "kh" ? "ចាស់បំផុត" : "Oldest"}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-gray-400">
                      {lang === "kh" ? "ឆ្នាំ" : "Year"}
                    </label>
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className={`w-full rounded-xl border p-2.5 text-xs outline-none transition-all cursor-pointer ${
                        isNightMode 
                          ? "bg-black/40 border-amber-500/25 text-amber-100 focus:border-amber-400" 
                          : "bg-white border-gray-250 text-gray-800 focus:border-rose-500"
                      }`}
                    >
                      <option value="all">{lang === "kh" ? "គ្រប់ឆ្នាំ" : "All Years"}</option>
                      {availableYears.map((y) => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider mb-1 text-gray-400">
                      {lang === "kh" ? "ខែ" : "Month"}
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      className={`w-full rounded-xl border p-2.5 text-xs outline-none transition-all cursor-pointer ${
                        isNightMode 
                          ? "bg-black/40 border-amber-500/25 text-amber-100 focus:border-amber-400" 
                          : "bg-white border-gray-250 text-gray-800 focus:border-rose-500"
                      }`}
                    >
                      <option value="all">{lang === "kh" ? "គ្រប់ខែ" : "All Months"}</option>
                      {monthsList.map((m) => (
                        <option key={m.value} value={m.value}>
                          {lang === "kh" ? m.kh : m.en}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {weddings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-100 rounded-xl">
                <ShieldAlert className="text-gray-300 mb-2" size={36} />
                <p className="text-sm text-gray-500">{t.noWeddingsRegistered}</p>
              </div>
            ) : filteredWeddings.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center border border-dashed border-gray-200 rounded-xl bg-gray-50/5">
                <Search className="text-gray-400 mb-2" size={28} />
                <p className="text-xs text-gray-400">{lang === "kh" ? "រកមិនឃើញគណនីត្រូវនឹងលក្ខខណ្ឌស្វែងរកឡើយ" : "No results matching selected filters."}</p>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedYear("all");
                    setSelectedMonth("all");
                    setSortBy("newest");
                  }}
                  className="mt-3.5 text-xs font-semibold text-rose-500 hover:text-rose-600 underline cursor-pointer"
                >
                  {lang === "kh" ? "សម្អាតការស្វែងរក" : "Reset All Filters"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredWeddings.map((w) => (
                  <div
                    id={`wedding_row_${w.id}`}
                    key={w.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all gap-4 ${
                      isNightMode 
                        ? "bg-black/30 border-rose-950 hover:bg-rose-950/20 hover:border-amber-500/30" 
                        : "bg-gray-50/20 border-gray-100 hover:bg-rose-50/5 hover:border-rose-100"
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      {w.profilePicture ? (
                        <img
                          src={w.profilePicture}
                          alt={w.weddingName}
                          className="h-11 w-11 shrink-0 rounded-xl object-cover border border-rose-150/40 shadow-inner"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-serif text-white shadow-md text-sm font-semibold ${
                          isNightMode 
                            ? "bg-gradient-to-tr from-amber-500 to-amber-700 text-rose-950" 
                            : "bg-gradient-to-tr from-rose-700 to-rose-900"
                        }`}>
                          <Heart fill="currentColor" size={16} className={isNightMode ? "text-rose-950" : "text-pink-200"} />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <h4 className={`text-sm font-bold leading-snug truncate ${isNightMode ? "text-amber-200" : "text-gray-950"}`}>
                          {w.weddingName}
                        </h4>
                        <p className="text-xs text-gray-400 font-mono mt-0.5">
                          {t.usernameLabel}: <span className="font-bold text-rose-400">@{w.username}</span>
                          {w.password && (
                            <span className="ml-3 text-[10px] text-amber-500">
                              🗝️ {w.password}
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mt-1">
                          <Calendar size={11} />
                          <span>{t.registeredAt} {new Date(w.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 justify-end border-t border-gray-50 sm:border-0 pt-3 sm:pt-0">
                      {/* Edit Button */}
                      <button
                        id={`edit_wedding_btn_${w.id}`}
                        onClick={() => {
                          setEditingWedding(w);
                          setUsernameInput(w.username);
                          setWeddingNameInput(w.weddingName);
                          setPasswordInput(w.password || `${w.username}123`);
                          setProfilePicture(w.profilePicture || "");
                          setError("");
                          setSuccess("");
                        }}
                        className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-all active:scale-95 cursor-pointer ${
                          isNightMode 
                            ? "bg-amber-550/20 border-amber-500/20 text-amber-300 hover:bg-amber-500/30" 
                            : "bg-rose-50 border-rose-105 text-rose-800 hover:bg-rose-100"
                        }`}
                        title={lang === "kh" ? "កែសម្រួលគណនី" : "Edit Account details"}
                      >
                        <Edit size={14} />
                      </button>

                      {w.username === "couple" ? (
                        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                          isNightMode 
                            ? "bg-rose-950/40 text-rose-300 border-rose-900" 
                            : "bg-rose-100 text-rose-800 border-rose-200"
                        }`}>
                          {lang === "kh" ? "ទិន្នន័យគំរូសាកល្បង" : "Prepopulated Demo"}
                        </span>
                      ) : (
                        <button
                          id={`delete_wedding_btn_${w.id}`}
                          onClick={() => handleDeleteWedding(w.id, w.weddingName)}
                          className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 transition-all hover:bg-red-500/20 active:scale-95 cursor-pointer"
                          title={t.deleteAccountBtn}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Admin Panel Confirmation modal */}
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

      {/* Admin Panel persistent action spinner */}
      {(loading || initialSync) && (
        <LoadingSpinner
          overlay
          message={
            initialSync 
              ? (lang === "kh" ? "កំពុងទាញយកទិន្នន័យពិធីមង្គលការ..." : "Syncing active wedding records...")
              : (lang === "kh" ? "កំពុងដោះស្រាយប្រតិបត្តិការ..." : "Processing ceremony request...")
          }
        />
      )}
    </div>
  );
}
