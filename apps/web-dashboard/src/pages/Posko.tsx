import { useState } from "react";
import {
  Button,
  FilterBar,
  PageHeader,
  SelectField,
} from "@log-shield/ui-core";
import { Phone } from "lucide-react";
import balitaIcon from "../assets/icons/balita.svg";
import disabilitasIcon from "../assets/icons/disabilitas.svg";
import lansiaIcon from "../assets/icons/lansia.svg";
import pengungsiIcon from "../assets/icons/pengungsi.svg";
import perempuanIcon from "../assets/icons/perempuan.svg";
import priaIcon from "../assets/icons/pria.svg";

const poskoData = [
  {
    id: "123456789102345",
    name: "Rajeg Timur",
    location: "Dolok, Adiam Kolom, Tapanuli, Sumatera Utara",
    stats: {
      pengungsi: 923,
      balita: 78,
      perempuan: 200,
      disabilitas: 200,
      pria: 723,
      lansia: 20,
    },
    contact: "08121441511",
    contactName: "Komarudin",
    role: "PJ PERSONEL LAPANGAN",
  },
  {
    id: "123456789102345",
    name: "Rajeg Barat",
    location: "Dolok, Adiam Kolom, Tapanuli, Sumatera Utara",
    stats: {
      pengungsi: 923,
      balita: 78,
      perempuan: 200,
      disabilitas: 200,
      pria: 723,
      lansia: 20,
    },
    contact: "08121441511",
    contactName: "Komarudin",
    role: "PJ PERSONEL LAPANGAN",
  },
  {
    id: "123456789102345",
    name: "Rajeg Timur",
    location: "Dolok, Adiam Kolom, Tapanuli, Sumatera Utara",
    stats: {
      pengungsi: 923,
      balita: 78,
      perempuan: 200,
      disabilitas: 200,
      pria: 723,
      lansia: 20,
    },
    contact: "08121441511",
    contactName: "Komarudin",
    role: "PJ PERSONEL LAPANGAN",
  },
  {
    id: "123456789102345",
    name: "Rajeg Barat",
    location: "Dolok, Adiam Kolom, Tapanuli, Sumatera Utara",
    stats: {
      pengungsi: 923,
      balita: 78,
      perempuan: 200,
      disabilitas: 200,
      pria: 723,
      lansia: 20,
    },
    contact: "08121441511",
    contactName: "Komarudin",
    role: "PJ PERSONEL LAPANGAN",
  },
];

interface PoskoStats {
  pengungsi: number;
  balita: number;
  perempuan: number;
  disabilitas: number;
  pria: number;
  lansia: number;
}

interface PoskoItem {
  id: string;
  name: string;
  location: string;
  stats: PoskoStats;
  contact: string;
  contactName: string;
  role: string;
}

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

function PoskoCard({ posko }: { posko: PoskoItem }) {
  return (
    <div className="rounded-ls-lg border border-ls-border bg-white shadow-ls overflow-hidden">
      <div className="p-5">
        <div className="text-xs text-ls-muted">{posko.id}</div>
        <h3 className="text-lg font-semibold text-ls-navy mb-1">{posko.name}</h3>
        <p className="text-sm text-ls-muted mb-4">{posko.location}</p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <StatItem iconSrc={pengungsiIcon} label="PENGUNGSI" value={posko.stats.pengungsi} />
          <StatItem iconSrc={balitaIcon} label="BALITA" value={posko.stats.balita} />
          <StatItem iconSrc={perempuanIcon} label="PEREMPUAN" value={posko.stats.perempuan} />
          <StatItem iconSrc={lansiaIcon} label="LANSIA" value={posko.stats.lansia} />
          <StatItem iconSrc={priaIcon} label="PRIA" value={posko.stats.pria} />
          <StatItem iconSrc={disabilitasIcon} label="DISABILITAS" value={posko.stats.disabilitas} />
        </div>
      </div>

      <div className="bg-ls-navy text-white px-5 py-4 flex items-center justify-between">
        <div className="flex-1">
          <div className="text-xs opacity-80">{posko.contact} - {posko.contactName}</div>
          <div className="text-xs opacity-80">{posko.role}</div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="border-white text-white !bg-ls-navy hover:bg-ls-navy/10 flex items-center gap-2"
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

  return (
    <>
      <PageHeader
        title="Data Posko"
        onSearchChange={setSearch}
        showNotifications
      />
      <FilterBar meta="">
        <SelectField defaultValue="all" className="min-w-[180px]">
          <option value="all">Filter by location</option>
          <option value="north">North Region</option>
          <option value="south">South Region</option>
          <option value="east">East Region</option>
          <option value="west">West Region</option>
        </SelectField>
        <Button type="button" variant="primary" size="md">
          Buat Baru
        </Button>
      </FilterBar>

      <div className="p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
          {poskoData.map((posko) => (
            <PoskoCard key={posko.id} posko={posko} />
          ))}
        </div>
      </div>

      <p className="border-t border-ls-border px-6 py-3 text-center text-xs text-ls-muted">
        LOG-SHIELD • Data Posko • Komponen dari @log-shield/ui-core
      </p>
    </>
  );
}
