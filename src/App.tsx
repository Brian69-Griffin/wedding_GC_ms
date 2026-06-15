import { useState, useEffect } from "react";
import { Heart, Notebook, QrCode, LogOut } from "lucide-react";
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
import { Shield } from "lucide-react";

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
    return (
      <div className={`min-h-screen transition-all duration-300 ${isNightMode ? "bg-gradient-to-br from-[#0c0000] via-[#1c0202] to-[#2b0303] text-gray-100" : "bg-gray-50/50 text-gray-900"}`}>
        {/* Navigation Head Rail */}
        <header className={`sticky top-0 z-40 w-full border-b transition-all duration-300 ${
          isNightMode 
            ? "border-amber-500/25 bg-[#150202]/95 backdrop-blur-md text-white" 
            : "border-rose-100 bg-white/80 backdrop-blur-md text-gray-950"
        }`}>
          <div className="mx-auto flex flex-col md:flex-row md:h-16 h-auto max-w-7xl items-center justify-between gap-3 md:gap-0 px-4 py-3.5 md:py-0">
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

            {/* Navigation Tabs selection */}
            <nav className={`flex items-center gap-1.5 p-1 rounded-xl border transition-all ${
              isNightMode 
                ? "bg-black/45 border-rose-955" 
                : "bg-gray-100 border-gray-150"
            }`}>
              <button
                id="tab_ledger_selector"
                onClick={() => setActiveTab("ledger")}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-all select-none cursor-pointer ${
                  activeTab === "ledger"
                    ? isNightMode ? "bg-amber-500 text-rose-950 shadow" : "bg-white text-rose-900 shadow-sm"
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
                    ? isNightMode ? "bg-amber-500 text-rose-950 shadow" : "bg-white text-rose-900 shadow-sm"
                    : isNightMode ? "text-gray-400 hover:text-white" : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <QrCode size={14} />
                <span>{t.qrEnvelopesTab}</span>
              </button>
            </nav>

            {/* Language, Lucky Toggle, and signout actions */}
            <div className="flex items-center gap-3">
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
                      : "text-gray-450 hover:text-gray-200"
                  }`}
                >
                  EN
                </button>
                <button
                  onClick={() => toggleLang("kh")}
                  className={`px-2 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                    lang === "kh"
                      ? "bg-rose-800 text-white shadow"
                      : "text-gray-450 hover:text-gray-200"
                  }`}
                >
                  ខ្មែរ
                </button>
              </div>

              {/* Mobile Quick Sign Out */}
              {/* Mobile Connect Face Login */}
              <button
                id="connect_face_mobile_btn"
                onClick={() => setIsConnectFaceOpen(true)}
                className={`flex md:hidden items-center justify-center p-2 rounded-xl border transition-all select-none active:scale-95 cursor-pointer ${
                  isNightMode 
                    ? "bg-amber-955/25 text-amber-400 border-amber-500/20 hover:bg-amber-950" 
                    : "bg-rose-50 text-rose-800 border-rose-101 hover:bg-rose-100/40"
                }`}
                title={lang === "kh" ? "ភ្ជាប់ស្កែនមុខ" : "Connect Face Security"}
              >
                <Shield size={13} className="text-amber-450" />
              </button>

              <button
                id="quick_sign_out_mobile_btn"
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
                className={`flex md:hidden items-center justify-center p-2 rounded-xl border transition-all select-none active:scale-95 cursor-pointer ${
                  isNightMode 
                    ? "bg-rose-950/40 text-rose-350 border-rose-900/50 hover:bg-rose-900/30" 
                    : "bg-rose-50 text-rose-850 border-rose-100 hover:bg-rose-101"
                }`}
                title={t.signOut}
              >
                <LogOut size={13} />
              </button>

              <div className="hidden md:flex items-center gap-2">
                <span className={`text-[11px] font-bold px-3 py-1.5 rounded-full border ${isNightMode ? "bg-black/40 border-rose-950 text-amber-300" : "bg-gray-100 border-gray-205 text-gray-500"}`}>
                  {t.loggedIn}: <span className="text-rose-450">@{currentUser.username}</span>
                </span>
                <button
                  id="connect_face_header_btn"
                  onClick={() => setIsConnectFaceOpen(true)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold border transition-all select-none active:scale-95 cursor-pointer ${
                    isNightMode 
                      ? "bg-amber-955/25 text-amber-400 border-amber-500/20 hover:bg-amber-950/40 shadow-sm" 
                      : "bg-rose-50 text-rose-800 border-rose-101 hover:bg-rose-100/60 shadow-sm"
                  }`}
                  title={lang === "kh" ? "ស្កែនទម្រង់មុខដើម្បីចូលគណនីពេលក្រោយ" : "Click to establish face login biometrics"}
                >
                  <Shield size={12} className="text-amber-450 animate-pulse" />
                  <span>{lang === "kh" ? "ភ្ជាប់ស្កែនមុខ" : "Connect Face"}</span>
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
          </div>
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
          />
        )}
      </div>
    );
  };

  return (
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
  );
}
