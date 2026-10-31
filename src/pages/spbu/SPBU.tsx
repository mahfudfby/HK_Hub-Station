// @ts-nocheck
import { firebaseConfig } from '../../shared/lib/firebase';
import QrisCard from '../../shared/components/QrisCard';
import { Toast } from '../../shared/components/Feedback';
import { canvasToBlob, saveFile } from '../../shared/lib/saveFile';
import FitPreview, { unfitPreview } from '../../shared/components/FitPreview';
import BgToggle from '../../shared/components/BgToggle';
import { TextSizeSlider, useFitScale, ScaleBox } from '../../shared/components/TextScale';
import { useBgRemoved } from '../../shared/lib/removeBg';
import { ADDRESS_TEMPLATES, DEFAULT_FUELS, PLATE_REGIONS, GENERIC_LOGOS, buildPlate, randomRegionCode, svgToDataUri, GAYA_NOTA, GAYA_NOTA_KEY } from './SPBU.templates';
import { useGoogleFonts, cssFamily, fontsReady } from '../../shared/lib/fonts';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, query, onSnapshot, deleteDoc } from 'firebase/firestore';

// --- GLOBAL CONFIG & UTILITIES ---
// Link Gemini Share : https://gemini.google.com/share/81cf6669d9f6
// Pastikan variabel global tersedia (disediakan oleh Canvas environment)
// Config Firebase: src/shared/lib/firebase.ts
const initialAuthToken = null;
const appId = import.meta.env.VITE_APP_ID || 'spbu-app';
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

const LOGO_MAX_WIDTH = 204;
// Logo bawaan bila stasiun belum punya logo: logo generik bawaan aplikasi (bukan logo merek dagang pihak lain)
const FALLBACK_LOGO_URL = svgToDataUri(GENERIC_LOGOS.find((l) => l.id === 'pompa')!.svg);
const LOCKED_FOOTER_TEXT = " TERIMAKASIH ATAS KUNJUNGAN ANDA \n____________________________\n____________________________\n____________________________\n____________________________\n____________________________\n"; 

// --- KONSTANTA DUKUNGAN BARU ---
const TRAKTEER_LINK = "https://drive.google.com/file/d/1dOBzvlBYWjHvPdpKzRNNTYqqoPTwQq0Y/view?usp=sharing";

// Helper untuk format Rupiah
const formatRupiah = (number) => {
    if (number === null || number === undefined || isNaN(number)) return '0';
    return Math.round(number).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

// Helper untuk format Waktu (HH:MM)
const formatTime = (date) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

// Helper untuk format Tanggal (DD/MM/YYYY)
const formatDate = (date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

// Helper untuk generate ID
const generateId = () => 'spbu-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

// Gambar (data URL atau link) -> JPEG Base64 maks maxWidth px, latar putih agar PNG transparan tidak jadi hitam
const resizeToBase64 = (src, maxWidth) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        try { resolve(canvas.toDataURL('image/jpeg', 0.7)); } catch (e) { reject(e); } // link yang menolak CORS
    };
    img.onerror = () => reject(new Error('Gambar tidak bisa dimuat.'));
    img.src = src;
});

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
});

// Helper untuk API Call dengan Exponential Backoff
const fetchWithBackoff = async (url, options, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response;
    } catch (error) {
      if (i < maxRetries - 1) {
        const delay = Math.pow(2, i) * 1000 + Math.random() * 500;
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw new Error("Gagal melakukan panggilan API setelah beberapa percobaan.");
      }
    }
  }
};


// --- INITIAL DATA STRUCTURES ---

const initialTransactionData = {
    shift: '1',
    noTrans: Math.floor(100000 + Math.random() * 900000).toString(),
    date: formatDate(new Date()),
    time: formatTime(new Date()),
    islandPump: '1',
    productName: 'Pertalite',
    pricePerLiter: 10000,
    volume: 10.0,
    cashAmount: 100000, // Nominal Beli/Total Harga
    operator: 'Admin',
    nopol: 'DR 1234 XY',
};

const initialSpbuConfig = {
    name: 'SPBU PERTAMINA 00.000.00',
    address: 'ALAMAT SPBU LENGKAP',
    footerNote: LOCKED_FOOTER_TEXT,
    receiptWidth: 275, 
    id: generateId(),
    logoBase64: null,
    fuels: DEFAULT_FUELS, // jenis & harga BBM milik template ini (dropdown Harga BBM)
};

// --- RENDER HELPERS (MEMOIZED INPUT COMPONENT) ---
// DIPINDAHKAN KELUAR DARI APP DAN DI-MEMOIZED UNTUK MENJAGA FOKUS
const TransactionInput = React.memo(({ label, name, value, inputType = 'text', disabled = false, showSyncButton = false, showRandomButton = false, onChange, updateDateTime, generateRandomId, isProcessing, isAiGenerating }) => {
    const isTel = inputType === 'tel';
    
    let displayValue = value;
    if (isTel && value === 0 && !disabled) {
        displayValue = ''; 
    } else if (isTel) {
        displayValue = String(value);
    }

    return (
        <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">{label}</label>
            <div className="flex items-center space-x-1">
                <input 
                    type={isTel ? 'text' : inputType} 
                    name={name} 
                    value={displayValue}
                    onChange={onChange}
                    disabled={disabled || isProcessing || isAiGenerating} 
                    className={`w-full p-2 border rounded-lg transition ${disabled ? 'bg-gray-200 cursor-not-allowed' : 'bg-white'} ${isProcessing || isAiGenerating ? 'opacity-70' : ''}`} 
                    inputMode={isTel ? 'numeric' : 'text'}
                />
                {/* Tombol Sync BARU (untuk Jam/Tanggal) */}
                {showSyncButton && (
                    <button type="button" onClick={updateDateTime} disabled={isProcessing || isAiGenerating}
                        className={`bg-indigo-500 hover:bg-indigo-600 text-white p-2 rounded-lg transition duration-150 transform hover:scale-105 ${isProcessing || isAiGenerating ? 'opacity-50 cursor-not-allowed' : ''}`} title="Gunakan waktu sekarang">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                    </button>
                )}
                {/* Tombol Random ID BARU (untuk No.Trans) */}
                {showRandomButton && (
                    <button type="button" onClick={generateRandomId} disabled={isProcessing || isAiGenerating}
                        className={`bg-purple-500 hover:bg-purple-600 text-white p-2 rounded-lg transition duration-150 transform hover:scale-105 ${isProcessing || isAiGenerating ? 'opacity-50 cursor-not-allowed' : ''}`} title="Generate No. Transaksi Acak">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181-3.183a8.25 8.25 0 0113.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0 0h-4.992m-2.285 3.96M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                        </svg>
                    </button>
                )}
            </div>
        </div>
    );
});


// --- GAYA NOTA (selain 'klasik') ---
// Hanya #000/#fff (thermal) dan CSS aman html2canvas: warna solid, border, flex. Tanpa filter/shadow/transform.
const INK = '#000';
const PAPER = '#fff';
const SEP_CHAR = { dash: '-', eq: '=', dot: '.', star: '*' };

