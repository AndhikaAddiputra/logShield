import { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  CardContent,
  Field,
  FilterBar,
  Input,
  PageHeader,
  SelectField,
} from "@log-shield/ui-core";
import { Phone, Plus, Upload } from "lucide-react";
import {
  type CreatePoskoPayload,
  type PoskoDoc,
  createPosko,
  fetchPoskos,
  importPoskosCsv,
} from "../lib/api";
import balitaIcon from "../assets/icons/balita.svg";
import disabilitasIcon from "../assets/icons/disabilitas.svg";
import lansiaIcon from "../assets/icons/lansia.svg";
import pengungsiIcon from "../assets/icons/pengungsi.svg";
import perempuanIcon from "../assets/icons/perempuan.svg";
import priaIcon from "../assets/icons/pria.svg";

interface StatItemProps {
  iconSrc: string;
  label: string;
  value: number;
}

function StatItem({ iconSrc, label, value }: StatItemProps) {
  return (
    <div className="flex items-center gap-2">
      <img src={iconSrc} alt={label} className="size-6 shrink-0" />
      <div>
        <div className="text-sm font-semibold text-ls-navy">{value}</div>
        <div className="text-xs text-ls-muted">{label}</div>
      </div>
    </div>
  );
}

function PoskoCard({ posko, onCall }: { posko: PoskoDoc; onCall: (phone: string) => void }) {
  const location = [posko.address, posko.district, posko.province].filter(Boolean).join(", ");
  const isoToPhone = (phone: string) => phone;

  return (
    <div className="rounded-ls-lg border border-ls-border bg-white shadow-ls overflow-hidden">
      <div className="p-5">
        <div className="text-xs text-ls-muted">{posko.kib_16}</div>
        <h3 className="text-lg font-semibold text-ls-navy mb-1">{posko.name}</h3>
        <p className="text-sm text-ls-muted mb-4">{location}</p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <StatItem iconSrc={pengungsiIcon} label="PENGUNGSI" value={posko.total_pengungsi} />
          <StatItem iconSrc={balitaIcon} label="BALITA" value={posko.count_balita} />
          <StatItem iconSrc={perempuanIcon} label="PEREMPUAN" value={posko.count_perempuan} />
          <StatItem iconSrc={lansiaIcon} label="LANSIA" value={posko.count_lansia} />
          <StatItem iconSrc={priaIcon} label="PRIA" value={posko.count_pria} />
          <StatItem iconSrc={disabilitasIcon} label="DISABILITAS" value={posko.count_disabilitas} />
        </div>
      </div>

      <div className="bg-ls-navy text-white px-5 py-4 flex items-center justify-between">
        <div className="flex-1">
          <div className="text-xs opacity-80">{posko.pj_phone} - {posko.pj_name}</div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-white text-white !bg-ls-navy hover:bg-ls-navy/10 flex items-center gap-2"
          onClick={() => onCall(posko.pj_phone)}
        >
          <Phone className="size-4" />
          CALL
        </Button>
      </div>
    </div>
  );
}

