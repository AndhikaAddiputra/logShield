import { useEffect, useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  Field,
  FilterBar,
  Input,
  PageHeader,
  Pagination,
  SelectField,
  TableCell,
  TableHead,
  TableHeaderRow,
  TableRow,
} from "@log-shield/ui-core";
import { Check, Plus, SlidersHorizontal, X } from "lucide-react";
import {
  type ApprovePayload,
  type PersonnelRow,
  type PersonnelResponse,
  approveSignup,
  fetchPersonnel,
  rejectSignup,
} from "../lib/api";

type ModalMode = "approve" | "reject" | null;

const roleBadge: Record<string, "success" | "info" | "warning" | "muted"> = {
  lapangan: "success",
  koordinator: "info",
  admin: "warning",
};

export function PersonnelPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [roleFilter, setRoleFilter] = useState("all");
  const [poskoFilter, setPoskoFilter] = useState("all");

  const [data, setData] = useState<PersonnelResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalTarget, setModalTarget] = useState<PersonnelRow | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [submitting, setSubmitting] = useState(false);

  const [approveRole, setApproveRole] = useState("koordinator");
  const [approveKib, setApproveKib] = useState("");
  const [approvePosko, setApprovePosko] = useState("");
  const [approveName, setApproveName] = useState("");
  const [approveEmail, setApproveEmail] = useState("");
  const [approvePhone, setApprovePhone] = useState("");
  const [rejectReason, setRejectReason] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPersonnel();
      setData(res);
    } catch (err: any) {
      setError(err.message || "Gagal memuat data personel");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const viewerRole = data?.viewer.role;
  const isAdmin = viewerRole === "admin";
  const showNik = isAdmin;

  const filteredRows = (data?.rows || []).filter((row) => {
    if (search) {
      const q = search.toLowerCase();
      if (!row.nama_personel.toLowerCase().includes(q)) return false;
    }
    if (roleFilter !== "all" && row.role !== roleFilter) return false;
    if (poskoFilter !== "all" && row.posko_assignment !== poskoFilter) return false;
    return true;
  });

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pagedRows = filteredRows.slice((page - 1) * pageSize, page * pageSize);
  const pendingCount = data?.rows.filter((r) => r.status === "pending").length || 0;
  const activeCount = data?.rows.filter((r) => r.status === "active").length || 0;

  const openApprove = (row: PersonnelRow) => {
    setModalTarget(row);
    setModalMode("approve");
    setApproveRole("koordinator");
    setApproveKib("");
    setApprovePosko("");
    setApproveName(row.nama_personel);
    setApproveEmail("");
    setApprovePhone("");
  };

  const openReject = (row: PersonnelRow) => {
    setModalTarget(row);
    setModalMode("reject");
    setRejectReason("");
  };

  const closeModal = () => {
    setModalTarget(null);
    setModalMode(null);
  };

  const handleApprove = async () => {
    if (!modalTarget) return;
    setSubmitting(true);
    try {
      const payload: ApprovePayload = {
        role: approveRole,
        kib_bencana_id: approveKib,
        posko_id: approvePosko || null,
      };
      if (approveName !== modalTarget.nama_personel) payload.name = approveName;
      if (approveEmail) payload.email = approveEmail;
      if (approvePhone) payload.phone = approvePhone;

      await approveSignup(modalTarget.id, payload);
      closeModal();
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal menyetujui");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!modalTarget || !rejectReason.trim()) return;
    setSubmitting(true);
    try {
      await rejectSignup(modalTarget.id, { reason: rejectReason.trim() });
      closeModal();
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal menolak");
    } finally {
      setSubmitting(false);
    }
  };

  const poskoOptions = [
    ...new Set(
      data?.rows
        .map((r) => r.posko_assignment)
        .filter((p): p is string => p !== null && p !== undefined)
    ),
  ];

  return (
    <>
      <PageHeader
        title="Manajemen Akses Personel"
        searchPlaceholder="Cari personel..."
        searchValue={search}
        onSearchChange={setSearch}
        actions={
          isAdmin ? (
            <Button type="button" variant="primary" size="md" leftIcon={<Plus className="size-4" />}>
              Tambah Personel Baru
            </Button>
          ) : null
        }
        showNotifications
      />

      <FilterBar meta={`${activeCount} Aktif${pendingCount > 0 ? `, ${pendingCount} Menunggu` : ""}`}>
        <SelectField
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
          className="min-w-[180px]"
        >
          <option value="all">Semua Role</option>
          <option value="lapangan">Lapangan</option>
          <option value="koordinator">Koordinator</option>
          <option value="admin">Admin</option>
        </SelectField>
        <SelectField
          value={poskoFilter}
          onChange={(e) => { setPoskoFilter(e.target.value); setPage(1); }}
          className="min-w-[180px]"
        >
          <option value="all">Semua Posko</option>
          {poskoOptions.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </SelectField>
        <Button type="button" variant="outline" size="sm" className="px-2">
          <SlidersHorizontal className="size-4" />
        </Button>
      </FilterBar>

      <div className="space-y-4 p-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-ls-muted">Memuat data...</div>
        ) : error ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <p className="text-ls-danger">{error}</p>
            <Button onClick={loadData} variant="outline" size="sm">Coba Lagi</Button>
          </div>
        ) : (
          <div className="rounded-ls-lg border border-ls-border bg-white shadow-ls">
            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[940px] border-collapse text-sm">
                <thead>
                  <TableHeaderRow>
                    {data?.columns.map((col) => (
                      <TableHead key={col} className={col === "Aksi" ? "text-right" : ""}>
                        {col === "NIK" && !showNik ? null : col}
                      </TableHead>
                    ))}
                  </TableHeaderRow>
                </thead>
                <tbody>
                  {pagedRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={data?.columns.length || 6} className="py-12 text-center text-ls-muted">
                        Tidak ada data personel
                      </TableCell>
                    </TableRow>
                  ) : (
                    pagedRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar
                              alt={row.nama_personel}
                              fallback={row.nama_personel}
                              size="sm"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-ls-navy">
                                  {row.nama_personel}
                                </span>
                                {row.status === "pending" && (
                                  <Badge variant="warning">Pending</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {row.kib_bencana_id ? (
                            <Badge variant="muted">{row.kib_bencana_id}</Badge>
                          ) : (
                            <span className="text-xs text-ls-muted italic">—</span>
                          )}
                        </TableCell>
                        {showNik && (
                          <TableCell className="text-xs text-ls-muted">
                            {row.nik || <span className="italic">—</span>}
                          </TableCell>
                        )}
                        <TableCell>
                          {row.role ? (
                            <Badge variant={roleBadge[row.role] || "muted"}>
                              {row.role.charAt(0).toUpperCase() + row.role.slice(1)}
                            </Badge>
                          ) : (
                            <span className="text-xs text-ls-muted italic">Menunggu</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-ls-muted">
                          {row.posko_assignment || <span className="italic">—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            {row.aksi.includes("approve") && (
                              <Button
                                type="button"
                                variant="primary"
                                size="sm"
                                leftIcon={<Check className="size-3" />}
                                onClick={() => openApprove(row)}
                              >
                                Setujui
                              </Button>
                            )}
                            {row.aksi.includes("reject") && (
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                leftIcon={<X className="size-3" />}
                                onClick={() => openReject(row)}
                              >
                                Tolak
                              </Button>
                            )}
                            {row.aksi.length === 0 && (
                              <Button type="button" variant="outline" size="sm">Edit</Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-4 pb-4">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                summary={`Menampilkan ${pagedRows.length} dari ${filteredRows.length} personel`}
              />
            </div>
          </div>
        )}
      </div>

      {modalMode === "approve" && modalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-ls-lg border border-ls-border bg-white p-6 shadow-2xl space-y-5">
            <h2 className="text-lg font-bold text-ls-navy">Setujui Personel Baru</h2>
            <p className="text-sm text-ls-muted">
              Menyetujui: <strong>{modalTarget.nama_personel}</strong>
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Nama">
                  <Input
                    value={approveName}
                    onChange={(e) => setApproveName(e.target.value)}
                  />
                </Field>
                <Field label="Email">
                  <Input
                    value={approveEmail}
                    onChange={(e) => setApproveEmail(e.target.value)}
                    placeholder={modalTarget.nama_personel.toLowerCase().replace(/\s+/g, ".") + "@logshield.id"}
                  />
                </Field>
              </div>

              <Field label="Role">
                <SelectField value={approveRole} onChange={(e) => setApproveRole(e.target.value)}>
                  <option value="koordinator">Koordinator</option>
                  <option value="lapangan">Lapangan</option>
                </SelectField>
              </Field>

              <Field label="KIB Bencana ID">
                <Input
                  value={approveKib}
                  onChange={(e) => setApproveKib(e.target.value)}
                  placeholder="BNC-2026-JK-0001"
                />
              </Field>

              <Field label="Posko Assignment (opsional)">
                <Input
                  value={approvePosko}
                  onChange={(e) => setApprovePosko(e.target.value)}
                  placeholder="posko::kib-16-digit"
                />
              </Field>

              <Field label="No. Telepon">
                <Input
                  value={approvePhone}
                  onChange={(e) => setApprovePhone(e.target.value)}
                  placeholder="081234567890"
                />
              </Field>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={closeModal} disabled={submitting}>
                Batal
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={handleApprove}
                disabled={submitting || !approveKib}
              >
                {submitting ? "Menyetujui..." : "Setujui"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {modalMode === "reject" && modalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-ls-lg border border-ls-border bg-white p-6 shadow-2xl space-y-5">
            <h2 className="text-lg font-bold text-ls-navy">Tolak Pengajuan</h2>
            <p className="text-sm text-ls-muted">
              Menolak: <strong>{modalTarget.nama_personel}</strong>
            </p>

            <Field label="Alasan Penolakan">
              <textarea
                className="w-full rounded-ls border border-ls-border px-3 py-2 text-sm outline-none focus:border-ls-accent focus:ring-1 focus:ring-ls-accent/20 min-h-[100px]"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Data tidak sesuai."
              />
            </Field>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={closeModal} disabled={submitting}>
                Batal
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleReject}
                disabled={submitting || !rejectReason.trim()}
              >
                {submitting ? "Menolak..." : "Tolak"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <p className="border-t border-ls-border px-6 py-3 text-center text-xs text-ls-muted">
        LOG-SHIELD • Manajemen Akses Personel • Komponen dari @log-shield/ui-core
      </p>
    </>
  );
}
