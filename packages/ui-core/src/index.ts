// Legacy dark shell (petugas early scaffold); prefer AppLayout + LogShieldSidebar for web.
export { Shell } from "./shell.js";

export { cn } from "./lib/cn.js";

export { AppLayout } from "./components/app-layout.js";
export { LogShieldSidebar } from "./components/sidebar.js";
export type {
  LogShieldSidebarProps,
  SidebarNavItem,
} from "./components/sidebar.js";

export { PageHeader } from "./components/page-header.js";
export type { PageHeaderProps } from "./components/page-header.js";

export { SearchInput } from "./components/search-input.js";
export { Button } from "./components/button.js";
export type { ButtonProps, ButtonVariant, ButtonSize } from "./components/button.js";

export { Badge } from "./components/badge.js";
export type { BadgeProps, BadgeVariant } from "./components/badge.js";

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardContent,
  CardFooter,
} from "./components/card.js";

export { Input } from "./components/input.js";
export type { InputProps } from "./components/input.js";
export { Label } from "./components/label.js";
export { Field } from "./components/field.js";
export { SelectField } from "./components/select-field.js";
export { Toggle } from "./components/toggle.js";
export type { ToggleProps } from "./components/toggle.js";

export { Avatar } from "./components/avatar.js";
export type { AvatarProps } from "./components/avatar.js";

export {
  Table,
  TableHeaderRow,
  TableHead,
  TableRow,
  TableCell,
} from "./components/table.js";

export { Pagination } from "./components/pagination.js";
export type { PaginationProps } from "./components/pagination.js";

export { StatCard } from "./components/stat-card.js";
export type { StatCardProps, StatTone } from "./components/stat-card.js";

export { FilterBar } from "./components/filter-bar.js";
export type { FilterBarProps } from "./components/filter-bar.js";

export { MobileHeader } from "./components/mobile-header.js";
export type { MobileHeaderProps } from "./components/mobile-header.js";

export { MobileBottomNav } from "./components/mobile-bottom-nav.js";
export type {
  MobileBottomNavProps,
  MobileNavItem,
} from "./components/mobile-bottom-nav.js";

export { StatusBanner } from "./components/status-banner.js";
export type { StatusBannerProps, StatusBannerVariant } from "./components/status-banner.js";

export { ResourceStatCard } from "./components/resource-stat-card.js";
export type { ResourceStatCardProps } from "./components/resource-stat-card.js";

export { LogItem } from "./components/log-item.js";
export type { LogItemProps } from "./components/log-item.js";

export { TelemetryRow } from "./components/telemetry-row.js";
export type { TelemetryRowProps } from "./components/telemetry-row.js";
