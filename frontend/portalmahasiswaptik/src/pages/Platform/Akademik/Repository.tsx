import { useResponsive } from '@/hooks/useResponsive';
import MobileRepo from '../../MobilePhone/Akademik/Repository';
import WebRepo from '../../WebAndTab/Akademik/Repository';

export default function Repository() {
  const { isMobileView } = useResponsive();

  return isMobileView ? <MobileRepo /> : <WebRepo />;
}
