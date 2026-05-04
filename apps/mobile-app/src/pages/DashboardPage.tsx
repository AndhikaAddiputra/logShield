import { RefreshCw, Droplet, FileText, CheckCircle } from 'lucide-react';

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

        {/* Kartu Metrik */}
        <div className="space-y-4 mb-6">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-gray-500 tracking-wider">PENYIMPANAN AIR</span>
              <Droplet className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-4xl font-black mb-3">844 <span className="text-lg text-gray-400 font-bold">L</span></div>
            <div className="w-full bg-gray-200 h-2 rounded-full"><div className="bg-blue-900 h-2 rounded-full w-[80%]"></div></div>
          </div>

          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden">
             <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-gray-500 tracking-wider">RANSUM</span>
              <FileText className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-4xl font-black mb-3">1,240 <span className="text-lg text-gray-400 font-bold">Porsi</span></div>
             <div className="w-full bg-gray-200 h-2 rounded-full"><div className="bg-blue-900 h-2 rounded-full w-[60%]"></div></div>
          </div>
        </div>

        {/* Aksi Cepat */}
        <div className="bg-gray-100 p-4 rounded-xl mb-8">
          <p className="text-xs font-bold text-gray-600 tracking-wider mb-3">AKSI LANGSUNG LAPANGAN</p>
          <button className="w-full bg-blue-700 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 shadow-md">
            <FileText className="w-5 h-5" /> TAMBAH SUMBER DAYA
          </button>
        </div>

        {/* Recent Logs */}
        <h3 className="font-black text-lg mb-4">RECENT LOGS</h3>
        <div className="space-y-3">
          {/* Log Item 1 */}
          <div className="bg-gray-50 border border-gray-100 p-3 rounded-lg flex items-center gap-4">
            <span className="text-xs font-bold text-gray-400">12:45</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-800">PERMINTAAN LSH-01 DIBUAT</p>
              <p className="text-xs text-gray-500">400L Water / 50 Food Units</p>
            </div>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
          {/* Log Item 2 */}
          <div className="bg-gray-50 border border-gray-100 p-3 rounded-lg flex items-center gap-4">
            <span className="text-xs font-bold text-gray-400">11:20</span>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-800">KALIBRASI SENSOR PERANGKAT</p>
              <p className="text-xs text-gray-500">Cell ID: LC-009 Reset</p>
            </div>
            <CheckCircle className="w-5 h-5 text-green-600" />
          </div>
        </div>
      </div>
    </div>
  );
}