export function PoskoPage() {
  const [search, setSearch] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("all");
  const [data, setData] = useState<PoskoDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState<CreatePoskoPayload>({
    kib_16: "",
    name: "",
    address: "",
    district: "",
    province: "",
    total_pengungsi: 0,
    count_balita: 0,
    count_lansia: 0,
    count_perempuan: 0,
    count_pria: 0,
    count_disabilitas: 0,
    pj_phone: "",
    pj_name: "",
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPoskos();
      setData(res.rows);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data posko");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const provinces = [...new Set(data.map((p) => p.province).filter(Boolean))];

  const filtered = data.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      const match = p.name.toLowerCase().includes(q) || p.address.toLowerCase().includes(q) || p.district.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (provinceFilter !== "all" && p.province !== provinceFilter) return false;
    return true;
  });

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      await createPosko(form);
      setShowCreate(false);
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal membuat posko");
    } finally {
      setSubmitting(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubmitting(true);
    setImportResult(null);
    try {
      const res = await importPoskosCsv(file);
      if (res.ok || res.inserted > 0) {
        setImportResult(`Berhasil: ${res.inserted}, Gagal: ${res.failed}`);
      } else {
        setImportResult(`Gagal: ${res.errors?.map((e) => `Baris ${e.row}: ${e.message}`).join("; ")}`);
      }
      loadData();
    } catch (err: any) {
      setImportResult(err.message || "Gagal import CSV");
    } finally {
      setSubmitting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const updateForm = (field: keyof CreatePoskoPayload, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <PageHeader
        title="Data Posko"
        searchPlaceholder="Cari posko..."
        searchValue={search}
        onSearchChange={setSearch}
        showNotifications
      />

      <FilterBar meta={`${filtered.length} Posko`}>
        <SelectField
          value={provinceFilter}
          onChange={(e) => setProvinceFilter(e.target.value)}
          className="min-w-[180px]"
        >
          <option value="all">Semua Provinsi</option>
          {provinces.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </SelectField>
        <Button type="button" variant="primary" size="md" leftIcon={<Plus className="size-4" />} onClick={() => setShowCreate(true)}>
          Buat Baru
        </Button>
        <Button type="button" variant="outline" size="md" leftIcon={<Upload className="size-4" />} onClick={() => setShowImport(true)}>
          Import CSV
        </Button>
      </FilterBar>

      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-ls-muted">Memuat data...</div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <p className="text-ls-danger">{error}</p>
            <Button onClick={loadData} variant="outline" size="sm">Coba Lagi</Button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-ls-muted">Tidak ada data posko</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
            {filtered.map((posko) => (
              <PoskoCard key={posko._id} posko={posko} onCall={(phone) => window.open(`tel:${phone}`)} />
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-ls-lg border border-ls-border bg-white p-6 shadow-2xl space-y-5 my-8">
            <h2 className="text-lg font-bold text-ls-navy">Buat Posko Baru</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="KIB 16">
                <Input value={form.kib_16} onChange={(e) => updateForm("kib_16", e.target.value)} placeholder="1234567890123456" />
              </Field>
              <Field label="Nama Posko">
                <Input value={form.name} onChange={(e) => updateForm("name", e.target.value)} placeholder="Posko Rajeg Timur" />
              </Field>
              <Field label="Alamat">
                <Input value={form.address} onChange={(e) => updateForm("address", e.target.value)} placeholder="Jl. Contoh No. 1" />
              </Field>
              <Field label="Kecamatan">
                <Input value={form.district} onChange={(e) => updateForm("district", e.target.value)} placeholder="Tangerang" />
              </Field>
              <Field label="Provinsi">
                <Input value={form.province} onChange={(e) => updateForm("province", e.target.value)} placeholder="Banten" />
              </Field>
              <Field label="Total Pengungsi">
                <Input type="number" value={form.total_pengungsi} onChange={(e) => updateForm("total_pengungsi", Number(e.target.value))} />
              </Field>
              <Field label="Balita">
                <Input type="number" value={form.count_balita} onChange={(e) => updateForm("count_balita", Number(e.target.value))} />
              </Field>
              <Field label="Lansia">
                <Input type="number" value={form.count_lansia} onChange={(e) => updateForm("count_lansia", Number(e.target.value))} />
              </Field>
              <Field label="Perempuan">
                <Input type="number" value={form.count_perempuan} onChange={(e) => updateForm("count_perempuan", Number(e.target.value))} />
              </Field>
              <Field label="Pria">
                <Input type="number" value={form.count_pria} onChange={(e) => updateForm("count_pria", Number(e.target.value))} />
              </Field>
              <Field label="Disabilitas">
                <Input type="number" value={form.count_disabilitas} onChange={(e) => updateForm("count_disabilitas", Number(e.target.value))} />
              </Field>
              <Field label="PJ Nama">
                <Input value={form.pj_name} onChange={(e) => updateForm("pj_name", e.target.value)} placeholder="Budi" />
              </Field>
              <Field label="PJ Telepon">
                <Input value={form.pj_phone} onChange={(e) => updateForm("pj_phone", e.target.value)} placeholder="081234567890" />
              </Field>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)} disabled={submitting}>Batal</Button>
              <Button type="button" variant="primary" onClick={handleCreate} disabled={submitting || !form.name || !form.kib_16}>
                {submitting ? "Menyimpan..." : "Simpan"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-ls-lg border border-ls-border bg-white p-6 shadow-2xl space-y-5">
            <h2 className="text-lg font-bold text-ls-navy">Import Posko dari CSV</h2>
            <p className="text-sm text-ls-muted">
              Kolom CSV: KIB, name, address, district, province, totalpengungsi, countbalita, countlansia, countperempuan, countpria, countdisabilitas, pjphone, pjname
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              onChange={handleImport}
              className="block w-full text-sm text-ls-muted file:mr-3 file:py-2 file:px-4 file:rounded-ls file:border-0 file:text-sm file:font-semibold file:bg-ls-accent file:text-white hover:file:bg-ls-accent/90"
              disabled={submitting}
            />
            {importResult && (
              <div className="rounded-ls border border-ls-border bg-ls-surface p-3 text-sm text-ls-navy">
                {importResult}
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowImport(false); setImportResult(null); }} disabled={submitting}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      <p className="border-t border-ls-border px-6 py-3 text-center text-xs text-ls-muted">
        LOG-SHIELD • Data Posko • Komponen dari @log-shield/ui-core
      </p>
    </>
  );
}
