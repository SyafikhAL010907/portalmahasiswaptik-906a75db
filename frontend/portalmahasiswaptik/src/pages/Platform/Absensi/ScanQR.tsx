import { useResponsive } from '@/hooks/useResponsive';
import MobileScan from '../../MobilePhone/Absensi/ScanQR';
import WebScan from '../../WebAndTab/Absensi/ScanQR';

export default function ScanQR() {
  const { isMobileView } = useResponsive();

  return isMobileView ? <MobileScan /> : <WebScan />;
}
