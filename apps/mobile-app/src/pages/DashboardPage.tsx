import { RefreshCw, Utensils, Shirt, Tent } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div className="flex flex-col w-full">
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

        <h3 className="font-black text-lg text-gray-800 mb-4 tracking-tight">PREDIKSI KEBUTUHAN 72 JAM</h3>

        {/* Kumpulan Kartu Prediksi */}
        <div className="space-y-4 mb-8">
          
          {/* 1. Card Pangan & Air */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-orange-100 relative overflow-hidden">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-black text-orange-600 tracking-widest uppercase">Pangan & Air</span>
              <div className="bg-orange-50 p-2 rounded-lg">
                <Utensils className="w-5 h-5 text-orange-500" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-700 leading-relaxed">
              Berdasarkan model demografi aktif, estimasi kebutuhan mendesak mencapai <span className="font-bold text-orange-600">2.532 porsi</span> ransum makanan dan <span className="font-bold text-orange-600">1.688 liter</span> air bersih. Stok lokal saat ini diprediksi habis dalam 18 jam.
            </p>
          </div>

          {/* 2. Card Sandang */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 relative overflow-hidden">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-black text-blue-600 tracking-widest uppercase">Sandang & Sanitasi</span>
              <div className="bg-blue-50 p-2 rounded-lg">
                <Shirt className="w-5 h-5 text-blue-500" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-700 leading-relaxed">
              Prioritas tinggi untuk pengadaan <span className="font-bold text-blue-600">120 paket selimut</span> yang difokuskan pada lansia dan balita. Sistem menyarankan penambahan <span className="font-bold text-blue-600">80 hygiene kit</span> (pembalut dan popok) secepatnya.
            </p>
          </div>

          {/* 3. Card Papan */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-teal-100 relative overflow-hidden">
            <div className="flex justify-between items-start mb-3">
              <span className="text-xs font-black text-teal-600 tracking-widest uppercase">Papan & Shelter</span>
              <div className="bg-teal-50 p-2 rounded-lg">
                <Tent className="w-5 h-5 text-teal-500" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-700 leading-relaxed">
              Kapasitas rasio tenda komunal terdeteksi <span className="font-bold text-teal-600">overload 15%</span>. Diperlukan segera <span className="font-bold text-teal-600">3 unit tenda peleton</span> tambahan dan 150 matras tidur isolasi untuk menekan laju penularan penyakit.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}