import { useResponsive } from '@/hooks/useResponsive';
import MobileQR from '../../MobilePhone/Absensi/QRGenerator';
import WebQR from '../../WebAndTab/Absensi/QRGenerator';

export default function QRGenerator() {
  const { isMobileView } = useResponsive();

  return isMobileView ? <MobileQR /> : <WebQR />;
}
