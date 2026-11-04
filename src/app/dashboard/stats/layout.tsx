import { StatsTabs } from "./stats-tabs";

export default function StatsLayout({ children }: LayoutProps<"/dashboard/stats">) {
  return (
    <>
      <StatsTabs />
      {children}
    </>
  );
}
