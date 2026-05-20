import { useState, useEffect } from 'react';
import { Package, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { API_BASE_URL, getAuthHeaders } from '../lib/api';

const CATEGORY_OPTIONS = ['pangan', 'sandang', 'papan', 'lainnya'];

interface AssetItem {
  commodity: string;
  quantity_available: number;
  unit: string;
  min_threshold: number;
  is_critical: boolean;
  progress: number;
}

interface AssetCategory {
  category: string;
  title: string;
  subtitle: string;
  item_count: number;
  items: AssetItem[];
}

export default function AssetsPage() {
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingIdx, setEditingIdx] = useState<{ catIdx: number; itemIdx: number } | null>(null);
  const [editForm, setEditForm] = useState({ category: '', min_threshold: 0 });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/stocks/categories`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Gagal memuat assets');
      const data = await res.json();
      setCategories(data.categories || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (catIdx: number, itemIdx: number, item: AssetItem) => {
    setEditingIdx({ catIdx, itemIdx });
    setEditForm({ category: categories[catIdx].category, min_threshold: item.min_threshold });
    setMessage('');
  };

  const cancelEdit = () => {
    setEditingIdx(null);
    setMessage('');
  };

  const saveEdit = async () => {
    if (!editingIdx) return;
    setSaving(true);
    setMessage('');
    try {
      const cat = categories[editingIdx.catIdx];
      const item = cat.items[editingIdx.itemIdx];
      const assetId = `asset::WH-JKT-001::${item.commodity}`;
      const res = await fetch(`${API_BASE_URL}/api/stocks/${encodeURIComponent(assetId)}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          category: editForm.category,
          min_threshold: editForm.min_threshold,
        }),
      });
      if (!res.ok) throw new Error('Gagal menyimpan');
      setEditingIdx(null);
      setMessage('Tersimpan.');
      setTimeout(() => setMessage(''), 2000);
      fetchAssets();
    } catch (err: any) {
      setMessage(err.message || 'Gagal menyimpan');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full py-20">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-black text-blue-900 leading-tight">ASET LOGISTIK</h2>

      {message && (
        <p className={`text-xs font-medium text-center ${message.includes('Gagal') ? 'text-red-600' : 'text-green-600'}`}>
          {message}
        </p>
      )}

      {categories.map((cat, catIdx) => (
        <div key={cat.category} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <span className="font-black text-gray-800 text-sm uppercase">{cat.title}</span>
            </div>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded">{cat.item_count} item</span>
          </div>

          {cat.items.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-2">Belum ada aset</p>
          )}

          <div className="space-y-2">
            {cat.items.map((item, itemIdx) => {
              const isEditing = editingIdx?.catIdx === catIdx && editingIdx?.itemIdx === itemIdx;

              return (
                <div key={item.commodity} className="bg-gray-50 rounded-lg p-3">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-gray-800">{item.commodity}</span>
                        <span className="text-xs font-bold text-gray-500">{item.quantity_available} {item.unit}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 block mb-1">Kategori</label>
                          <select value={editForm.category}
                            onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-800 bg-white"
                          >
                            {CATEGORY_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-gray-500 block mb-1">Threshold Min</label>
                          <input type="number" min="0" value={editForm.min_threshold}
                            onChange={(e) => setEditForm(prev => ({ ...prev, min_threshold: parseInt(e.target.value) || 0 }))}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-800"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={saveEdit} disabled={saving}
                          className="flex-1 bg-blue-700 text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-1"
                        >
                          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                          Simpan
                        </button>
                        <button onClick={cancelEdit}
                          className="px-4 bg-gray-200 text-gray-600 font-bold py-2 rounded-lg text-sm"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-gray-800">{item.commodity}</span>
                          <span className="text-xs font-bold text-gray-500">{item.quantity_available} {item.unit}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-400">{cat.category}</span>
                          <span className="text-[10px] text-gray-300">|</span>
                          <span className="text-[10px] text-gray-400">Threshold: {item.min_threshold} {item.unit}</span>
                          {item.is_critical && (
                            <span className="flex items-center gap-0.5 text-[10px] text-red-600 font-bold">
                              <AlertCircle className="w-3 h-3" /> KRITIS
                            </span>
                          )}
                        </div>
                      </div>
                      <button onClick={() => startEdit(catIdx, itemIdx, item)}
                        className="ml-2 text-blue-600 text-xs font-bold px-2 py-1 rounded hover:bg-blue-50"
                      >
                        Edit
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
