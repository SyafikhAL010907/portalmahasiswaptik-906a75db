import { useResponsive } from '@/hooks/useResponsive';
import MobileDashboard from '../MobilePhone/Dashboard';
import WebDashboard from '../WebAndTab/Dashboard';

export default function Dashboard() {
  const { isMobileView } = useResponsive();

  return isMobileView ? <MobileDashboard /> : <WebDashboard />;
}
