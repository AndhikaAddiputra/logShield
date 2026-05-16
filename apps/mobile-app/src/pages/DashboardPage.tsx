import React, { useState } from 'react';
import { RefreshCw, Utensils, Shirt, Tent, ChevronLeft, Calendar } from 'lucide-react';

interface DetailSektor {
  title: string;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  ringkasan: string;
  narasiLengkap: string;
  metrik: {
    item: string;
    rekomendasi: string;
    kekurangan: string;
    durasiAman: string;
    prioritas: string;
  }[];
}

export default function DashboardPage() {
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  const dataPrediksi: Record<string, DetailSektor> = {
    pangan: {
      title: 'Pangan & Air',
      icon: <Utensils className="w-5 h-5 text-orange-500" />,
      colorClass: 'text-orange-600',
      bgClass: 'bg-orange-50',
      borderClass: 'border-orange-100',
      ringkasan: 'Stok lokal kritis dalam 18 jam. Estimasi kebutuhan mencakup 2.532 porsi.',
      narasiLengkap: 'Berdasarkan model demografi aktif di Posko Evakuasi Rajeg Timur, laju konsumsi logistik pangan meningkat tajam. Estimasi kebutuhan mendesak untuk 72 jam ke depan mencapai 2.532 porsi ransum makanan dan 1.688 liter air bersih. Jika pengiriman dari gudang pusat tidak tiba dalam 18 jam, posko akan mengalami defisit total.',
      metrik: [
        { item: 'Ransum Makanan', rekomendasi: '2.532 Porsi', kekurangan: '1.200 Porsi', durasiAman: '0.8 Hari', prioritas: 'Kritis' },
        { item: 'Air Bersih', rekomendasi: '1.688 Liter', kekurangan: '688 Liter', durasiAman: '1.1 Hari', prioritas: 'Tinggi' }
      ]
    },
    sandang: {
      title: 'Sandang & Sanitasi',
      icon: <Shirt className="w-5 h-5 text-blue-500" />,
      colorClass: 'text-blue-600',
      bgClass: 'bg-blue-50',
      borderClass: 'border-blue-100',
      ringkasan: 'Prioritas pengadaan 120 paket selimut untuk lansia dan balita.',
      narasiLengkap: 'Kondisi cuaca malam hari di lokasi pengungsian memicu risiko penurunan imunitas kelompok rentan. Model merekomendasikan pengadaan segera 120 paket selimut hangat dan pakaian layak pakai yang diprioritaskan bagi lansia dan balita. Selain itu, diperlukan penambahan 80 hygiene kit guna menjaga standardisasi sanitasi minimum.',
      metrik: [
        { item: 'Paket Selimut', rekomendasi: '120 Paket', kekurangan: '90 Paket', durasiAman: '2.0 Hari', prioritas: 'Tinggi' },
        { item: 'Hygiene Kit', rekomendasi: '80 Karton', kekurangan: '30 Karton', durasiAman: '1.5 Hari', prioritas: 'Normal' }
      ]
    },
    papan: {
      title: 'Papan & Shelter',
      icon: <Tent className="w-5 h-5 text-teal-500" />,
      colorClass: 'text-teal-600',
      bgClass: 'bg-teal-50',
      borderClass: 'border-teal-100',
      ringkasan: 'Kapasitas tenda komunal overload 15%. Butuh 3 unit tenda peleton.',
      narasiLengkap: 'Rasio kepadatan hunian di dalam tenda darurat saat ini mendeteksi adanya overload sebesar 15% dari kapasitas ideal. Guna menekan laju potensi penularan penyakit dan menjaga kenyamanan pengungsi, sistem menyarankan penambahan segera 3 unit tenda peleton beserta 150 matras tidur isolasi.',
      metrik: [
        { item: 'Tenda Peleton', rekomendasi: '3 Unit', kekurangan: '3 Unit', durasiAman: '0.5 Hari', prioritas: 'Kritis' },
        { item: 'Matras Tidur', rekomendasi: '150 Pcs', kekurangan: '100 Pcs', durasiAman: '1.0 Hari', prioritas: 'Tinggi' }
      ]
    }
  };

  if (selectedSector && dataPrediksi[selectedSector]) {
    const sektor = dataPrediksi[selectedSector];
    return (
      <div className="flex flex-col w-full bg-gray-50 min-h-screen animate-fadeIn">
        {/* Header Detail */}
        <div className="bg-white p-4 border-b flex items-center gap-3 sticky top-0 z-10 shadow-sm">
          <button 
            onClick={() => setSelectedSector(null)}
            className="p-1 hover:bg-gray-100 rounded-lg transition"
          >
            <ChevronLeft className="w-6 h-6 text-blue-900" />
          </button>
          <div className="flex items-center gap-2">
            {sektor.icon}
            <h2 className="text-xl font-black text-blue-900 uppercase tracking-tight">{sektor.title}</h2>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* Blok Keterangan Narasi */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h4 className="text-xs font-bold text-gray-400 tracking-wider mb-2 uppercase">Analisis Naratif Model AI</h4>
            <p className="text-gray-700 text-sm leading-relaxed font-medium">
              {sektor.narasiLengkap}
            </p>
          </div>

          {/* Tabel Breakdown Kebutuhan Item */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 tracking-wider mb-3 uppercase">Breakdown Kebutuhan Parameter</h3>
            <div className="space-y-3">
              {sektor.metrik.map((m, idx) => (
                <div key={idx} className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold text-gray-800 text-sm">{m.item}</span>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${
                      m.prioritas === 'Kritis' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {m.prioritas}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-50 text-center">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold">REKOMENDASI</p>
                      <p className="text-xs font-black text-blue-900">{m.rekomendasi}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold">DEFISIT (SHORT)</p>
                      <p className="text-xs font-black text-red-600">{m.kekurangan}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold">SISA COV</p>
                      <p className="text-xs font-black text-gray-600">{m.durasiAman}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Info Tambahan */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3 text-xs text-blue-800">
            <Calendar className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p className="font-medium">Prakiraan dihitung otomatis berdasarkan data demografi masukan posko awal luring (Skema Siklus Tinjauan 72 Jam).</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full animate-fadeIn">
      {/* Banner Sinkronisasi */}
      <div className="bg-green-700 text-white px-4 py-2 flex justify-between items-center text-xs font-bold tracking-wide">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span>STATUS OFFLINE: SINKRON</span>
        </div>
        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
      </div>

      <div className="p-5">
        <h2 className="text-2xl font-black text-blue-900 leading-tight mb-1">OPERATIONAL<br/>OVERVIEW</h2>
        <div className="flex items-center gap-2 mb-6 text-sm text-gray-500 font-medium">
          <div className="w-1 h-4 bg-blue-500"></div>
          Rajeg Timur - Posko Evakuasi
        </div>

        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-lg text-gray-800 tracking-tight">PREDIKSI KEBUTUHAN 72 JAM</h3>
        </div>

        {/* List Card Sederhana */}
        <div className="space-y-3">
          {Object.entries(dataPrediksi).map(([key, sektor]) => (
            <div 
              key={key}
              onClick={() => setSelectedSector(key)}
              className={`bg-white p-4 rounded-xl shadow-sm border ${sektor.borderClass} hover:shadow-md active:scale-[0.99] transition cursor-pointer flex justify-between items-center`}
            >
              <div className="flex gap-4 items-center flex-1 min-w-0 pr-2">
                <div className={`${sektor.bgClass} p-3 rounded-xl flex-shrink-0`}>
                  {sektor.icon}
                </div>
                <div className="flex-1 min-w-1">
                  <h4 className={`text-sm font-black uppercase truncate tracking-tight ${sektor.colorClass}`}>{sektor.title}</h4>
                  <p className="text-xs text-gray-500 font-medium truncate mt-0.5">{sektor.ringkasan}</p>
                </div>
              </div>
              <ChevronLeft className="w-5 h-5 text-gray-300 rotate-180 flex-shrink-0" />
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}