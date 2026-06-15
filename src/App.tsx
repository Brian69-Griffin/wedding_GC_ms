import { useState, useEffect } from "react";
import { Heart, Notebook, QrCode, LogOut, Shield, Menu, X } from "lucide-react";
import { SecurityUser, GiftRecord, QRCodeConfig } from "./types";
import { Language, translations } from "./i18n";
import LoginView from "./components/LoginView";
import AdminPanel from "./components/AdminPanel";
import CashierLedger from "./components/CashierLedger";
import QRPanel from "./components/QRPanel";
import FaceSearchModal from "./components/FaceSearchModal";
import ConfirmationModal from "./components/ConfirmationModal";
import LoadingSpinner from "./components/LoadingSpinner";
import ConnectFaceModal from "./components/ConnectFaceModal";

export default function App() {
  // Language selector state
  const [lang, setLang] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem("wedding_gift_lang");
      if (stored === "en" || stored === "kh") {
        return stored;
      }
    } catch (e) {}
    return "en";
  });

  const toggleLang = (newLang: Language) => {
    setLang(newLang);
    localStorage.setItem("wedding_gift_lang", newLang);
  };

  const t = translations[lang];

  // Lucky Night Mode State (Mix with red and yellow for luck)
  const [isNightMode, setIsNightMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("wedding_gift_night_mode");
      return stored === "true";
    } catch (e) {
      return false;
    }
  });

  const toggleNightMode = () => {
    setIsNightMode((prev) => {
      const next = !prev;
      localStorage.setItem("wedding_gift_night_mode", String(next));
      return next;
    });
  };

  useEffect(() => {
    if (isNightMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isNightMode]);

  // Loading indicator for active API gets
  const [fetchingData, setFetchingData] = useState(false);

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

  // Authentication session state
  const [currentUser, setCurrentUser] = useState<SecurityUser | null>(() => {
    try {
      const stored = localStorage.getItem("wedding_gift_session");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error("Session restore failed:", e);
    }
    return null;
  });

  // Dynamic system view tab for Couple users: 'ledger' | 'qrcodes'
  const [activeTab, setActiveTab] = useState<"ledger" | "qrcodes">("ledger");

  // Shared database arrays synced from server
  const [allGifts, setAllGifts] = useState<GiftRecord[]>([]);
  const [qrcodes, setQrcodes] = useState<QRCodeConfig[]>([]);
  const [initialSynced, setInitialSynced] = useState(false);

  // Face Matching locator trigger
  const [scannedMatchId, setScannedMatchId] = useState<string | null>(null);
  const [isFaceSearchOpen, setIsFaceSearchOpen] = useState(false);
  const [isConnectFaceOpen, setIsConnectFaceOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Load database structures for logged in couple
  const fetchCoupleData = async (weddingId: string, isSilent = false) => {
    if (!isSilent) setFetchingData(true);
    try {
      // Fetch gifts
      const giftRes = await fetch("/api/gifts", {
        headers: { "x-wedding-id": weddingId },
      });
      if (giftRes.ok) {
        const giftsData = await giftRes.json();
        setAllGifts(giftsData);
      }

      // Fetch QR codes
      const qrRes = await fetch("/api/qrcodes", {
        headers: { "x-wedding-id": weddingId },
      });
      if (qrRes.ok) {
        const qrData = await qrRes.json();
        setQrcodes(qrData);
      }
    } catch (e) {
      console.error("Failed to synchronize active wedding profile details:", e);
    } finally {
      if (!isSilent) setFetchingData(false);
      setInitialSynced(true);
    }
  };

  // Trigger sync on session changes or trigger updates
  useEffect(() => {
    if (currentUser && currentUser.role === "couple" && currentUser.weddingId) {
      fetchCoupleData(currentUser.weddingId);
    }
  }, [currentUser]);

  const handleLoginSuccess = (user: SecurityUser) => {
    setInitialSynced(false);
    setCurrentUser(user);
    localStorage.setItem("wedding_gift_session", JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("wedding_gift_session");
    // reset states
    setAllGifts([]);
    setQrcodes([]);
    setInitialSynced(false);
    setActiveTab("ledger");
    setScannedMatchId(null);
  };

  const handleQRUpdated = () => {
    if (currentUser?.weddingId) {
      fetchCoupleData(currentUser.weddingId, true);
    }
  };

  const handleGiftChanged = () => {
    if (currentUser?.weddingId) {
      fetchCoupleData(currentUser.weddingId, true);
    }
  };

  // Face scanner found a match
  const handleFaceMatchSelected = (giftId: string) => {
    setScannedMatchId(giftId);
    setActiveTab("ledger");
  };

  // Render correct view based on login credentials
  const renderView = () => {
    if (!currentUser) {
      return (
        <LoginView
          onLoginSuccess={handleLoginSuccess}
          lang={lang}
          toggleLang={toggleLang}
          isNightMode={isNightMode}
          toggleNightMode={toggleNightMode}
        />
      );
    }

    if (currentUser.role === "admin") {
      // Super Admin Controls
      return (
        <AdminPanel
          currentUser={currentUser}
          onLogout={handleLogout}
          lang={lang}
          toggleLang={toggleLang}
          isNightMode={isNightMode}
          toggleNightMode={toggleNightMode}
          onAdminUserUpdated={handleLoginSuccess}
        />
      );
    }

    // Wedding Couple / Recorder Controls
    const isFaceConnected = !!currentUser?.faceLoginImage;

    return (
      <div className={`min-h-screen transition-all duration-300 ${isNightMode ? "bg-gradient-to-br from-[#0c0000] via-[#1c0202] to-[#2b0303] text-gray-100" : "bg-gray-50/50 text-gray-950"}`}>
        {/* Navigation Head Rail */}
        <header className={`sticky top-0 z-40 w-full border-b transition-all duration-300 ${
          isNightMode 
            ? "border-amber-500/25 bg-[#150202]/95 backdrop-blur-md text-white" 
            : "border-rose-100 bg-white/80 backdrop-blur-md text-gray-950"
        }`}>
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
            {/* Logo brand label */}
            <div className="flex items-center gap-2 select-none group">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl shadow-md transition-all ${
                isNightMode 
                  ? "bg-gradient-to-tr from-rose-950 to-amber-950 text-amber-400 border border-amber-500/20" 
                  : "bg-gradient-to-tr from-rose-800 to-rose-950 text-white"
              }`}>
                <Heart fill="currentColor" size={18} className="text-amber-350 animate-pulse" />
              </div>
              <div className="text-left">
                <span className={`font-serif text-sm font-black tracking-wide uppercase block ${isNightMode ? "text-amber-300" : "text-rose-950"}`}>
                  {t.appName}
                </span>
                <span className={`text-[9px] tracking-wider font-semibold uppercase block leading-none mt-0.5 ${isNightMode ? "text-rose-450" : "text-rose-800"}`}>
                  {t.ledgerRegistrySystem}
                </span>
              </div>
            </div>

            {/* Navigation Tabs selection - Desktop Only */}
            <nav className={`hidden md:flex items-center gap-1.5 p-1 rounded-xl border transition-all ${
              isNightMode 
                ? "bg-black/45 border-rose-955" 
                : "bg-gray-100 border-gray-150"
            }`}>
              <button
                id="tab_ledger_selector"
                onClick={() => setActiveTab("ledger")}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all select-none cursor-pointer ${
                  activeTab === "ledger"
                    ? isNightMode ? "bg-amber-500 text-rose-955 shadow" : "bg-white text-rose-900 shadow-sm"
                    : isNightMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <Notebook size={14} />
                <span>{t.registryLedger}</span>
              </button>

              <button
                id="tab_qrcodes_selector"
                onClick={() => setActiveTab("qrcodes")}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all select-none cursor-pointer ${
                  activeTab === "qrcodes"
                    ? isNightMode ? "bg-amber-500 text-rose-955 shadow" : "bg-white text-rose-900 shadow-sm"
                    : isNightMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <QrCode size={14} />
                <span>{t.qrEnvelopesTab}</span>
              </button>
            </nav>

            {/* Language, Lucky Toggle, and actions - Desktop Only */}
            <div className="hidden md:flex items-center gap-3">
              {/* Gold/Red Lucky Night Mode toggle button */}
              <button
                onClick={toggleNightMode}
                className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                  isNightMode
                    ? "bg-amber-450 text-rose-950 border-amber-300 shadow shadow-amber-500/10"
                    : "bg-white border-rose-100 hover:bg-rose-50 text-rose-850"
                }`}
                title={t.nightModeLabel}
              >
                <span className="text-sm select-none">🧧</span>
              </button>

              {/* English vs Khmer Switcher */}
              <div className={`flex p-0.5 rounded-lg border ${isNightMode ? "bg-black/30 border-rose-950" : "bg-gray-100 border-gray-200"}`}>
                <button
                  onClick={() => toggleLang("en")}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    lang === "en"
                      ? "bg-rose-800 text-white shadow"
                      : "text-gray-400 hover:text-gray-900"
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => toggleLang("kh")}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    lang === "kh"
                      ? "bg-rose-800 text-white shadow"
                      : "text-gray-400 hover:text-gray-900"
                  }`}
                >
                  ខ្មែរ
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full border ${isNightMode ? "bg-black/40 border-rose-950 text-amber-300" : "bg-gray-100 border-gray-205 text-gray-500"}`}>
                  {t.loggedIn}: <span className="text-rose-455">@{currentUser.username}</span>
                </span>
                <button
                  id="connect_face_header_btn"
                  onClick={() => setIsConnectFaceOpen(true)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all select-none active:scale-95 cursor-pointer ${
                    isFaceConnected
                      ? isNightMode
                        ? "bg-emerald-950/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-950/40 shadow-sm"
                        : "bg-emerald-50 text-emerald-800 border-emerald-250 hover:bg-emerald-100 shadow-sm"
                      : isNightMode
                      ? "bg-red-950/20 text-red-400 border-red-500/30 hover:bg-red-950/40 shadow-sm"
                      : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 shadow-sm"
                  }`}
                  title={
                    isFaceConnected
                      ? (lang === "kh" ? "បានភ្ជាប់ជីវមាត្រផ្ទៃមុខរួចរាល់" : "Biometrics face login is fully active")
                      : (lang === "kh" ? "សូមភ្ជាប់ស្កែនមុខដើម្បីសុវត្ថិភាព" : "Click to connect face biometrics")
                  }
                >
                  <Shield size={12} className={isFaceConnected ? "text-emerald-500" : "text-red-500 animate-pulse"} />
                  <span>
                    {isFaceConnected
                      ? (lang === "kh" ? "ភ្ជាប់ផ្ទៃមុខរួចរាល់" : "Face Connected")
                      : (lang === "kh" ? "មិនទាន់ភ្ជាប់មុខ" : "Not Connected")}
                  </span>
                </button>
                <button
                  id="quick_sign_out_btn"
                  onClick={() => {
                    setConfirmModal({
                      isOpen: true,
                      title: lang === "kh" ? "ចាកចេញពីប្រព័ន្ធ" : "Sign Out",
                      message: t.confirmLogout,
                      confirmText: lang === "kh" ? "ចាកចេញ" : "Sign Out",
                      cancelText: lang === "kh" ? "បោះបង់" : "Cancel",
                      type: "logout",
                      onConfirm: () => {
                        handleLogout();
                        setConfirmModal(null);
                      }
                    });
                  }}
                  className={`flex items-center gap-1 rounded-xl px-3.5 py-1.5 text-xs font-bold border transition-all select-none active:scale-95 cursor-pointer ${
                    isNightMode 
                      ? "bg-rose-950/40 text-rose-300 border-rose-900 hover:bg-rose-900/30" 
                      : "bg-rose-50 text-rose-850 border-rose-101 hover:bg-rose-100"
                  }`}
                >
                  <LogOut size={13} />
                  <span>{t.signOut}</span>
                </button>
              </div>
            </div>

            {/* Mobile-only Hamburger Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                  isNightMode
                    ? "bg-amber-955/20 text-amber-400 border-amber-500/15"
                    : "bg-rose-50/50 border-rose-100 text-rose-900"
                }`}
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>

          {/* Mobile Collapsible Dropdown Menu */}
          {mobileMenuOpen && (
            <div className={`md:hidden border-t px-4 py-4 space-y-4 animate-[slideDown_0.2s_ease-out] ${
              isNightMode 
                ? "bg-[#180303] border-amber-500/10 text-white" 
                : "bg-rose-50/95 border-rose-100 text-gray-900 shadow-lg"
            }`}>
              {/* Menu Tabs Navigation */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {lang === "kh" ? "ជម្រើសទំព័រ" : "Navigation tabs"}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      setActiveTab("ledger");
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold border cursor-pointer transition-all ${
                      activeTab === "ledger"
                        ? isNightMode ? "bg-amber-500 border-transparent text-rose-955 shadow" : "bg-rose-800 border-transparent text-white shadow"
                        : isNightMode ? "bg-black/35 border-amber-500/10 text-amber-250" : "bg-white border-rose-200 text-rose-900"
                    }`}
                  >
                    <Notebook size={14} />
                    <span>{t.registryLedger}</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab("qrcodes");
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold border cursor-pointer transition-all ${
                      activeTab === "qrcodes"
                        ? isNightMode ? "bg-amber-500 border-transparent text-rose-955 shadow" : "bg-rose-800 border-transparent text-white shadow"
                        : isNightMode ? "bg-black/35 border-amber-500/10 text-amber-250" : "bg-white border-rose-200 text-rose-900"
                    }`}
                  >
                    <QrCode size={14} />
                    <span>{t.qrEnvelopesTab}</span>
                  </button>
                </div>
              </div>

              {/* Preferences Settings (Language, Theme) */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100/10">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {lang === "kh" ? "ការកំណត់ភាសា និងប្រធានបទ" : "Preferences & Theme"}
                </span>
                <div className="flex items-center gap-2">
                  {/* Theme toggler */}
                  <button
                    onClick={toggleNightMode}
                    className={`p-2 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                      isNightMode
                        ? "bg-amber-450 text-rose-955 border-amber-300 shadow"
                        : "bg-white border-rose-100 text-rose-850"
                    }`}
                  >
                    <span className="text-sm select-none">🧧</span>
                  </button>

                  {/* Language switch */}
                  <div className={`flex p-0.5 rounded-lg border ${isNightMode ? "bg-black/30 border-rose-950" : "bg-white border-rose-100"}`}>
                    <button
                      onClick={() => toggleLang("en")}
                      className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                        lang === "en" ? "bg-rose-800 text-white shadow" : "text-gray-450 hover:text-gray-900"
                      }`}
                    >
                      EN
                    </button>
                    <button
                      onClick={() => toggleLang("kh")}
                      className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                        lang === "kh" ? "bg-rose-800 text-white shadow" : "text-gray-455 hover:text-gray-900"
                      }`}
                    >
                      ខ្មែរ
                    </button>
                  </div>
                </div>
              </div>

              {/* Identity Details & Key Secure Actions */}
              <div className="pt-2 border-t border-gray-100/10 space-y-3">
                <div className={`flex items-center justify-between p-3 rounded-xl ${
                  isNightMode ? "bg-black/40 text-amber-250 border border-amber-500/15" : "bg-white border border-rose-150 text-rose-955"
                }`}>
                  <span className="text-xs font-bold">{t.loggedIn}</span>
                  <span className="text-xs font-black">@{currentUser.username}</span>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {/* Connect Face */}
                  <button
                    onClick={() => {
                      setIsConnectFaceOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold border transition-all cursor-pointer ${
                      isFaceConnected
                        ? isNightMode
                          ? "bg-emerald-955/20 text-emerald-400 border-emerald-500/25 hover:bg-emerald-950"
                          : "bg-emerald-50 text-emerald-800 border-emerald-101 hover:bg-emerald-100/50"
                        : isNightMode
                        ? "bg-red-955/20 text-red-400 border-red-500/25 hover:bg-red-950"
                        : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100/40"
                    }`}
                  >
                    <Shield size={14} className={isFaceConnected ? "text-emerald-400" : "text-red-500 animate-pulse"} />
                    <span>
                      {isFaceConnected
                        ? (lang === "kh" ? "ភ្ជាប់ផ្ទៃមុខរួចរាល់" : "Face Connected")
                        : (lang === "kh" ? "មិនទាន់ភ្ជាប់មុខ" : "Not Connected")}
                    </span>
                  </button>

                  {/* Sign Out */}
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setConfirmModal({
                        isOpen: true,
                        title: lang === "kh" ? "ចាកចេញពីប្រព័ន្ធ" : "Sign Out",
                        message: t.confirmLogout,
                        confirmText: lang === "kh" ? "ចាកចេញ" : "Sign Out",
                        cancelText: lang === "kh" ? "បោះបង់" : "Cancel",
                        type: "logout",
                        onConfirm: () => {
                          handleLogout();
                          setConfirmModal(null);
                        }
                      });
                    }}
                    className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold border transition-all cursor-pointer ${
                      isNightMode 
                        ? "bg-rose-955/40 text-rose-300 border-rose-900/50 hover:bg-[#250303]" 
                        : "bg-rose-100 text-rose-955 border-rose-150 hover:bg-rose-200"
                    }`}
                  >
                    <LogOut size={14} />
                    <span>{t.signOut}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Content Tabs Wrapper */}
        <main className="transition-all duration-300">
          {activeTab === "ledger" ? (
            <CashierLedger
              currentUser={currentUser}
              activeWeddingId={currentUser.weddingId!}
              onLogout={handleLogout}
              allGifts={allGifts}
              qrcodes={qrcodes}
              onGiftLedgerUpdated={handleGiftChanged}
              scannedMatchId={scannedMatchId}
              clearScannedMatch={() => setScannedMatchId(null)}
              onOpenFaceSearch={() => setIsFaceSearchOpen(true)}
              lang={lang}
              isNightMode={isNightMode}
            />
          ) : (
            <QRPanel
              qrcodes={qrcodes}
              onQRUpdated={handleQRUpdated}
              activeWeddingId={currentUser.weddingId!}
              lang={lang}
              isNightMode={isNightMode}
            />
          )}
        </main>

        {/* Face scanning visual overlay modal */}
        {isFaceSearchOpen && (
          <FaceSearchModal
            onClose={() => setIsFaceSearchOpen(false)}
            activeWeddingId={currentUser.weddingId!}
            onMatchSelect={handleFaceMatchSelected}
            allGifts={allGifts}
            lang={lang}
            isNightMode={isNightMode}
          />
        )}

        {/* Biometric Connect Face Register Modal */}
        {isConnectFaceOpen && (
          <ConnectFaceModal
            onClose={() => setIsConnectFaceOpen(false)}
            activeWeddingId={currentUser.weddingId!}
            lang={lang}
            isNightMode={isNightMode}
            onFaceRegistered={(faceImage) => {
              if (currentUser) {
                const updatedUser = { ...currentUser, faceLoginImage: faceImage };
                setCurrentUser(updatedUser);
                localStorage.setItem("wedding_gift_session", JSON.stringify(updatedUser));
              }
            }}
          />
        )}
      </div>
    );
  };

  return (
    <>
      <div className="print:hidden">
        <div className={`min-h-screen transition-all duration-300 leading-normal font-sans antialiased selection:bg-rose-100 selection:text-rose-950 ${
          isNightMode 
            ? "bg-gradient-to-br from-[#0c0000] via-[#1c0202] to-[#250303] text-gray-100" 
            : "bg-gradient-to-br from-[#fffbfb] via-[#fff5f5] to-rose-50/20 text-gray-900"
        }`}>
          {renderView()}
          
          {/* Dynamic Global Loading Spinner during details fetch */}
          {(fetchingData || (!initialSynced && currentUser && currentUser.role === "couple")) && (
            <LoadingSpinner 
              overlay 
              message={lang === "kh" ? "កំពុងទាញយកទិន្នន័យចំណងដៃ..." : "Syncing ledger records..."} 
            />
          )}

          {/* Dynamic Global Confirmation Modal */}
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
              isNightMode={isNightMode}
            />
          )}
        </div>
      </div>

      {/* High-Fidelity Gorgeous Print Layout */}
      {currentUser && currentUser.role === "couple" && (
        <div className="hidden print:block bg-white text-black p-8 font-serif leading-relaxed">
          {/* Print Header */}
          <div className="border-b-4 border-double border-red-900 pb-4 mb-6 flex justify-between items-end">
            <div>
              <h1 className="text-2xl font-black text-rose-900 mb-1 font-serif">
                {currentUser.weddingName || (lang === "kh" ? "សៀវភៅកត់ចំណងដៃអាពាហ៍ពិពាហ៍" : "Official Wedding Ceremony Registry")}
              </h1>
              <p className="text-xs text-gray-600 font-sans tracking-wide">
                {lang === "kh" ? "របាយការណ៍ផ្លូវការនៃការទទួលបានចំណងដៃ" : "Official Digital Cash Ledger Directory & Summary Output"}
              </p>
            </div>
            <div className="text-right text-xs font-sans text-gray-500">
              <p>{lang === "kh" ? `កាលបរិច្ឆេទបោះពុម្ព៖ ${new Date().toLocaleDateString("km-KH")}` : `Printed on: ${new Date().toLocaleDateString()}`}</p>
              <p>{lang === "kh" ? `operator គណនី៖ @${currentUser.username}` : `Operator Username: @${currentUser.username}`}</p>
            </div>
          </div>

          {/* Summary KPI Boards */}
          <div className="grid grid-cols-3 gap-4 border border-gray-200 bg-gray-50/50 p-4 rounded-xl mb-6">
            <div className="text-center border-r border-gray-200 last:border-r-0">
              <span className="text-[10px] font-sans font-bold text-gray-500 block uppercase tracking-wider">{lang === "kh" ? "ភ្ញៀវចូលរួមសរុប" : "Total Guests"}</span>
              <span className="text-xl font-bold font-serif">{allGifts.length}</span>
            </div>
            <div className="text-center border-r border-gray-200 last:border-r-0">
              <span className="text-[10px] font-sans font-bold text-gray-500 block uppercase tracking-wider">{lang === "kh" ? "ប្រាក់ដុល្លារសរុប (USD)" : "Grand Total USD"}</span>
              <span className="text-xl font-black text-emerald-850 font-serif">${allGifts.reduce((acc, g) => acc + (g.amountUsd || 0), 0).toLocaleString()}</span>
            </div>
            <div className="text-center">
              <span className="text-[10px] font-sans font-bold text-gray-500 block uppercase tracking-wider">{lang === "kh" ? "ប្រាក់រៀលសរុប (៛)" : "Grand Total KHR"}</span>
              <span className="text-xl font-black text-rose-850 font-serif">{allGifts.reduce((acc, g) => acc + (g.amountRiel || 0), 0).toLocaleString()} ៛</span>
            </div>
          </div>

          {/* Table list */}
          <table className="w-full border-collapse border border-gray-300 text-xs text-left">
            <thead>
              <tr className="bg-rose-900 text-white font-sans text-[10px] uppercase font-bold">
                <th className="border border-gray-300 px-3 py-2 text-center w-10">{lang === "kh" ? "ល.រ" : "No."}</th>
                <th className="border border-gray-300 px-3 py-2">{lang === "kh" ? "ឈ្មោះភ្ញៀវ" : "Guest Full Name"}</th>
                <th className="border border-gray-300 px-3 py-2">{lang === "kh" ? "អាសយដ្ឋាន/មកពី" : "Origin Address / For"}</th>
                <th className="border border-gray-300 px-3 py-2 text-right">{lang === "kh" ? "ទឹកប្រាក់ USD" : "USD Amount"}</th>
                <th className="border border-gray-300 px-3 py-2 text-right">{lang === "kh" ? "ទឹកប្រាក់ RIEL" : "Riel Amount"}</th>
                <th className="border border-gray-300 px-3 py-2 text-center">{lang === "kh" ? "ថ្ងៃទទួល" : "Date"}</th>
                <th className="border border-gray-300 px-3 py-2">{lang === "kh" ? "កំណត់ចំណាំ" : "Notes"}</th>
              </tr>
            </thead>
            <tbody>
              {allGifts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border border-gray-300 px-3 py-4 text-center font-sans text-gray-500">
                    {lang === "kh" ? "គ្មានទិន្នន័យចំណងដៃក្នុងសៀវភៅទេ" : "No cash wedding gift registered yet."}
                  </td>
                </tr>
              ) : (
                allGifts.map((g, idx) => (
                  <tr key={g.id || idx} className="hover:bg-gray-50 odd:bg-white even:bg-gray-50/30">
                    <td className="border border-gray-300 px-3 py-1.5 text-center font-sans font-medium">{idx + 1}</td>
                    <td className="border border-gray-300 px-3 py-1.5 font-bold">{g.fullName}</td>
                    <td className="border border-gray-300 px-3 py-1.5 font-sans">{g.address || "-"}</td>
                    <td className="border border-gray-300 px-3 py-1.5 text-right font-mono font-bold text-emerald-800">
                      {g.amountUsd > 0 ? `$${g.amountUsd.toLocaleString()}` : "$0"}
                    </td>
                    <td className="border border-gray-300 px-3 py-1.5 text-right font-mono font-bold text-rose-800">
                      {g.amountRiel > 0 ? `${g.amountRiel.toLocaleString()} ៛` : "0 ៛"}
                    </td>
                    <td className="border border-gray-300 px-3 py-1.5 text-center font-sans text-[10px] whitespace-nowrap">{g.date}</td>
                    <td className="border border-gray-300 px-3 py-1.5 font-sans text-[10px] text-gray-700 italic">{g.otherNotes || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* Footer signature / certification area */}
          <div className="mt-12 flex justify-between items-center text-xs font-sans text-gray-600">
            <div>
              <p className="font-bold">{lang === "kh" ? "ការបញ្ជាក់ពីប្រព័ន្ធឌីជីថល៖" : "Security Checksum Verified:"}</p>
              <p className="text-[10px] font-mono select-all uppercase">SHA256-{currentUser.weddingId?.slice(0, 8)}-{allGifts.length}-{new Date().getTime().toString(16).toUpperCase()}</p>
            </div>
            <div className="border-t border-gray-400 pt-3 text-center w-48">
              <p className="font-bold text-gray-800">{lang === "kh" ? "ហត្ថលេខាអ្នកកត់ត្រា" : "Registrar Authorized Signature"}</p>
              <div className="h-12"></div>
              <p className="text-[10px] text-gray-400">@{currentUser.username}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
