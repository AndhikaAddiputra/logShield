import { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, Utensils, Shirt, Tent, ChevronRight, Activity, Loader2, Users, Edit3, Check, X, ShoppingCart, AlertTriangle } from 'lucide-react';
import { API_BASE_URL, getAuthHeaders } from '../lib/api';
import { cacheValue, getCachedValue, isOfflineMode, noteNetworkFailure, noteNetworkSuccess, sendJsonWithOfflineFallback } from '../lib/offlineOutbox';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useSyncStore } from '../store/syncStore';

const RISK_STYLES: Record<string, string> = {
  kritis: 'bg-red-100 text-red-700',
  waspada: 'bg-yellow-100 text-yellow-700',
  aman: 'bg-green-100 text-green-700',
};

export default function DashboardPage() {
  const online = useOnlineStatus();
  const { pendingOutbox, failedOutbox } = useSyncStore();
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aiData, setAiData] = useState<any>({ pangan: [], sandang: [], papan: [], lainnya: [] });

  const [userPoskoId, setUserPoskoId] = useState<string | null>(null);
  const [poskoData, setPoskoData] = useState<any>(null);
  const [editingDemografi, setEditingDemografi] = useState(false);
  const [demografiForm, setDemografiForm] = useState({ pria: 0, wanita: 0, lansia: 0, balita: 0, disabilitas: 0 });
  const [savingDemografi, setSavingDemografi] = useState(false);
  const [demografiMessage, setDemografiMessage] = useState<string | null>(null);

  const inferenceAttemptedRef = useRef(false);

  const [requestingItem, setRequestingItem] = useState<any | null>(null);
  const [reqQty, setReqQty] = useState(0);
  const [reqPriority, setReqPriority] = useState<'normal' | 'high'>('normal');
  const [reqLoading, setReqLoading] = useState(false);

  const [showAnomalyForm, setShowAnomalyForm] = useState(false);
  const [aCommodity, setACommodity] = useState('');
  const [aSeverity, setASeverity] = useState('medium');
  const [aDescription, setADescription] = useState('');
  const [aLocation, setALocation] = useState('');
  const [aLoading, setALoading] = useState(false);
  const [aDone, setADone] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('logshield_user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setUserPoskoId(user.posko_id || null);
      } catch {}
    }
  }, []);

  useEffect(() => {
    inferenceAttemptedRef.current = false;
  }, [userPoskoId]);

  const applyPoskoSnapshot = useCallback((doc: any) => {
    setPoskoData(doc);
    setDemografiForm({
      pria: doc.count_pria || 0,
      wanita: doc.count_perempuan || 0,
      lansia: doc.count_lansia || 0,
      balita: doc.count_balita || 0,
      disabilitas: doc.count_disabilitas || 0,
    });
  }, []);

  const fetchPosko = useCallback(async () => {
    if (!userPoskoId) return;
    try {
      if (!online || isOfflineMode()) {
        const cached = await getCachedValue<any>(`posko:${userPoskoId}`);
        if (cached) applyPoskoSnapshot(cached);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/poskos`, { headers: getAuthHeaders() });
      if (!res.ok) return;
      noteNetworkSuccess();
      const data = await res.json();
      const rows = data.rows || [];
      const found = rows.find((r: any) => {
        const doc = r.doc || r;
        return doc._id === userPoskoId || doc._id === `posko::${userPoskoId}`;
      });
      if (found) {
        const doc = found.doc || found;
        await cacheValue(`posko:${userPoskoId}`, doc);
        applyPoskoSnapshot(doc);
      }
    } catch {
      noteNetworkFailure();
      const cached = await getCachedValue<any>(`posko:${userPoskoId}`);
      if (cached) applyPoskoSnapshot(cached);
    }
  }, [applyPoskoSnapshot, online, userPoskoId]);

  useEffect(() => {
    if (!userPoskoId) return;
    fetchPosko();
  }, [fetchPosko, userPoskoId, online, pendingOutbox]);

  useEffect(() => {
    const handleCacheUpdate = (event: Event) => {
      const poskoId = (event as CustomEvent<{ poskoId?: string }>).detail?.poskoId;
      if (!poskoId || poskoId !== userPoskoId) return;
      void fetchPosko();
    };
    window.addEventListener("logshield-posko-cache-updated", handleCacheUpdate);
    return () => window.removeEventListener("logshield-posko-cache-updated", handleCacheUpdate);
  }, [fetchPosko, userPoskoId]);

  const fetchAI = async () => {
    try {
      const normalizedPoskoId = userPoskoId
        ? (userPoskoId.startsWith('posko::') ? userPoskoId : `posko::${userPoskoId}`)
        : '';
      const rawPoskoId = normalizedPoskoId.replace(/^posko::/, '');
      const params = new URLSearchParams({ limit: '200' });
      if (normalizedPoskoId) params.set('posko_id', normalizedPoskoId);
      if (!online || isOfflineMode()) {
        const cached = await getCachedValue<any>(`ai-top-critical:${normalizedPoskoId}`);
        setAiData(cached || { pangan: [], sandang: [], papan: [], lainnya: [] });
        setIsLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE_URL}/api/ai/recommendations/top-critical?${params.toString()}`, {
        headers: getAuthHeaders()
      });
      if (!res.ok) throw new Error("Gagal mengambil data AI");
      noteNetworkSuccess();
      const data = await res.json();
      const rawItems = data.rows || data || [];
      if (!normalizedPoskoId) {
        setAiData({ pangan: [], sandang: [], papan: [], lainnya: [] });
        return;
      }
      const items = Array.isArray(rawItems)
        ? rawItems.filter((item: any) => {
            const poskoId = String(item?.posko_id || "");
            return poskoId === normalizedPoskoId || poskoId === rawPoskoId;
          })
        : [];
      const MIN_POSKO_ITEMS = 10;
      if (items.length < MIN_POSKO_ITEMS && !inferenceAttemptedRef.current) {
        inferenceAttemptedRef.current = true;
        await fetch(`${API_BASE_URL}/api/ai/infer/posko/${encodeURIComponent(normalizedPoskoId)}`, {
          method: 'POST',
          headers: getAuthHeaders(),
        });
        return await fetchAI();
      }

      const grouped: any = { pangan: [], sandang: [], papan: [], lainnya: [] };
      items.forEach((item: any) => {
        const name = (item.item_name || '').toLowerCase();
        const cat = (item.item_category || '').toLowerCase();
        if (cat === 'pangan') {
          grouped.pangan.push(item);
        } else if (cat === 'papan') {
          grouped.papan.push(item);
        } else if (cat === 'sandang') {
          grouped.sandang.push(item);
        } else if (cat === 'lainnya') {
          grouped.lainnya.push(item);
        } else if (name.includes('beras') || name.includes('air') || name.includes('makanan') || item.unit === 'kg' || item.unit === 'liter') {
          grouped.pangan.push(item);
        } else if (name.includes('tenda') || name.includes('matras') || name.includes('shelter')) {
          grouped.papan.push(item);
        } else if (name.includes('selimut') || name.includes('pakaian') || name.includes('baju') || name.includes('hygiene') || name.includes('masker') || name.includes('obat') || name.includes('pembalut')) {
          grouped.sandang.push(item);
        } else {
          grouped.lainnya.push(item);
        }
      });
      await cacheValue(`ai-top-critical:${normalizedPoskoId}`, grouped);
      setAiData(grouped);
    } catch (err) {
      noteNetworkFailure();
      const normalizedPoskoId = userPoskoId
        ? (userPoskoId.startsWith('posko::') ? userPoskoId : `posko::${userPoskoId}`)
        : '';
      const cached = await getCachedValue<any>(`ai-top-critical:${normalizedPoskoId}`);
      setAiData(cached || { pangan: [], sandang: [], papan: [], lainnya: [] });
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userPoskoId) {
      fetchAI();
    }
  }, [userPoskoId, online]);

  const handleSaveDemografi = async () => {
    if (!userPoskoId) return;
    setSavingDemografi(true);
    setDemografiMessage(null);
    try {
      const total = demografiForm.pria + demografiForm.wanita + demografiForm.lansia + demografiForm.balita + demografiForm.disabilitas;
      const optimisticPosko = {
        ...(poskoData || {}),
        count_pria: demografiForm.pria,
        count_perempuan: demografiForm.wanita,
        count_lansia: demografiForm.lansia,
        count_balita: demografiForm.balita,
        count_disabilitas: demografiForm.disabilitas,
        total_pengungsi: total,
        updated_at: new Date().toISOString(),
      };
      await cacheValue(`posko:${userPoskoId}`, optimisticPosko);
      applyPoskoSnapshot(optimisticPosko);

      const result = await sendJsonWithOfflineFallback({
        method: 'PATCH',
        endpoint: `/api/poskos/${encodeURIComponent(userPoskoId)}`,
        payload: {
          count_pria: demografiForm.pria,
          count_perempuan: demografiForm.wanita,
          count_lansia: demografiForm.lansia,
          count_balita: demografiForm.balita,
          count_disabilitas: demografiForm.disabilitas,
          total_pengungsi: total,
        },
      });
      const responsePosko = !result.queued && result.data && typeof result.data === 'object'
        ? (result.data as { posko?: any }).posko
        : null;
      const updatedPosko = responsePosko || {
        ...optimisticPosko,
        count_pria: demografiForm.pria,
        count_perempuan: demografiForm.wanita,
        count_lansia: demografiForm.lansia,
        count_balita: demografiForm.balita,
        count_disabilitas: demografiForm.disabilitas,
        total_pengungsi: total,
        updated_at: result.mutation.payload.client_updated_at,
      };
      await cacheValue(`posko:${userPoskoId}`, updatedPosko);
      applyPoskoSnapshot(updatedPosko);
      setEditingDemografi(false);
      setDemografiMessage(result.queued ? 'Data pengungsi disimpan offline.' : 'Data pengungsi tersimpan.');
      setTimeout(() => setDemografiMessage(null), 3000);
      if (!result.queued) fetchAI();
    } catch (err: any) {
      setDemografiMessage(err.message || 'Gagal menyimpan');
    } finally {
      setSavingDemografi(false);
    }
  };

  const handleQuickRequest = async () => {
    if (!requestingItem || !userPoskoId || reqQty <= 0) return;
    setReqLoading(true);
    try {
      const payload = {
          posko_id: userPoskoId,
          commodity: requestingItem.item_name,
          quantity: reqQty,
          unit: requestingItem.unit || 'unit',
          priority: reqPriority,
          note: `Permintaan cepat dari rekomendasi AI: ${requestingItem.item_name}`,
      };
      const result = await sendJsonWithOfflineFallback({
        method: 'POST',
        endpoint: '/api/ai/quick-request',
        payload,
        localRequest: {
          posko_id: userPoskoId,
          items: [{
            commodity: payload.commodity,
            quantity: payload.quantity,
            unit: payload.unit,
            note: payload.note,
          }],
        },
      });
      setRequestingItem(null);
      alert(result.queued ? 'Permintaan disimpan offline. Akan disinkronkan saat online.' : 'Permintaan berhasil dikirim!');
      if (!result.queued) fetchAI();
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setReqLoading(false);
    }
  };

  const handleAnomalySubmit = async () => {
    if (!userPoskoId || !aCommodity.trim()) return;
    setALoading(true);
    try {
      const result = await sendJsonWithOfflineFallback({
        method: 'POST',
        endpoint: '/api/anomalies',
        payload: {
          posko_id: userPoskoId,
          commodity: aCommodity.trim(),
          severity: aSeverity,
          description: aDescription.trim(),
          location: aLocation.trim(),
        },
      });
      setACommodity('');
      setASeverity('medium');
      setADescription('');
      setALocation('');
      setShowAnomalyForm(false);
      setADone(true);
      setTimeout(() => setADone(false), 3000);
      if (result.queued) {
        alert('Laporan disimpan offline. Akan disinkronkan saat online.');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
    } finally {
      setALoading(false);
    }
  };

  const riskBadge = (risk: string, inferenceMode: string) => (
    <div className="flex items-center gap-1">
      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${RISK_STYLES[risk] || 'bg-blue-100 text-blue-700'}`}>
        {risk}
      </span>
      {inferenceMode === 'cold_start' && (
        <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded">Estimasi</span>
      )}
    </div>
  );

  if (selectedSector) {
      const meta = {
        pangan: { title: 'Pangan & Air', icon: <Utensils className="w-5 h-5 text-orange-500" />, colorClass: 'text-orange-600', bgClass: 'bg-orange-50', borderClass: 'border-orange-100' },
        sandang: { title: 'Sandang & Sanitasi', icon: <Shirt className="w-5 h-5 text-blue-500" />, colorClass: 'text-blue-600', bgClass: 'bg-blue-50', borderClass: 'border-blue-100' },
        papan: { title: 'Papan & Shelter', icon: <Tent className="w-5 h-5 text-teal-500" />, colorClass: 'text-teal-600', bgClass: 'bg-teal-50', borderClass: 'border-teal-100' },
        lainnya: { title: 'Logistik Lainnya', icon: <Activity className="w-5 h-5 text-purple-500" />, colorClass: 'text-purple-600', bgClass: 'bg-purple-50', borderClass: 'border-purple-100' },
      }[selectedSector]!;
    const items = aiData[selectedSector];

    return (
      <div className="flex flex-col w-full bg-gray-50 min-h-screen">
        <div className="bg-white p-4 border-b flex items-center gap-3 sticky top-0 z-10 shadow-sm">
          <button onClick={() => setSelectedSector(null)} className="p-1 hover:bg-gray-100 rounded-lg">
            <ChevronRight className="w-6 h-6 text-blue-900 rotate-180" />
          </button>
          <div className="flex items-center gap-2">{meta.icon}<h2 className="text-xl font-black text-blue-900 uppercase tracking-tight">{meta.title}</h2></div>
        </div>
        <div className="p-5 space-y-4">
          {items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8 bg-gray-100 rounded-lg">Aman. Tidak ada rekomendasi kritis.</p>
          ) : (
            <div className="space-y-3">
              {items.map((m: any, idx: number) => {
                const chips: string[] = (m.rationale_chips || []).slice(0, 3);
                return (
                  <div key={idx} className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-bold text-gray-800 text-sm capitalize block">{m.item_name}</span>
                        <span className="text-[10px] text-gray-400">{m.posko_name || m.posko_id}</span>
                      </div>
                      {riskBadge(m.risk_level || 'unknown', m.inference_mode || '')}
                    </div>
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-50 text-center">
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold">KEBUTUHAN</p>
                        <p className="text-xs font-black text-purple-700">{Number(m.forecast_qty || 0).toFixed(0)} <span className="text-[10px]">{m.unit}</span>{['konsumsi_harian', 'konsumsi_berkala'].includes(m.commodity_class) ? '/hari' : ''}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold">REKOMENDASI</p>
                        <p className="text-xs font-black text-blue-900">{Number(m.recommended_qty || 0).toFixed(0)} <span className="text-[10px]">{m.unit}</span></p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold">STOK PUSAT</p>
                        <p className="text-xs font-black text-gray-600">{Number(m.current_stock_qty || 0).toFixed(0)} <span className="text-[10px]">{m.unit}</span></p>
                      </div>
                    </div>
                      <div className="flex gap-3 mt-2 text-[10px] text-gray-500">
                        <span>Prioritas: <strong>{Number(m.priority_score || 0).toFixed(1)}</strong></span>
                        <span>Trust: <strong>{Number(m.trust_score || 0).toFixed(2)}</strong></span>
                        {m.trend_direction === 'rising' && <span className="text-red-500 font-bold">↑ Naik</span>}
                        {m.trend_direction === 'falling' && <span className="text-green-500 font-bold">↓ Turun</span>}
                      </div>
                      {chips.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {chips.map((chip: string, ci: number) => (
                          <span key={ci} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{chip}</span>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => { setRequestingItem(m); setReqQty(Number(m.recommended_qty || m.forecast_qty || 0) || 1); setReqPriority('normal'); }}
                      className="mt-3 w-full flex items-center justify-center gap-1.5 bg-blue-700 text-white text-xs font-bold py-2.5 rounded-lg"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      Minta {Number(m.recommended_qty || m.forecast_qty || 0).toFixed(0)} {m.unit}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      {requestingItem && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
          <div className="bg-white w-full rounded-t-2xl p-5 pb-8 space-y-4">
            <h3 className="font-black text-blue-900 text-base">Request {requestingItem.item_name}</h3>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Jumlah</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setReqQty(Math.max(1, reqQty - 1))} className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-600">-</button>
                <input type="number" min="1" value={reqQty}
                  onChange={(e) => setReqQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-center text-lg font-black text-blue-900"
                />
                <button onClick={() => setReqQty(reqQty + 1)} className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-600">+</button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Satuan: {requestingItem.unit}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Prioritas</label>
              <div className="flex gap-2">
                <button onClick={() => setReqPriority('normal')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold ${reqPriority === 'normal' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600'}`}
                >Normal</button>
                <button onClick={() => setReqPriority('high')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold ${reqPriority === 'high' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >Mendesak</button>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setRequestingItem(null)} disabled={reqLoading}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600"
              >Batal</button>
              <button onClick={handleQuickRequest} disabled={reqLoading || reqQty <= 0}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-blue-700 text-white flex items-center justify-center gap-1.5"
              >
                {reqLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                Kirim Permintaan
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    );
  }

  const totalPengungsi = (poskoData?.count_pria || 0) + (poskoData?.count_perempuan || 0) + (poskoData?.count_lansia || 0) + (poskoData?.count_balita || 0) + (poskoData?.count_disabilitas || 0);

  const syncBannerText = failedOutbox > 0
    ? `${failedOutbox} AKSI GAGAL SINKRON`
    : pendingOutbox > 0
      ? `${pendingOutbox} AKSI MENUNGGU SINKRON`
      : online
        ? 'TERHUBUNG · SINKRON'
        : 'OFFLINE · DATA LOKAL';

  return (
    <div className="flex flex-col w-full">
      <div className="bg-green-700 text-white px-4 py-2 flex justify-between items-center text-xs font-bold tracking-wide">
        <div className="flex items-center gap-2"><RefreshCw className="w-4 h-4" /><span>{syncBannerText}</span></div>
        <div className="w-2 h-2 bg-white rounded-full" />
      </div>

      <div className="p-5 space-y-6">
        <h2 className="text-2xl font-black text-blue-900 leading-tight">OPERATIONAL<br/>OVERVIEW</h2>

        {/* Posko & Pengungsi */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="font-black text-gray-800 text-sm uppercase">Data Pengungsi</span>
            </div>
            <button onClick={() => setEditingDemografi(!editingDemografi)} className="text-blue-600 text-xs font-bold flex items-center gap-1">
              {editingDemografi ? <X className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
              {editingDemografi ? 'Batal' : 'Edit'}
            </button>
          </div>
          {editingDemografi ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { key: 'pria', label: 'Pria' },
                  { key: 'wanita', label: 'Wanita' },
                  { key: 'lansia', label: 'Lansia' },
                  { key: 'balita', label: 'Balita' },
                  { key: 'disabilitas', label: 'Disabilitas' },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">{f.label}</label>
                    <input type="number" min="0" value={demografiForm[f.key as keyof typeof demografiForm]}
                      onChange={(e) => setDemografiForm(prev => ({ ...prev, [f.key]: parseInt(e.target.value) || 0 }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-800"
                    />
                  </div>
                ))}
              </div>
              <button onClick={handleSaveDemografi} disabled={savingDemografi}
                className="w-full bg-blue-700 text-white font-bold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2"
              >
                {savingDemografi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Simpan Data Pengungsi
              </button>
              {demografiMessage && (
                <p className={`text-xs font-medium text-center ${demografiMessage.includes('Gagal') ? 'text-red-600' : 'text-green-600'}`}>{demografiMessage}</p>
              )}
            </div>
          ) : (
            <>
              <p className="text-3xl font-black text-blue-900">{totalPengungsi} <span className="text-sm font-bold text-gray-500">Jiwa</span></p>
              <div className="grid grid-cols-5 gap-2 mt-2 text-center">
                {[
                  { label: 'Pria', value: poskoData?.count_pria || 0 },
                  { label: 'Wanita', value: poskoData?.count_perempuan || 0 },
                  { label: 'Lansia', value: poskoData?.count_lansia || 0 },
                  { label: 'Balita', value: poskoData?.count_balita || 0 },
                  { label: 'Disabilitas', value: poskoData?.count_disabilitas || 0 },
                ].map((d) => (
                  <div key={d.label} className="bg-gray-50 rounded-lg py-2">
                    <p className="text-xs font-black text-blue-900">{d.value}</p>
                    <p className="text-[9px] font-bold text-gray-500">{d.label}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* AI Predictions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-black text-base text-gray-800 tracking-tight">PREDIKSI KEBUTUHAN AI</h3>
            <span className="text-[10px] text-gray-400 font-bold bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
              <Activity className="w-3 h-3" /> DETAIL
            </span>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
          ) : (
            <div className="space-y-2">
              {[
                { key: 'pangan', title: 'Pangan & Air', icon: <Utensils className="w-5 h-5 text-orange-500" />, colorClass: 'text-orange-600', bgClass: 'bg-orange-50', borderClass: 'border-orange-100' },
                { key: 'sandang', title: 'Sandang & Sanitasi', icon: <Shirt className="w-5 h-5 text-blue-500" />, colorClass: 'text-blue-600', bgClass: 'bg-blue-50', borderClass: 'border-blue-100' },
                { key: 'papan', title: 'Papan & Shelter', icon: <Tent className="w-5 h-5 text-teal-500" />, colorClass: 'text-teal-600', bgClass: 'bg-teal-50', borderClass: 'border-teal-100' },
                { key: 'lainnya', title: 'Logistik Lainnya', icon: <Activity className="w-5 h-5 text-purple-500" />, colorClass: 'text-purple-600', bgClass: 'bg-purple-50', borderClass: 'border-purple-100' },
              ].map((s) => {
                const count = aiData[s.key]?.length || 0;
                const worstRisk = aiData[s.key]?.reduce((worst: string, item: any) => {
                  if (item.risk_level === 'kritis') return 'kritis';
                  if (item.risk_level === 'waspada' && worst !== 'kritis') return 'waspada';
                  return worst;
                }, 'aman') || 'aman';
                return (
                  <div key={s.key} onClick={() => setSelectedSector(s.key)}
                    className={`bg-white p-3.5 rounded-xl shadow-sm border ${s.borderClass} cursor-pointer flex justify-between items-center`}>
                    <div className="flex gap-3 items-center flex-1 min-w-0">
                      <div className={`${s.bgClass} p-2.5 rounded-xl shrink-0`}>{s.icon}</div>
                      <div className="min-w-0 flex-1">
                        <h4 className={`text-sm font-black uppercase tracking-tight truncate ${s.colorClass}`}>{s.title}</h4>
                        <p className="text-xs text-gray-500 font-medium truncate mt-0.5">
                          {count > 0
                            ? `${count} item ${worstRisk === 'kritis' ? 'kritis' : 'perlu perhatian'}`
                            : 'Stok terpantau aman'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {count > 0 && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${worstRisk === 'kritis' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                          {count}
                        </span>
                      )}
                      <ChevronRight className="w-5 h-5 text-gray-300" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Laporan Anomali */}
        <div>
          <h3 className="font-black text-base text-gray-800 tracking-tight mb-3">LAPORAN INSIDEN/ ANOMALI</h3>
          {aDone && (
            <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-center mb-3">
              <Check className="w-6 h-6 text-green-600 mx-auto mb-1" />
              <p className="text-sm font-bold text-green-700">Laporan terkirim!</p>
            </div>
          )}
          <button onClick={() => { setShowAnomalyForm(true); setADone(false); }}
            className="w-full bg-red-600 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2"
          >
            <AlertTriangle className="w-5 h-5" />
            Lapor!
          </button>
        </div>
      </div>

      {requestingItem && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
          <div className="bg-white w-full rounded-t-2xl p-5 pb-8 space-y-4">
            <h3 className="font-black text-blue-900 text-base">Request {requestingItem.item_name}</h3>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Jumlah</label>
              <div className="flex items-center gap-3">
                <button onClick={() => setReqQty(Math.max(1, reqQty - 1))} className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-600">-</button>
                <input type="number" min="1" value={reqQty}
                  onChange={(e) => setReqQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-center text-lg font-black text-blue-900"
                />
                <button onClick={() => setReqQty(reqQty + 1)} className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center text-lg font-bold text-gray-600">+</button>
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Satuan: {requestingItem.unit}</p>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Prioritas</label>
              <div className="flex gap-2">
                <button onClick={() => setReqPriority('normal')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold ${reqPriority === 'normal' ? 'bg-blue-700 text-white' : 'bg-gray-100 text-gray-600'}`}
                >Normal</button>
                <button onClick={() => setReqPriority('high')}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold ${reqPriority === 'high' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                >Mendesak</button>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setRequestingItem(null)} disabled={reqLoading}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600"
              >Batal</button>
              <button onClick={handleQuickRequest} disabled={reqLoading || reqQty <= 0}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-blue-700 text-white flex items-center justify-center gap-1.5"
              >
                {reqLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                Kirim Permintaan
              </button>
            </div>
          </div>
        </div>
      )}

      {showAnomalyForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center">
          <div className="bg-white w-full rounded-t-2xl p-5 pb-8 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-red-600 text-base">Buat Laporan</h3>
              <button onClick={() => setShowAnomalyForm(false)} className="p-1"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Judul</label>
              <input type="text" value={aCommodity}
                onChange={(e) => setACommodity(e.target.value)}
                placeholder="Contoh: Terjadi gempa lanjutan..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-bold text-gray-800"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-2">Tingkat Keparahan</label>
              <div className="flex gap-2">
                {[
                  { value: 'low', label: 'Rendah', c: 'bg-green-100 text-green-700' },
                  { value: 'medium', label: 'Sedang', c: 'bg-yellow-100 text-yellow-700' },
                  { value: 'high', label: 'Tinggi', c: 'bg-orange-100 text-orange-700' },
                  { value: 'critical', label: 'Kritis', c: 'bg-red-100 text-red-700' },
                ].map((s) => (
                  <button key={s.value} type="button" onClick={() => setASeverity(s.value)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold ${aSeverity === s.value ? s.c + ' ring-2 ring-offset-1' : 'bg-gray-100 text-gray-500'}`}
                  >{s.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Deskripsi</label>
              <textarea value={aDescription}
                onChange={(e) => setADescription(e.target.value)}
                placeholder="Jelaskan insiden yang terjadi..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 resize-none h-24"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Lokasi Spesifik (Opsional)</label>
              <input type="text" value={aLocation}
                onChange={(e) => setALocation(e.target.value)}
                placeholder="Contoh: Posko 3, Rak A-12"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-bold text-gray-800"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAnomalyForm(false)} disabled={aLoading}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-600"
              >Batal</button>
              <button onClick={handleAnomalySubmit} disabled={aLoading || !aCommodity.trim()}
                className="flex-1 py-2.5 rounded-lg text-xs font-bold bg-red-600 text-white flex items-center justify-center gap-1.5"
              >
                {aLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                Kirim Laporan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
