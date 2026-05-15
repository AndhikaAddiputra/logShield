import { useState } from "react";
import {
  Avatar,
  Badge,
  Button,
  FilterBar,
  PageHeader,
  Pagination,
  SelectField,
  TableCell,
  TableHead,
  TableHeaderRow,
  TableRow,
} from "@log-shield/ui-core";
import { Plus, SlidersHorizontal } from "lucide-react";

type PersonnelRole = "Lapangan" | "Koordinator" | "Admin";

interface PersonnelItem {
  name: string;
  email: string;
  kib: string;
  nik: string;
  role: PersonnelRole;
  assignment: string;
  avatarClass: string;
}

const personnelData: PersonnelItem[] = [
  {
    name: "Budi Santoso",
    email: "budi@logshield.id",
    kib: "BNC-2024-JB-0142",
    nik: "3201041234560001",
    role: "Lapangan",
    assignment: "Pusat Koordinasi",
    avatarClass: "bg-slate-900",
  },
  {
    name: "Siti Rahayu",
    email: "siti.r@logshield.id",
    kib: "BNC-2024-JB-0201",
    nik: "3201052345670002",
    role: "Lapangan",
    assignment: "Posko Cianjur A",
    avatarClass: "bg-sky-500",
  },
  {
    name: "Agus Prabowo",
    email: "agus.p@logshield.id",
    kib: "BNC-2024-JB-0315",
    nik: "3271063456780003",
    role: "Lapangan",
    assignment: "Posko Garut B",
    avatarClass: "bg-emerald-400",
  },
  {
    name: "Dewi Kusuma",
    email: "dewi.k@logshield.id",
    kib: "BNC-2024-JB-0408",
    nik: "3204074567890004",
    role: "Lapangan",
    assignment: "Posko Sukabumi C",
    avatarClass: "bg-amber-400",
  },
  {
    name: "Hendra Wijaya",
    email: "hendra.w@logshield.id",
    kib: "BNC-2024-JB-0523",
    nik: "3273085678900005",
    role: "Lapangan",
    assignment: "Posko Bandung D",
    avatarClass: "bg-violet-400",
  },
  {
    name: "Rina Melati",
    email: "rina.m@logshield.id",
    kib: "BNC-2024-JB-0619",
    nik: "3204096789010006",
    role: "Lapangan",
    assignment: "Pusat Koordinasi",
    avatarClass: "bg-rose-400",
  },
  {
    name: "Dian Pratama",
    email: "dian.p@logshield.id",
    kib: "BNC-2024-JB-0734",
    nik: "3271107890120007",
    role: "Lapangan",
    assignment: "Posko Cianjur A",
    avatarClass: "bg-teal-400",
  },
];

const roleVariant = {
  Lapangan: "success",
  Koordinator: "info",
  Admin: "warning",
} as const;

export function PersonnelPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  return (
    <>
      <PageHeader
        title="Manajemen Akses Personel"
        searchPlaceholder="Cari personel..."
        searchValue={search}
        onSearchChange={setSearch}
        actions={
          <Button type="button" variant="primary" size="md" leftIcon={<Plus className="size-4" />}>
            Tambah Personel Baru
          </Button>
        }
        showNotifications
      />

      <FilterBar meta="52 Personel">
        <SelectField defaultValue="all" className="min-w-[180px]">
          <option value="all">Semua Role</option>
          <option value="lapangan">Lapangan</option>
          <option value="koordinator">Koordinator</option>
          <option value="admin">Admin</option>
        </SelectField>
        <SelectField defaultValue="all" className="min-w-[180px]">
          <option value="all">Semua Posko</option>
          <option value="pusat">Pusat Koordinasi</option>
          <option value="cianjur">Posko Cianjur A</option>
          <option value="garut">Posko Garut B</option>
          <option value="sukabumi">Posko Sukabumi C</option>
          <option value="bandung">Posko Bandung D</option>
        </SelectField>
        <Button type="button" variant="outline" size="sm" className="px-2">
          <SlidersHorizontal className="size-4" />
        </Button>
      </FilterBar>

      <div className="space-y-4 p-6">
        <div className="rounded-ls-lg border border-ls-border bg-white shadow-ls">
          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[940px] border-collapse text-sm">
              <thead>
                <TableHeaderRow>
                  <TableHead>Nama Personel</TableHead>
                  <TableHead>KIB (Bencana ID)</TableHead>
                  <TableHead>NIK</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Posko Assignment</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableHeaderRow>
              </thead>
              <tbody>
                {personnelData.map((person) => (
                  <TableRow key={person.kib}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar
                          alt={person.name}
                          fallback={person.name}
                          size="sm"
                          className={person.avatarClass}
                        />
                        <div>
                          <div className="text-sm font-semibold text-ls-navy">{person.name}</div>
                          <div className="text-xs text-ls-muted">{person.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="muted">{person.kib}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-ls-muted">{person.nik}</TableCell>
                    <TableCell>
                      <Badge variant={roleVariant[person.role] ?? "muted"}>{person.role}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-ls-muted">{person.assignment}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" size="sm">
                          Edit
                        </Button>
                        <Button type="button" variant="destructive" size="sm">
                          Hapus
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-4">
            <Pagination
              currentPage={page}
              totalPages={8}
              onPageChange={setPage}
              summary="Menampilkan 7 dari 52 personel"
            />
          </div>
        </div>
      </div>

      <p className="border-t border-ls-border px-6 py-3 text-center text-xs text-ls-muted">
        LOG-SHIELD • Manajemen Akses Personel • Komponen dari @log-shield/ui-core
      </p>
    </>
  );
}
