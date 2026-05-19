import { useEffect, useState } from 'react';
import { FileText, Loader2, Info } from 'lucide-react';
import { API_BASE_URL, getAuthHeaders } from '../lib/api';

export default function LogisticsPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/requests?limit=10`, {
          headers: getAuthHeaders()
        });
        if (!res.ok) throw new Error("Gagal load request");
        const data = await res.json();
        setRequests(data.rows || data); 
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRequests();
  }, []);

  const getStatusColor = (colorCode: string) => {
    switch (colorCode) {
      case 'danger': return 'bg-red-100 text-red-700';
      case 'warning': return 'bg-orange-100 text-orange-700';
      case 'success': return 'bg-green-100 text-green-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <div className="p-5 flex flex-col h-full w-full">
      <div className="bg-gray-100 p-4 rounded-xl mb-8">
        <p className="text-xs font-bold text-gray-600 tracking-wider mb-3">AKSI LANGSUNG LAPANGAN</p>
        <button 
          onClick={() => onNavigate('req')} 
          className="w-full bg-blue-700 text-white font-bold py-4 rounded-lg flex items-center justify-center gap-2 shadow-md hover:bg-blue-800 transition active:scale-95"
        >
          <FileText className="w-5 h-5" /> TAMBAH SUMBER DAYA
        </button>
      </div>

      <h3 className="font-black text-lg mb-4 text-gray-800">RIWAYAT PERMINTAAN</h3>
      
      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-blue-500" /></div>
      ) : requests.length === 0 ? (
        <div className="bg-gray-50 border border-gray-100 p-6 rounded-lg text-center flex flex-col items-center">
          <Info className="w-8 h-8 text-gray-400 mb-2" />
          <p className="text-sm font-bold text-gray-500">Belum ada request</p>
        </div>
      ) : (
        <div className="space-y-3 pb-6">
          {requests.map((req: any, idx: number) => (
            <div key={idx} className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="text-xs font-black text-gray-400">{req.date} • {req.time}</p>
                  <p className="text-sm font-bold text-gray-800 mt-0.5">{req.request_code}</p>
                </div>
                <span className={`text-[10px] font-extrabold px-2 py-1 rounded uppercase tracking-wider ${getStatusColor(req.status_color)}`}>
                  {req.status_label}
                </span>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-3 mt-3">
                {req.items && req.items.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm mb-1 last:mb-0">
                    <span className="font-bold text-gray-700">{item.name}</span>
                    <span className="font-black text-blue-900">{item.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}