const GayaNotaReceipt = ({ g, spbu, trans, logoSrc, priceLiter, volume, total, k }) => {
    const fs = g.size;
    const sep = () => SEP_CHAR[g.sep]
        ? <div style={{ overflow: 'hidden', whiteSpace: 'nowrap', lineHeight: 1.1, margin: '2px 0', letterSpacing: 0 }}>{SEP_CHAR[g.sep].repeat(120)}</div>
        : g.sep === 'double'
            ? <div style={{ borderTop: `1px solid ${INK}`, borderBottom: `1px solid ${INK}`, height: 4, margin: '5px 0' }} />
            : <div style={{ borderTop: `${g.sep === 'solid' ? 2 : 1}px ${g.sep === 'dashline' ? 'dashed' : 'solid'} ${INK}`, margin: '5px 0' }} />;

    const logo = (
        <img src={logoSrc} alt="Logo SPBU" crossOrigin="anonymous"
            style={{ display: 'block', height: 'auto', maxWidth: g.header === 'left' ? '100%' : `min(100%, ${LOGO_MAX_WIDTH}px)` }}
            onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_LOGO_URL; }} />
    );
    const titleStyle = {
        display: 'block', fontSize: fs + 3, fontWeight: 700, margin: '1px 0',
        ...(g.title === 'invert' && { background: INK, color: PAPER, padding: '2px 4px' }),
        ...(g.title === 'box' && { border: `2px solid ${INK}`, padding: '2px 4px' }),
        ...(g.title === 'spaced' && { letterSpacing: 3, textTransform: 'uppercase' }),
    };
    const nameAddr = (
        <div>
            <p style={titleStyle}>{spbu.name}</p>
            {(spbu.address || '').split('\n').slice(0, 2).map((line, i) => <p key={`addr-${i}`} style={{ fontSize: fs - 1 }}>{line}</p>)}
        </div>
    );

    const row = ([label, value], i, rows) => {
        if (g.rows === 'stack') return (
            <div key={label} style={{ marginBottom: 3 }}>
                <p style={{ fontSize: fs - 3 }}>{label}</p>
                <p style={{ fontWeight: 700 }}>{value}</p>
            </div>
        );
        if (g.rows === 'table') return (
            <div key={label} style={{ display: 'flex', borderTop: i ? `1px solid ${INK}` : 'none' }}>
                <span style={{ width: '45%', flexShrink: 0, padding: '1px 4px', borderRight: `1px solid ${INK}` }}>{label}</span>
                <span style={{ flexGrow: 1, padding: '1px 4px', textAlign: 'right' }}>{value}</span>
            </div>
        );
        return (
            <div key={label} style={{ display: 'flex' }}>
                <span style={{ width: '46%', flexShrink: 0, whiteSpace: 'nowrap' }}>{label}</span>
                <span style={{ flexShrink: 0 }}>:</span>
                <span style={{ flexGrow: 1, textAlign: 'right' }}>{value}</span>
            </div>
        );
    };
    const group = (rows) => (
        <div style={g.rows === 'table' ? { border: `1px solid ${INK}` } : undefined}>{rows.map(row)}</div>
    );

    const totalValue = `Rp. ${formatRupiah(total)}`;
    const totalBlock = g.total === 'big' ? (
        <div style={{ textAlign: 'center', margin: '4px 0' }}>
            <p style={{ fontSize: fs - 2, letterSpacing: 2, textTransform: 'uppercase' }}>Total Harga</p>
            <p style={{ fontSize: fs + 10, fontWeight: 700, lineHeight: 1.1 }}>{totalValue}</p>
        </div>
    ) : (
        <div style={{
            display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: fs + 1, margin: '3px 0',
            ...(g.total === 'invert' && { background: INK, color: PAPER, padding: '3px 4px' }),
            ...(g.total === 'box' && { border: `2px solid ${INK}`, padding: '3px 4px' }),
        }}>
            <span>Total Harga</span><span>{totalValue}</span>
        </div>
    );

    const footerLines = (spbu.footerNote || '').split('\n');
    return (
        <div id="receipt-preview" className="text-left"
            style={{ width: `${spbu.receiptWidth || 275}px`, padding: 8, background: PAPER, color: INK, fontFamily: cssFamily(g.font.family, g.font.fallback), fontSize: fs, lineHeight: 1.25, textTransform: g.upper ? 'uppercase' : 'none' }}><ScaleBox k={k}>
            {g.header === 'left' ? (
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                    <div style={{ width: '36%', flexShrink: 0, marginRight: 6 }}>{logo}</div>
                    <div style={{ flexGrow: 1, minWidth: 0 }}>{nameAddr}</div>
                </div>
            ) : (
                <div style={{ textAlign: 'center', marginBottom: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}>{logo}</div>
                    {nameAddr}
                </div>
            )}
            {sep()}
            {g.meta === 'grid' ? (
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                    {[['Shift', trans.shift, 'left'], ['No.Trans', trans.noTrans, 'right'], ['Tanggal', trans.date, 'left'], ['Jam', trans.time, 'right']].map(([label, value, align]) => (
                        <div key={label} style={{ width: '50%', textAlign: align, marginBottom: 2 }}>
                            <p style={{ fontSize: fs - 2 }}>{label}:</p>
                            <p style={{ fontWeight: 700 }}>{value}</p>
                        </div>
                    ))}
                </div>
            ) : group([['Shift', trans.shift], ['No.Trans', trans.noTrans], ['Tanggal', trans.date], ['Jam', trans.time]])}
            {sep()}
            {group([
                ['Pulau/Pompa', trans.islandPump],
                ['Nama Produk', trans.productName],
                ['Harga/Liter', `Rp. ${formatRupiah(priceLiter)}`],
                ['Volume', `(L) ${volume.toFixed(2)}`],
            ])}
            {totalBlock}
            {group([['Operator', trans.operator], ['Nopol', trans.nopol]])}
            {sep()}
            <div style={{ textAlign: 'center', marginTop: 6, overflow: 'hidden', fontWeight: g.footer === 'bold' ? 700 : 400 }}>
                {footerLines.map((line, i) => (
                    <p key={`footer-${i}`} style={{ whiteSpace: 'pre-wrap', ...(g.footer === 'invert' && i === 0 && { background: INK, color: PAPER, fontWeight: 700, padding: '2px 0' }) }}>{line || ' '}</p>
                ))}
            </div>
        </ScaleBox></div>
    );
};

