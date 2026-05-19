import { useState, useEffect } from 'react';
import { RefreshCw, Utensils, Shirt, Tent, ChevronLeft, Activity, Loader2 } from 'lucide-react';
import { API_BASE_URL, getAuthHeaders } from '../lib/api';

export default function DashboardPage() {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [aiData, setAiData] = useState<any>({ pangan: [], sandang: [], papan: [] });

  useEffect(() => {
    const fetchAIRecommendations = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/ai/recommendations/top-critical?limit=25`, {
          headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error("Gagal mengambil data AI");
        const data = await res.json();
        
        // Mengelompokkan item berdasarkan unit/nama komoditas untuk UI
        const grouped = { pangan: [] as any[], sandang: [] as any[], papan: [] as any[] };
        
        data.forEach((item: any) => {
          const name = item.item_name.toLowerCase();
          if (name.includes('beras') || name.includes('air') || name.includes('makanan') || item.unit === 'kg' || item.unit === 'liter') {
            grouped.pangan.push(item);
          } else if (name.includes('tenda') || name.includes('matras') || name.includes('shelter')) {
            grouped.papan.push(item);
          } else {
            grouped.sandang.push(item); // Sisanya masuk sandang/lainnya
          }
        });
        
        setAiData(grouped);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAIRecommendations();
  }, []);

  const sektorMeta: Record<string, any> = {
    pangan: { title: 'Pangan & Air', icon: <Utensils className="w-5 h-5 text-orange-500" />, colorClass: 'text-orange-600', bgClass: 'bg-orange-50', borderClass: 'border-orange-100', narasi: 'Model AI mendeteksi anomali konsumsi tinggi pada sektor pangan dan hidrasi.' },
    sandang: { title: 'Sandang & Sanitasi', icon: <Shirt className="w-5 h-5 text-blue-500" />, colorClass: 'text-blue-600', bgClass: 'bg-blue-50', borderClass: 'border-blue-100', narasi: 'Prioritas pemenuhan hygiene kit dan perlindungan suhu untuk kelompok rentan.' },
    papan: { title: 'Papan & Shelter', icon: <Tent className="w-5 h-5 text-teal-500" />, colorClass: 'text-teal-600', bgClass: 'bg-teal-50', borderClass: 'border-teal-100', narasi: 'Indikasi rasio overload terdeteksi pada area penampungan utama.' }
  };

  if (selectedSector) {
    const meta = sektorMeta[selectedSector];
    const items = aiData[selectedSector];

    return (
      <div className="flex flex-col w-full bg-gray-50 min-h-screen">
        <div className="bg-white p-4 border-b flex items-center gap-3 sticky top-0 z-10 shadow-sm">
          <button onClick={() => setSelectedSector(null)} className="p-1 hover:bg-gray-100 rounded-lg">
            <ChevronLeft className="w-6 h-6 text-blue-900" />
          </button>
          <div className="flex items-center gap-2">
             {meta.icon}
            <h2 className="text-xl font-black text-blue-900 uppercase tracking-tight">{meta.title}</h2>
          </div>
        </div>

        <div className="p-5 space-y-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
             <p className="text-gray-700 text-sm font-medium">{meta.narasi}</p>
          </div>

          <h3 className="text-xs font-bold text-gray-500 tracking-wider mt-4 mb-2 uppercase">Rekomendasi Model AI</h3>
          
          {items.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4 bg-gray-100 rounded-lg">Aman. Tidak ada rekomendasi kritis.</p>
          ) : (
            <div className="space-y-3">
              {items.map((m: any, idx: number) => (
                <div key={idx} className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-gray-800 text-sm capitalize">{m.item_name}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${m.risk_level === 'High' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                      {m.risk_level} Risk
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-50 text-center">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold">REKOMENDASI</p>
                      <p className="text-xs font-black text-blue-900">{m.recommended_qty} <span className="text-[10px]">{m.unit}</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold">DEFISIT</p>
                      <p className="text-xs font-black text-red-600">{m.shortage_qty} <span className="text-[10px]">{m.unit}</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold">SISA COV</p>
                      <p className="text-xs font-black text-gray-600">{m.coverage_days} Hari</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full">
      <div className="bg-green-700 text-white px-4 py-2 flex justify-between items-center text-xs font-bold tracking-wide">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" /><span>STATUS OFFLINE: SINKRON</span>
        </div>
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
      </div>

      <div className="p-5">
        <h2 className="text-2xl font-black text-blue-900 leading-tight mb-1">OPERATIONAL<br/>OVERVIEW</h2>
        <div className="flex items-center justify-between mt-6 mb-4">
          <h3 className="font-black text-lg text-gray-800 tracking-tight">PREDIKSI KEBUTUHAN AI</h3>
          <span className="text-[10px] text-gray-400 font-bold bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
            <Activity className="w-3 h-3" /> KLIK DETAIL
          </span>
        </div>

        {isLoading ? (
           <div className="flex justify-center p-10"><Loader2 className="w-8 h-8 animate-spin text-blue-500" /></div>
        ) : (
          <div className="space-y-3">
            {Object.keys(sektorMeta).map((key) => {
              const meta = sektorMeta[key];
              const alertCount = aiData[key].length;
              return (
                <div key={key} onClick={() => setSelectedSector(key)} className={`bg-white p-4 rounded-xl shadow-sm border ${meta.borderClass} cursor-pointer flex justify-between items-center`}>
                  <div className="flex gap-4 items-center flex-1 pr-2 min-w-0">
                    <div className={`${meta.bgClass} p-3 rounded-xl flex-shrink-0`}>{meta.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className={`text-sm font-black uppercase tracking-tight truncate ${meta.colorClass}`}>{meta.title}</h4>
                      <p className="text-xs text-gray-500 font-medium truncate mt-0.5">
                        {alertCount > 0 ? `${alertCount} item butuh perhatian mendesak.` : 'Stok logistik terpantau aman.'}
                      </p>
                    </div>
                  </div>
                  <ChevronLeft className="w-5 h-5 text-gray-300 rotate-180 flex-shrink-0" />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}