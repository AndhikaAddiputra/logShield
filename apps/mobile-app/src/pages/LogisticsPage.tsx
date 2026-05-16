import { useEffect, useState } from 'react';
import { CheckCircle, FileText, AlertTriangle } from 'lucide-react';
import { fetchRequests } from '../lib/api';
import type { RequestRow } from '../lib/api';

export default function LogisticsPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetchRequests({ limit: 10 });
        setRequests(res.rows);
      } catch {
        // silent fail
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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

      <h3 className="font-black text-lg mb-4">RECENT LOGS</h3>

      {loading ? (
        <p className="text-sm text-gray-500">Memuat data...</p>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
          <AlertTriangle className="w-8 h-8" />
          <p className="text-sm font-medium">Belum ada request</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="bg-gray-50 border border-gray-100 p-3 rounded-lg flex items-center gap-4">
              <span className="text-xs font-bold text-gray-400 shrink-0">{req.time}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">
                  {req.request_code}
                </p>
                <p className="text-xs text-gray-500">
                  {req.title} · {req.status_label}
                </p>
                <p className="text-xs text-gray-400 truncate">
                  {req.items.map((i) => `${i.name} ${i.quantity}`).join(', ')}
                </p>
              </div>
              <CheckCircle className={`w-5 h-5 shrink-0 ${
                req.status === 'selesai' ? 'text-green-600' :
                req.status === 'diproses' ? 'text-blue-600' :
                req.status === 'mendesak' ? 'text-red-600' : 'text-gray-400'
              }`} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
