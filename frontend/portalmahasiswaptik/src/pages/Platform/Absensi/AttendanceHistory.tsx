import { useResponsive } from '@/hooks/useResponsive';
import MobileHistory from '../../MobilePhone/Absensi/AttendanceHistory';
import WebHistory from '../../WebAndTab/Absensi/AttendanceHistory';

export default function AttendanceHistory() {
  const { isMobileView } = useResponsive();

  return isMobileView ? <MobileHistory /> : <WebHistory />;
}
