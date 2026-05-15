import { CheckCircle, FileText } from 'lucide-react';

export default function LogisticsPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  return (
    <div className="p-5 flex flex-col h-full w-full">
      {/* Aksi Cepat */}
      <div className="bg-gray-100 p-4 rounded-xl mb-8">
        <p className="text-xs font-bold text-gray-600 tracking-wider mb-3">AKSI LANGSUNG LAPANGAN</p>
        <button 
          onClick={() => onNavigate('req')} 
          className="w-full bg-blue-700 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 shadow-md hover:bg-blue-800 transition active:scale-95"
        >
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
  );
}