// --- MAIN REACT COMPONENT ---
const App = () => {
    // --- STATE MANAGEMENT ---
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    
    const [spbuList, setSpbuList] = useState([]);
    const [selectedSpbuId, setSelectedSpbuId] = useState('');
    const [currentSpbu, setCurrentSpbu] = useState(initialSpbuConfig);
    const [transactionData, setTransactionData] = useState(initialTransactionData);
    
    // ============================================================
    // SECTION: Menu = URL (/spbu, /spbu/edit, /spbu/baru)
    // ============================================================
    const location = useLocation();
    const navigate = useNavigate();
    const uiState = location.pathname.endsWith('/edit') ? 'edit' : location.pathname.endsWith('/baru') ? 'new' : 'view';
    const MENU_PATH = { view: '/spbu', edit: '/spbu/edit', new: '/spbu/baru' };
    // Masuk menu form = push (tombol Back kembali ke menu sebelumnya); kembali ke 'view' = replace (hindari loop history)
    const setUiState = (state) => navigate(MENU_PATH[state] || '/spbu', { replace: state === 'view' });
    const [isListLoaded, setIsListLoaded] = useState(false);
    const [feedback, setFeedback] = useState(null); // { message, type }
    const [isProcessing, setIsProcessing] = useState(false);
    const [logoBg, setLogoBg] = useState(false);
    const [isAiGenerating, setIsAiGenerating] = useState(false);
    const [isLibReady, setIsLibReady] = useState(false);
    // Gaya Nota = tampilan visual struk (lokal per perangkat), terpisah dari Template SPBU di Firestore
    const [gayaNota, setGayaNota] = useState(() => { try { return localStorage.getItem(GAYA_NOTA_KEY) || 'klasik'; } catch { return 'klasik'; } });
    const pilihGayaNota = (id) => { setGayaNota(id); try { localStorage.setItem(GAYA_NOTA_KEY, id); } catch { /* mode privat */ } };
    const gaya = GAYA_NOTA.find(g => g.id === gayaNota) || GAYA_NOTA[0];
    // Ukuran teks nota (lokal per perangkat, seperti Gaya Nota)
    const [skala, setSkala] = useState(() => { try { return Number(localStorage.getItem('spbu:skala:v1')) || 100; } catch { return 100; } });
    const pilihSkala = (v) => { setSkala(v); try { localStorage.setItem('spbu:skala:v1', String(v)); } catch { /* mode privat */ } };
    useGoogleFonts([gaya.font.google ? gaya.font : null]);

    // --- EFFECT: FIREBASE INITIALIZATION & AUTH ---
    useEffect(() => {
        if (Object.keys(firebaseConfig).length === 0) {
            setFeedback({ message: 'Kesalahan: Konfigurasi Firebase tidak tersedia.', type: 'error' });
            setIsAuthReady(true);
            return;
        }

        try {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);
            setAuth(authInstance);
            setDb(dbInstance);

            const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
                try {
                    if (user) {
                        setUserId(user.uid);
                    } else if (initialAuthToken) {
                        try {
                            await signInWithCustomToken(authInstance, initialAuthToken);
                        } catch (e) {
                            console.error('Custom token sign-in failed, signing in anonymously.', e);
                            await signInAnonymously(authInstance);
                        }
                        setUserId(authInstance.currentUser?.uid);
                    } else {
                        await signInAnonymously(authInstance);
                        setUserId(authInstance.currentUser?.uid);
                    }
                } catch (e) {
                    console.error('Login Firebase gagal:', e);
                    const msg = e?.code === 'auth/operation-not-allowed' ? 'Login Anonymous belum diaktifkan di Firebase Console (Authentication > Sign-in method).'
                        : e?.code === 'auth/unauthorized-domain' ? 'Domain ini belum ditambahkan di Firebase (Authentication > Settings > Authorized domains).'
                        : `Login Firebase gagal: ${e?.message || e}`;
                    setFeedback({ message: msg, type: 'error' });
                } finally {
                    setIsAuthReady(true); // selalu keluar dari layar loading
                }
            });

            return () => unsubscribe();
        } catch (e) {
            setFeedback({ message: `Init Error: ${e.message}`, type: 'error' });
            setIsAuthReady(true);
        }
    }, []);

    // --- EFFECT: FIRESTORE DATA LISTENER (SPBU CONFIGS) ---
    useEffect(() => {
        if (!db || !isAuthReady) return;

        // Path: /artifacts/{appId}/public/data/spbu_configs
        const q = query(collection(db, 'artifacts', appId, 'public', 'data', 'spbu_configs'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setSpbuList(list);
            setIsListLoaded(prev => {
                if (!prev) setFeedback({ message: `Data dimuat: ${list.length} template SPBU.`, type: 'success' });
                return true;
            });
            
            // Sinkronisasi SPBU yang dipilih setelah pembaruan list
            setSelectedSpbuId(prevId => {
                const isCurrentStillInList = list.some(s => s.id === prevId);
                return isCurrentStillInList && prevId ? prevId : list.length > 0 ? list[0].id : '';
            });

        }, (e) => { console.error('Gagal memuat data SPBU:', e); setFeedback({ message: `Gagal memuat data: ${e.code === 'permission-denied' ? 'akses ditolak oleh Firestore Rules / login belum berhasil.' : e.message}`, type: 'error' }); });

        return () => unsubscribe();
    }, [db, isAuthReady]);

    // --- EFFECT: SYNC currentSpbu when selectedSpbuId or spbuList changes ---
    useEffect(() => {
        if (uiState === 'new') return; // draft template baru tidak boleh ditimpa
        const selected = spbuList.find(s => s.id === selectedSpbuId);
        if (selected) {
            // Selalu timpa footer dengan teks terkunci saat memilih/memuat
            setCurrentSpbu({ ...selected, footerNote: LOCKED_FOOTER_TEXT });
        } else {
            // Default jika tidak ada data atau template baru
            setCurrentSpbu(initialSpbuConfig);
            if (spbuList.length > 0) setSelectedSpbuId(spbuList[0].id);
        }
    }, [selectedSpbuId, spbuList, uiState]);

    // --- EFFECT: DRAFT TEMPLATE BARU (juga saat reload langsung di /spbu/baru) ---
    useEffect(() => {
        if (uiState !== 'new') return;
        setCurrentSpbu({ ...initialSpbuConfig, id: generateId(), name: 'SPBU BARU', logoBase64: null, footerNote: LOCKED_FOOTER_TEXT, receiptWidth: 275 });
    }, [uiState]);

    // --- EFFECT: GUARD /spbu/edit tanpa template terpilih -> kembali ke /spbu ---
    useEffect(() => {
        if (uiState === 'edit' && isListLoaded && !selectedSpbuId) navigate('/spbu', { replace: true });
    }, [uiState, isListLoaded, selectedSpbuId, navigate]);

    // --- EFFECT: LOAD HTML2CANVAS ---
    useEffect(() => {
        if (window.html2canvas) {
            setIsLibReady(true);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.async = true;
        script.onload = () => setIsLibReady(true);
        script.onerror = () => setFeedback({ message: 'Gagal memuat library pencetakan.', type: 'error' });
        document.body.appendChild(script);
    }, []);
    
    // --- DERIVED STATE / CALCULATIONS ---

    const { calculatedVolume, finalPrice, isVolumeCalculated } = useMemo(() => {
        // FIX: Mengganti pricePerLiter yang tidak terdefinisi menjadi pL (Local Price Liter)
        const pL = parseFloat(transactionData.pricePerLiter) || 0; // Local Price Liter
        const nominalBeli = parseFloat(transactionData.cashAmount) || 0;

        let calculatedVolume = parseFloat(transactionData.volume) || 0;
        let finalPrice = nominalBeli;
        let isVolumeCalculated = false;

        // Menggunakan pL untuk kalkulasi
        if (nominalBeli > 0 && pL > 0) {
            calculatedVolume = nominalBeli / pL;
            isVolumeCalculated = true;
            finalPrice = nominalBeli;
        } else if (calculatedVolume > 0 && pL > 0) {
            finalPrice = calculatedVolume * pL;
        } else {
            calculatedVolume = 0;
            finalPrice = 0;
        }
        
        return { calculatedVolume, finalPrice, isVolumeCalculated };
    }, [transactionData]);


    // --- HANDLERS & LOGIC FUNCTIONS ---
    
    const clearFeedback = useCallback(() => setFeedback(null), []);
    const displayFeedback = useCallback((message, type) => {
        setFeedback({ message, type }); // auto-hide diatur oleh <Toast>
    }, []);

    const handleTransactionChange = useCallback((e) => {
        const { name, value } = e.target;
        let newValue = value;
        
        setTransactionData(prev => {
            let update = { ...prev };
            
            if (['volume', 'pricePerLiter', 'cashAmount'].includes(name)) {
                // Hapus semua kecuali angka dan satu titik (untuk desimal)
                newValue = newValue.replace(/[^0-9.]/g, ''); 
                const floatValue = parseFloat(newValue) || 0;
                
                update[name] = floatValue;

                // Logika Kalkulasi: Jika Volume diubah saat Nominal Beli terisi, reset Nominal Beli
                if (name === 'volume' && prev.cashAmount > 0) {
                    update.cashAmount = 0; 
                }
            } else {
                update[name] = value;
            }
            return update;
        });
    }, []);

    const handleSpbuChange = useCallback((e) => {
        const { name, value } = e.target;
        
        if (name === 'footerNote') return;
        
        setCurrentSpbu(prev => ({
            ...prev,
            [name]: name === 'receiptWidth' ? (parseInt(value) || 275) : value,
        }));
    }, []);

    const updateDateTime = useCallback(() => {
        const now = new Date();
        setTransactionData(prev => ({
            ...prev,
            date: formatDate(now),
            time: formatTime(now),
        }));
        displayFeedback('Tanggal dan waktu diperbarui.', 'info');
    }, [displayFeedback]);

    // BARU: Fungsi untuk menghasilkan ID Transaksi acak 6 digit
    const generateRandomTransId = useCallback(() => {
        const randomId = Math.floor(100000 + Math.random() * 900000).toString();
        setTransactionData(prev => ({ ...prev, noTrans: randomId }));
        displayFeedback('Nomor Transaksi acak berhasil dibuat.', 'info');
    }, [displayFeedback]);


    const handleImageUpload = useCallback(async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        displayFeedback('Sedang memproses gambar...', 'loading');
        try {
            const base64Data = await resizeToBase64(await readFileAsDataUrl(file), LOGO_MAX_WIDTH);
            setCurrentSpbu(prev => ({ ...prev, logoBase64: base64Data }));
            displayFeedback('Gambar berhasil diupload dan diresize. Jangan lupa klik Simpan.', 'success');
        } catch (err) {
            console.error('Upload logo gagal:', err);
            displayFeedback('Gagal memproses gambar. Pastikan file berupa gambar.', 'error');
        }
    }, [displayFeedback]);

    // Logo dari link (disalin jadi Base64 agar ikut tersimpan & aman saat Export PNG)
    const [logoLink, setLogoLink] = useState('');
    const handleLogoLink = useCallback(async () => {
        const url = logoLink.trim();
        if (!/^https?:\/\/\S+$/i.test(url)) return displayFeedback('Link harus diawali http:// atau https://', 'error');
        displayFeedback('Mengambil logo dari link...', 'loading');
        try {
            const base64Data = await resizeToBase64(url, LOGO_MAX_WIDTH);
            setCurrentSpbu(prev => ({ ...prev, logoBase64: base64Data }));
            setLogoLink('');
            displayFeedback('Logo dari link berhasil dipasang. Jangan lupa klik Simpan.', 'success');
        } catch (err) {
            console.error('Logo dari link gagal:', err);
            displayFeedback('Link tidak bisa dipakai (bukan gambar langsung, atau situsnya menolak akses). Unduh gambarnya lalu pakai Pilih File.', 'error');
        }
    }, [logoLink, displayFeedback]);
    
    // ============================================================
    // SECTION: Handler — Template (Alamat, Harga, Plat, Logo Generik)
    // ============================================================
    const handleAddressTemplate = useCallback((e) => {
        const tpl = ADDRESS_TEMPLATES[parseInt(e.target.value)];
        if (tpl) setCurrentSpbu(prev => ({ ...prev, address: tpl.value }));
    }, []);

    // ============================================================
    // SECTION: Jenis & Harga BBM (disimpan per template SPBU)
    // ============================================================
    const fuels = currentSpbu.fuels?.length ? currentSpbu.fuels : DEFAULT_FUELS;
    const handlePriceTemplate = (e) => {
        const f = fuels[parseInt(e.target.value)];
        if (f) setTransactionData(prev => ({ ...prev, productName: f.name, pricePerLiter: f.price }));
    };
    const setFuels = (fn) => setCurrentSpbu(prev => ({ ...prev, fuels: fn(prev.fuels?.length ? prev.fuels : DEFAULT_FUELS) }));
    const updateFuel = (i, key, value) => setFuels(list => list.map((f, j) => j !== i ? f
        : { ...f, [key]: key === 'price' ? (parseInt(value.replace(/\D/g, ''), 10) || 0) : value }));
    const addFuel = () => setFuels(list => [...list, { name: '', price: 0 }]);
    const removeFuel = (i) => setFuels(list => list.filter((_, j) => j !== i));

    const handlePlateTemplate = useCallback((code) => {
        setTransactionData(prev => ({ ...prev, nopol: buildPlate(code || randomRegionCode()) }));
    }, []);

    const handleGenericLogo = useCallback((logo) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = LOGO_MAX_WIDTH * 2;
            canvas.height = 140;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            setCurrentSpbu(prev => ({ ...prev, logoBase64: canvas.toDataURL('image/png') }));
            displayFeedback(`Logo "${logo.label}" dipilih. Jangan lupa klik Simpan.`, 'success');
        };
        img.onerror = () => displayFeedback('Gagal memuat logo generik.', 'error');
        img.src = svgToDataUri(logo.svg);
    }, [displayFeedback]);

    const handleClearLogo = useCallback(() => {
        setCurrentSpbu(prev => ({ ...prev, logoBase64: null }));
        // Reset input file (secara manual, karena React tidak mengontrol type="file" value)
        document.getElementById('logo-upload').value = ''; 
        displayFeedback('Logo berhasil dihapus.', 'info');
    }, [displayFeedback]);

    const handleSaveSpbu = useCallback(async () => {
        if (!db || !currentSpbu.name) return displayFeedback('Nama SPBU wajib diisi.', 'error');
        const cleanFuels = (currentSpbu.fuels?.length ? currentSpbu.fuels : DEFAULT_FUELS)
            .map(f => ({ name: String(f.name || '').trim(), price: Number(f.price) || 0 }))
            .filter(f => f.name);
        if (!cleanFuels.length) return displayFeedback('Isi minimal satu jenis BBM.', 'error');
        setIsProcessing(true);
        displayFeedback('Menyimpan template...', 'loading');

        try {
            const spbuToSave = {
                ...currentSpbu,
                fuels: cleanFuels,
                footerNote: LOCKED_FOOTER_TEXT,
                // Jika ID sudah ada di list, gunakan yang itu. Jika tidak, generate baru.
                id: currentSpbu.id && spbuList.find(s => s.id === currentSpbu.id) ? currentSpbu.id : generateId()
            }; 
            
            // Simpan ke Firestore
            await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'spbu_configs', spbuToSave.id), spbuToSave, { merge: true });
            
            // Update state; harga di form transaksi ikut harga baru bila produknya sama
            setTransactionData(prev => {
                const f = cleanFuels.find(x => x.name === prev.productName);
                return f ? { ...prev, pricePerLiter: f.price } : prev;
            });
            setSelectedSpbuId(spbuToSave.id);
            setUiState('view');
            displayFeedback('Template berhasil disimpan!', 'success');

        } catch (e) { 
            console.error('Gagal simpan:', e);
            displayFeedback(`Gagal simpan: ${e.message}`, 'error'); 
        } finally {
            setIsProcessing(false);
        }
    }, [db, currentSpbu, spbuList, displayFeedback]);

    const handleDeleteSpbu = useCallback(async () => {
        if (!db || !currentSpbu.id || !window.confirm(`Yakin ingin menghapus template SPBU "${currentSpbu.name}"?`)) return;
        setIsProcessing(true);
        displayFeedback('Menghapus template...', 'loading');
        try {
            await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'spbu_configs', currentSpbu.id));
            setSelectedSpbuId(''); // Dipilih otomatis ke yang pertama di list
            setUiState('view');
            displayFeedback('Template berhasil dihapus.', 'success');
        } catch (e) {
            console.error('Gagal hapus:', e);
            displayFeedback(`Gagal hapus: ${e.message}`, 'error');
        } finally {
            setIsProcessing(false);
        }
    }, [db, currentSpbu, displayFeedback]);

    const handleAiGenerateTemplate = useCallback(async () => {
        if (!currentSpbu.name) return displayFeedback('Isi nama SPBU dulu.', 'error');
        if(isAiGenerating) return;
        
        setIsAiGenerating(true);
        displayFeedback('Sedang membuat alamat fiktif...', 'loading');

        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
            const response = await fetchWithBackoff(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `Buat alamat fiktif realistis (multi-baris dengan \\n) untuk SPBU bernama: "${currentSpbu.name}". Hanya balas JSON.` }] }],
                    systemInstruction: { parts: [{ text: `Anda asisten generator nota. Batasi alamat hanya 2 baris. Balas HANYA JSON: {"address": "..."}` }] },
                    generationConfig: { responseMimeType: "application/json" }
                })
            });

            const data = await response.json();
            const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!resultText) { throw new Error("Struktur respons AI tidak valid."); }

            const result = JSON.parse(resultText);
            
            let address = result.address || currentSpbu.address;
            // Memastikan alamat maksimal 2 baris di sini
            const lines = address.split('\n');
            address = lines.slice(0, 2).join('\n');


            setCurrentSpbu(prev => ({ ...prev, address: address }));
            
            displayFeedback('Alamat berhasil dibuat!', 'success');

        } catch (e) { 
            console.error("AI Generation Error:", e);
            displayFeedback(`AI Gagal: ${e.message || 'Cek koneksi internet.'}`, 'error'); 
        } finally { 
            setIsAiGenerating(false); 
        }
    }, [currentSpbu.name, displayFeedback, isAiGenerating]);

    // --- RENDER UTILITIES ---
    
    // Logo yang tampil di nota (opsional tanpa background)
    const logoShown = useBgRemoved(currentSpbu.logoBase64 || FALLBACK_LOGO_URL, logoBg, (m) => displayFeedback(m, 'error'));

    const k = useFitScale(skala / 100, () => document.getElementById('receipt-preview'), false, [skala, gayaNota, transactionData, currentSpbu, logoShown.src]);

    // Fungsi untuk membuat elemen HTML nota yang akan dicetak/di-export
    const ReceiptPreviewComponent = useCallback(() => {
        const trans = transactionData;
        const spbu = currentSpbu;
        const displayVolume = calculatedVolume || parseFloat(trans.volume) || 0;
        const displayPrice = finalPrice || parseFloat(trans.cashAmount) || 0;
        const priceLiter = parseFloat(trans.pricePerLiter) || 0;

        if (gaya.id !== 'klasik') {
            return <GayaNotaReceipt g={gaya} spbu={spbu} trans={trans} logoSrc={logoShown.src} priceLiter={priceLiter} volume={displayVolume} total={displayPrice} k={k} />;
        }

        // Batasi Address hanya 2 baris saat dirender
        const addressLines = (spbu.address || '').split('\n').slice(0, 2).map((line, i) => (
            <p key={`addr-${i}`} className="text-base font-normal">{line}</p>
        ));
        
        const footerLines = (spbu.footerNote || '').split('\n').map((line, i) => (
            <p key={`footer-${i}`}>{line || ' '}</p>
        ));

        const renderReceiptRow = (label, value, isTotal = false) => (
            <div className={`flex justify-between ${isTotal ? 'text-base font-bold' : 'text-base'}`}> 
                <span className="font-normal w-32 flex-shrink-0 whitespace-nowrap">{label} :</span> 
                <span className={`flex-grow text-right ${isTotal ? 'text-base font-extrabold' : 'text-base font-normal'}`}>{value}</span>
            </div>
        );

        return (
            <div id="receipt-preview" 
                 style={{ width: `${spbu.receiptWidth || 275}px` }}
                 className="doc-font text-left p-2 text-black leading-tight font-sans"
            ><ScaleBox k={k}>
                {/* Logo Section */}
                <div className="flex justify-center mb-1">
                    <img 
                        src={logoShown.src} 
                        alt="Logo SPBU" 
                        crossOrigin="anonymous"
                        className={`max-w-[${LOGO_MAX_WIDTH}px] h-auto max-w-full filter grayscale`} 
                        onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_LOGO_URL; }} 
                    />
                </div>
                {/* SPBU Name and Address */}
                <div className="text-center font-bold mb-1"> 
                    <p className="text-lg">{spbu.name}</p>
                    {addressLines}
                </div>

                <div className="border-t border-b border-dashed border-black my-1 h-0"></div>
                
                {/* BLOK DATA TANGGAL/SHIFT/NOTA */}
                <div className="grid grid-cols-2 gap-x-2 text-base text-center">
                    <div><p className="font-medium text-left">Shift:</p><p className="text-left">{trans.shift}</p></div>
                    <div><p className="font-medium text-right">No.Trans:</p><p className="text-right">{trans.noTrans}</p></div>
                    
                    <div className="col-span-2 border-t border-dashed border-black my-1 h-0"></div>

                    <div><p className="font-bold text-left">Tanggal:</p><p className="font-bold text-left">{trans.date}</p></div>
                    <div><p className="font-bold text-right">Jam:</p><p className="font-bold text-right">{trans.time}</p></div>
                </div>

                <div className="border-t border-b border-dashed border-black my-1 h-0"></div>
                
                {/* Blok Data Transaksi Utama */}
                <div className="space-y-0 text-base"> 
                    {renderReceiptRow('Pulau/Pompa', trans.islandPump)}
                    {renderReceiptRow('Nama Produk', trans.productName)}
                    {renderReceiptRow('Harga/Liter', `Rp. ${formatRupiah(priceLiter)}`)}
                    {renderReceiptRow('Volume', ` (L) ${displayVolume.toFixed(2)}`)}
                    
                    {renderReceiptRow('Total Harga', `Rp. ${formatRupiah(displayPrice)}`, true)}

                    {renderReceiptRow('Operator', trans.operator)}
                    {renderReceiptRow('Nopol', trans.nopol)}
                </div>

                <div className="border-t border-b border-dashed border-black my-1 h-0"></div>
                
                {/* Footer */}
                <div className="text-center mt-2 text-base whitespace-pre-line leading-tight font-bold">
                    {footerLines}
                </div>
            </ScaleBox></div>
        );
    }, [transactionData, currentSpbu, calculatedVolume, finalPrice, logoShown.src, gaya, k]);

    // --- EXPORT/PRINT LOGIC ---

    const generateCanvas = useCallback(async () => {
        if (!window.html2canvas || !isLibReady) {
             throw new Error('Library html2canvas belum siap. Mohon tunggu sebentar.');
        }
        const receiptEl = document.getElementById('receipt-preview');
        if (!receiptEl) {
            throw new Error('Tampilan nota tidak ditemukan.');
        }
        
        await new Promise(r => setTimeout(r, 100)); // Tunggu rendering React selesai
        await fontsReady(); // font dokumen (termasuk Google Font gaya nota) wajib termuat agar tata letak sama di semua perangkat

        // Skala tetap (bukan dibagi devicePixelRatio) supaya resolusi nota sama di semua perangkat
        const width = currentSpbu.receiptWidth || 275;

        return await window.html2canvas(receiptEl, { 
            scale: 3,
            windowWidth: 1280,
            onclone: unfitPreview,
            useCORS: true, 
            backgroundColor: '#ffffff',
            width: width, 
        });
    }, [isLibReady, currentSpbu.receiptWidth]);

    const handleExportImage = useCallback(async () => {
        if (!isLibReady || isProcessing) return;
        setIsProcessing(true);
        displayFeedback('Membuat gambar PNG...', 'loading');
        try {
            const canvas = await generateCanvas();
            saveFile(await canvasToBlob(canvas), `Nota-${transactionData.noTrans}-${transactionData.nopol}.png`);
            displayFeedback('Gambar berhasil diexport!', 'success');
        } catch (e) { 
            console.error('Export Error:', e);
            displayFeedback(`Gagal export: ${e.message}`, 'error'); 
        } finally { 
            setIsProcessing(false); 
        }
    }, [isLibReady, isProcessing, generateCanvas, transactionData, displayFeedback]);

    const handlePrintReceipt = useCallback(async () => {
        if (!isLibReady || isProcessing) return;
        setIsProcessing(true);
        displayFeedback('Menyiapkan cetakan...', 'loading');
        try {
            const canvas = await generateCanvas();
            const imgData = canvas.toDataURL('image/png');
            
            const win = window.open('', '_blank');
            if (!win) throw new Error('Pop-up diblokir browser. Izinkan pop-up untuk mencetak.');
            win.document.write(`
                <html>
                    <head>
                        <title>Cetak Nota</title>
                        <style>
                            body { margin: 0; padding: 0; background-color: #eee; display: flex; justify-content: center; }
                            img { max-width: 100%; height: auto; display: block; }
                            @media print {
                                @page { size: 58mm auto; margin: 0mm; }
                                body { 
                                    margin: 0; 
                                    width: 58mm;    
                                    background-color: transparent;
                                    display: block; 
                                }
                                .print-container { width: 100%; margin: 0; }
                                img { width: 100%; image-rendering: pixelated; }
                            }
                        </style>
                    </head>
                    <body onload="window.print();window.close()">
                        <div class="print-container">
                            <img src="${imgData}" alt="Nota Transaksi" />
                        </div>
                    </body>
                </html>
            `);
            win.document.close();
            displayFeedback('Jendela cetak dibuka.', 'success');
        } catch (e) { 
            console.error('Print Error:', e);
            displayFeedback(`Gagal cetak: ${e.message}`, 'error'); 
        } finally { 
            setIsProcessing(false); 
        }
    }, [isLibReady, isProcessing, generateCanvas, displayFeedback]);

    // --- RENDER MAIN LAYOUT ---

    // Tampilkan overlay loading saat autentikasi belum siap
    if (!isAuthReady) {
        return (
            <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center text-white z-50 font-sans">
                <div className="flex items-center space-x-3">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    <span>Memuat Aplikasi dan Data...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex justify-center p-4 sm:p-8 font-sans">
            <style jsx="true">{`
                #receipt-preview {
                    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
                    line-height: 1.2;
                }
                .spinner {
                    border: 4px solid rgba(255, 255, 255, 0.3);
                    border-top: 4px solid #fff;
                    border-radius: 50%;
                    width: 16px;
                    height: 16px;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>

            <div className="w-full max-w-md">
                <Link to="/" className="inline-block mb-3 text-sm font-medium text-indigo-700 transition-colors duration-200 hover:text-indigo-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-700">&larr; Kembali ke HK Hub Station</Link>
                {/* Header */}
                <header className="text-center mb-6 border-b-4 border-indigo-600 pb-3 bg-white p-4 rounded-xl shadow-lg">
                    <h1 className="text-3xl font-extrabold text-gray-800">Generator Nota SPBU</h1>
                    <p className="text-sm font-medium text-gray-700 mt-1">
                        Generator Nota BBM oleh Mahfudfebry (React/Firestore)
                    </p>
                    <p className="text-xs text-gray-500">
                         User ID: {userId}
                    </p>
                </header>
                
                {/* BAGIAN TOMBOL TRAKTIR (QRIS pop-up, komponen bersama) */}
                <QrisCard />

                {/* Feedback Message */}
                <Toast toast={feedback} onClose={clearFeedback} />
                
                {/* --- Bagian 1: Pilih SPBU --- */}
                <div className="mb-6 p-4 bg-white rounded-xl shadow-lg">
                    <h2 className="text-xl font-bold mb-3 text-indigo-700">1. Pilih Template SPBU</h2>
                    
                    {/* DROPDOWN TEMPLATE */}
                    <select 
                        id="spbu-selector" 
                        className="w-full p-2 border rounded-lg bg-gray-50 mb-4"
                        value={selectedSpbuId}
                        onChange={(e) => {
                            setSelectedSpbuId(e.target.value);
                            setUiState('view');
                        }}
                        disabled={isProcessing || isAiGenerating || spbuList.length === 0}
                    >
                        {spbuList.length === 0 ? (
                            <option value="">Tidak Ada Template (Gunakan Default)</option>
                        ) : (
                            spbuList.map(spbu => (
                                <option key={spbu.id} value={spbu.id}>{spbu.name}</option>
                            ))
                        )}
                    </select>

                    {/* PERUBAHAN KRUSIAL: Tombol Edit dan Baru di bawah dropdown */}
                    <div className="flex justify-between space-x-2">
                        <button 
                            onClick={() => setUiState('edit')} 
                            disabled={!selectedSpbuId || isProcessing || isAiGenerating}
                            className={`flex-grow bg-yellow-500 text-white px-3 py-2 rounded-lg font-bold hover:bg-yellow-600 transition disabled:opacity-50`}
                        >
                            Edit Template
                        </button>
                        <button 
                            onClick={() => setUiState('new')} 
                            disabled={isProcessing || isAiGenerating}
                            className={`flex-grow bg-green-600 text-white px-3 py-2 rounded-lg font-bold hover:bg-green-700 transition disabled:opacity-50`}
                        >
                            Buat Baru
                        </button>
                    </div>
                </div>

                {/* --- Bagian Edit Template (Conditional) --- */}
                {(uiState === 'edit' || uiState === 'new') && (
                    <div className="mb-6 p-4 bg-white rounded-xl shadow-2xl border-t-4 border-blue-500 space-y-4">
                        <h2 className="text-xl font-bold text-blue-700">{uiState === 'new' ? 'Buat Template Baru' : `Edit Template: ${currentSpbu.name}`}</h2>
                        
                        <div className="flex space-x-2 items-end">
                            <div className="flex-grow">
                                <label className="text-sm font-medium text-gray-700 block mb-1">Nama SPBU</label>
                                <input type="text" name="name" value={currentSpbu.name} onChange={handleSpbuChange}
                                    className="w-full p-2 border rounded-lg bg-white" disabled={isProcessing || isAiGenerating} />
                            </div>
                            <button onClick={handleAiGenerateTemplate} disabled={isProcessing || isAiGenerating}
                                className={`bg-purple-600 text-white p-2 h-10 w-10 rounded-lg flex items-center justify-center transition ${isProcessing || isAiGenerating ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700'}`} title="Generate Alamat dengan AI">
                                {isAiGenerating ? <div className="spinner"></div> : ''}
                            </button>
                        </div>
                        
                        {/* Upload Logo */}
                        <div className="space-y-2">
                            {/* PERUBAHAN KRUSIAL DI SINI: Label dibuat 2 baris */}
                            <label htmlFor="logo-upload" className="text-sm font-medium text-gray-700 block mb-1 leading-snug">
                                Upload Logo SPBU<br/>(Max {LOGO_MAX_WIDTH}px)
                            </label>
                            <div className="flex items-center gap-2">
                                <input type="file" id="logo-upload" accept="image/*" onChange={handleImageUpload}
                                    className="flex-1 min-w-0 p-2 border rounded-lg bg-white" disabled={isProcessing || isAiGenerating} />
                                <BgToggle checked={logoBg} onChange={setLogoBg} busy={logoShown.busy} />
                            </div>
                            <label htmlFor="logo-link" className="text-sm font-medium text-gray-700 block">Atau tempel link gambar</label>
                            <div className="flex items-center gap-2">
                                <input type="url" id="logo-link" value={logoLink} onChange={(e) => setLogoLink(e.target.value)}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleLogoLink(); }}
                                    placeholder="https://contoh.com/logo.png" inputMode="url"
                                    className="flex-1 min-w-0 p-2 border rounded-lg bg-white" disabled={isProcessing || isAiGenerating} />
                                <button type="button" onClick={handleLogoLink} disabled={!logoLink.trim() || isProcessing || isAiGenerating}
                                    className="px-4 min-h-[44px] bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition disabled:opacity-50">Pakai</button>
                            </div>
                            <div className='flex justify-between items-center'>
                                <p className="text-xs text-red-500">
                                    Logo akan diubah menjadi *grayscale* (hitam putih).
                                </p>
                                {currentSpbu.logoBase64 && (
                                    <button onClick={handleClearLogo} className="text-xs text-red-600 hover:underline" disabled={isProcessing || isAiGenerating}>Hapus Logo</button>
                                )}
                            </div>
                        </div>

                        {/* Logo Generik */}
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">Logo Generik (bebas pakai)</label>
                            <div className="grid grid-cols-3 gap-2">
                                {GENERIC_LOGOS.map(logo => (
                                    <button key={logo.id} type="button" onClick={() => handleGenericLogo(logo)} disabled={isProcessing || isAiGenerating}
                                        aria-label={`Pilih logo ${logo.label}`}
                                        className="border rounded-lg p-1 bg-white hover:border-indigo-500 hover:shadow transition disabled:opacity-50">
                                        <img src={svgToDataUri(logo.svg)} alt={logo.label} className="w-full h-auto" />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="text-sm block">Template Alamat</label>
                            <select value="" onChange={handleAddressTemplate} disabled={isProcessing || isAiGenerating}
                                className="w-full p-2 border rounded-lg bg-white mb-2 text-sm" aria-label="Template Alamat">
                                <option value="" disabled>Pilih template alamat...</option>
                                {ADDRESS_TEMPLATES.map((t, i) => <option key={t.label} value={i}>{t.label}</option>)}
                            </select>
                            <label className="text-sm block">Alamat (Maksimal 2 Baris)</label>
                            <textarea name="address" rows="3" value={currentSpbu.address} onChange={handleSpbuChange}
                                className="w-full p-2 border rounded-lg" disabled={isProcessing || isAiGenerating}></textarea>
                        </div>
                        
                        <div>
                            <label className="text-sm font-medium text-gray-700 block mb-1">Lebar Nota (px) - Default: 275</label>
                            <input type="number" name="receiptWidth" value={currentSpbu.receiptWidth || ''} onChange={handleSpbuChange}
                                className="w-full p-2 border rounded-lg bg-white" min="150" max="300" disabled={isProcessing || isAiGenerating} />
                        </div>

                        {/* Jenis & Harga BBM (tersimpan di template, tampil di dropdown Harga BBM) */}
                        <div id="pengaturan-bbm">
                            <p className="text-sm font-medium text-gray-700 mb-1">Jenis &amp; Harga BBM (Rp/liter)</p>
                            <div className="space-y-2">
                                {fuels.map((f, i) => (
                                    <div key={i} className="flex gap-2">
                                        <input type="text" value={f.name} onChange={(e) => updateFuel(i, 'name', e.target.value)}
                                            placeholder="Nama BBM" aria-label={`Nama BBM ${i + 1}`}
                                            className="flex-1 min-w-0 p-2 border rounded-lg bg-white" disabled={isProcessing || isAiGenerating} />
                                        <input type="text" inputMode="numeric" value={f.price ? formatRupiah(f.price) : ''} onChange={(e) => updateFuel(i, 'price', e.target.value)}
                                            placeholder="Harga" aria-label={`Harga ${f.name || `BBM ${i + 1}`}`}
                                            className="w-28 p-2 border rounded-lg bg-white text-right" disabled={isProcessing || isAiGenerating} />
                                        <button type="button" onClick={() => removeFuel(i)} disabled={fuels.length === 1 || isProcessing || isAiGenerating}
                                            aria-label={`Hapus ${f.name || `BBM ${i + 1}`}`} title="Hapus"
                                            className="px-3 min-h-[44px] bg-red-100 text-red-700 rounded-lg font-bold hover:bg-red-200 transition disabled:opacity-40">&times;</button>
                                    </div>
                                ))}
                            </div>
                            <button type="button" onClick={addFuel} disabled={isProcessing || isAiGenerating}
                                className="mt-2 w-full p-2 min-h-[44px] border-2 border-dashed border-indigo-300 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-50 transition disabled:opacity-50">+ Tambah Jenis BBM</button>
                            <p className="text-xs text-gray-500 mt-1">Klik Simpan Template agar perubahan muncul di dropdown Harga BBM.</p>
                        </div>

                        <div className="flex space-x-2 pt-2">
                            <button onClick={handleSaveSpbu} disabled={isProcessing || isAiGenerating}
                                className={`flex-grow p-3 rounded-lg font-bold transition ${isProcessing ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'} text-white`}>
                                {isProcessing ? (
                                    <span className="flex items-center justify-center"><div className="spinner mr-2"></div> Menyimpan...</span>
                                ) : 'Simpan Template'}
                            </button>
                            <button onClick={() => setUiState('view')} disabled={isProcessing || isAiGenerating}
                                className="bg-gray-400 text-white p-3 rounded-lg hover:bg-gray-500 transition font-bold">Batal</button>
                            {uiState === 'edit' && (
                                <button onClick={handleDeleteSpbu} disabled={isProcessing || isAiGenerating}
                                    className={`bg-red-500 text-white p-3 rounded-lg transition-colors font-bold flex items-center ${isProcessing ? 'opacity-50' : 'hover:bg-red-600'}`}>{isProcessing && <div className="spinner mr-2"></div>}Hapus</button>
                            )}
                        </div>
                    </div>
                )}
                
                {/* --- Bagian Data Transaksi (Conditional) --- */}
                {uiState === 'view' && (
                    <>
                        <div className="mb-6 p-4 bg-white rounded-xl shadow-lg">
                            <h2 className="text-xl font-bold mb-3 text-indigo-700">2. Data Transaksi</h2>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-700 block mb-1">Harga BBM</label>
                                    <div className="flex gap-1">
                                        <select value="" onChange={handlePriceTemplate} disabled={isProcessing || isAiGenerating}
                                            className="flex-1 min-w-0 p-2 border rounded-lg bg-white text-sm" aria-label="Pilih jenis BBM">
                                            <option value="" disabled>Pilih BBM...</option>
                                            {fuels.map((f, i) => <option key={`${f.name}-${i}`} value={i}>{f.name} - {formatRupiah(f.price)}</option>)}
                                        </select>
                                        <button type="button" onClick={() => setUiState('edit')} disabled={!selectedSpbuId || isProcessing || isAiGenerating}
                                            aria-label="Atur jenis dan harga BBM" title={selectedSpbuId ? 'Atur jenis & harga BBM' : 'Buat template SPBU dulu'}
                                            className="px-3 bg-yellow-500 text-white rounded-lg text-sm font-bold hover:bg-yellow-600 transition min-h-[44px] disabled:opacity-50">Atur</button>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-700 block mb-1">Template Plat</label>
                                    <div className="flex gap-1">
                                        <select value="" onChange={(e) => handlePlateTemplate(e.target.value)} disabled={isProcessing || isAiGenerating}
                                            className="flex-1 min-w-0 p-2 border rounded-lg bg-white text-sm" aria-label="Template Plat Wilayah">
                                            <option value="" disabled>Wilayah...</option>
                                            {PLATE_REGIONS.map(r => <option key={r.code} value={r.code}>{r.code} - {r.area}</option>)}
                                        </select>
                                        <button type="button" onClick={() => handlePlateTemplate()} disabled={isProcessing || isAiGenerating}
                                            aria-label="Plat acak" title="Plat acak"
                                            className="px-3 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition active:scale-95 min-h-[44px]">Acak</button>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3" id="transaction-inputs">
                                <TransactionInput 
                                    label="Shift" name="shift" value={transactionData.shift} inputType="tel" 
                                    onChange={handleTransactionChange} isProcessing={isProcessing} isAiGenerating={isAiGenerating} 
                                />
                                <TransactionInput 
                                    label="No.Trans" name="noTrans" value={transactionData.noTrans} inputType="text" showRandomButton={true}
                                    onChange={handleTransactionChange} generateRandomId={generateRandomTransId} isProcessing={isProcessing} isAiGenerating={isAiGenerating}
                                />
                                <TransactionInput 
                                    label="Tanggal" name="date" value={transactionData.date} inputType="text" showSyncButton={true} 
                                    onChange={handleTransactionChange} updateDateTime={updateDateTime} isProcessing={isProcessing} isAiGenerating={isAiGenerating}
                                />
                                <TransactionInput 
                                    label="Jam" name="time" value={transactionData.time} inputType="text" showSyncButton={true} 
                                    onChange={handleTransactionChange} updateDateTime={updateDateTime} isProcessing={isProcessing} isAiGenerating={isAiGenerating}
                                />
                                <TransactionInput 
                                    label="Pulau/Pompa" name="islandPump" value={transactionData.islandPump} 
                                    onChange={handleTransactionChange} isProcessing={isProcessing} isAiGenerating={isAiGenerating}
                                />
                                <TransactionInput 
                                    label="Produk" name="productName" value={transactionData.productName} 
                                    onChange={handleTransactionChange} isProcessing={isProcessing} isAiGenerating={isAiGenerating}
                                />
                                <TransactionInput 
                                    label="Harga/L" name="pricePerLiter" value={transactionData.pricePerLiter} inputType="tel" 
                                    onChange={handleTransactionChange} isProcessing={isProcessing} isAiGenerating={isAiGenerating}
                                />
                                <TransactionInput 
                                    label="Volume (L)" name="volume" value={isVolumeCalculated ? calculatedVolume.toFixed(2) : transactionData.volume} inputType="tel" disabled={isVolumeCalculated} 
                                    onChange={handleTransactionChange} isProcessing={isProcessing} isAiGenerating={isAiGenerating}
                                />
                                <TransactionInput 
                                    label="Operator" name="operator" value={transactionData.operator} 
                                    onChange={handleTransactionChange} isProcessing={isProcessing} isAiGenerating={isAiGenerating}
                                />
                                <TransactionInput 
                                    label="Nopol" name="nopol" value={transactionData.nopol} 
                                    onChange={handleTransactionChange} isProcessing={isProcessing} isAiGenerating={isAiGenerating}
                                />
                                <div className="col-span-2">
                                    <TransactionInput 
                                        label="Nominal Beli (Rp)" name="cashAmount" value={transactionData.cashAmount} inputType="tel" 
                                        onChange={handleTransactionChange} isProcessing={isProcessing} isAiGenerating={isAiGenerating}
                                    />
                                </div>
                            </div>
                            <div id="total-display" className="mt-4 p-2 bg-indigo-100 text-indigo-800 font-bold rounded text-center">
                                TOTAL: Rp. {formatRupiah(finalPrice)}
                            </div>
                            <p id="calc-info" className="text-xs text-gray-600 mt-2 text-center">
                                {isVolumeCalculated 
                                    ? 'Volume dihitung dari Nominal Beli.' 
                                    : 'Nominal Beli dihitung dari Volume.'}
                            </p>
                        </div>

                        {/* Bagian Preview & Aksi */}
                        <div className="mb-6 p-4 bg-white rounded-xl shadow-2xl border-t-4 border-indigo-600">
                            <h2 className="text-xl font-bold mb-3 text-indigo-700">3. Preview & Aksi</h2>
                            <div className="hidden lg:block"><div className="mb-3"><TextSizeSlider value={skala} onChange={pilihSkala} effective={k} /></div></div>
                            <div className="hidden lg:block">
                            <label htmlFor="gaya-nota"className="block text-sm font-semibold text-gray-700 mb-1">Gaya Nota</label>
                            <select id="gaya-nota" aria-label="Gaya nota" value={gaya.id} onChange={(e) => pilihGayaNota(e.target.value)}
                                className="w-full p-2 border rounded-lg bg-white mb-4">
                                {GAYA_NOTA.map((g, i) => (
                                    <option key={g.id} value={g.id}>{i + 1}. {g.name} — {g.desc}</option>
                                ))}
                            </select>
                            </div>
                            <div className="bg-gray-100 border border-dashed p-4">
                                <FitPreview>{ReceiptPreviewComponent()}</FitPreview>
                            </div>
                            {/* Ponsel: ukuran teks & pilihan di paling bawah, dekat tombol unduh */}
                            <div className="lg:hidden mt-6 rounded-2xl bg-white p-4 shadow space-y-3">
                              <TextSizeSlider value={skala} onChange={pilihSkala} effective={k} />
                              <label htmlFor="gaya-nota-hp"className="block text-sm font-semibold text-gray-700 mb-1">Gaya Nota</label>
                              <select id="gaya-nota-hp" aria-label="Gaya nota" value={gaya.id} onChange={(e) => pilihGayaNota(e.target.value)}
                                  className="w-full p-2 border rounded-lg bg-white mb-4">
                                  {GAYA_NOTA.map((g, i) => (
                                      <option key={g.id} value={g.id}>{i + 1}. {g.name} — {g.desc}</option>
                                  ))}
                              </select>
                            </div>

                            <div className="flex space-x-3 mt-4">
                                <button onClick={handleExportImage} disabled={!isLibReady || isProcessing || isAiGenerating}
                                    className={`flex-1 p-3 rounded-xl font-bold flex justify-center items-center space-x-1 transition ${!isLibReady || isProcessing || isAiGenerating ? 'bg-green-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} text-white`}>
                                    {isProcessing || !isLibReady ? <div className="spinner mr-2"></div> : 
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
                                    <span>Export PNG</span>
                                </button>
                                <button onClick={handlePrintReceipt} disabled={!isLibReady || isProcessing || isAiGenerating}
                                    className={`flex-1 p-3 rounded-xl font-bold flex justify-center items-center space-x-1 transition ${!isLibReady || isProcessing || isAiGenerating ? 'bg-indigo-300 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} text-white`}>
                                    {isProcessing || !isLibReady ? <div className="spinner mr-2"></div> : 
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m0 0h6m-6 0v2a2 2 0 002 2h2a2 2 0 002-2v-2" /></svg>}
                                    <span>Cetak 58mm</span>
                                </button>
                            </div>
                            
                            {/* BAGIAN BARU: Petunjuk Cetak */}
                            <div className="mt-6 pt-4 border-t border-gray-200 text-sm space-y-2 text-gray-700">
                                <p className="font-extrabold text-lg text-indigo-700">*** SARAN CETAK YANG BAIK ***</p>
                                <p>1. Ekspor nota menggunakan tombol **Export PNG** di atas.</p>
                                <p>2. Unduh Aplikasi **RawBT** atau Aplikasi Sejenis (Cari di Youtube: *Cara Cetak Gambar di Printer Thermal 58mm Bluetooth / Kabel*).</p>
                                
                                <p className="font-extrabold text-red-600 mt-4">***** CATATAN PENTING *****</p>
                                <p className="text-base font-semibold">
                                    Atur Ukuran **Lebar Nota (px)** pada Template SPBU (Bagian 1) dan otak-atik sendiri karena setiap HP Beda Settingan LEBAR NOTA-nya.
                                </p>
                            </div>
                            {/* AKHIR BAGIAN BARU */}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default App;
