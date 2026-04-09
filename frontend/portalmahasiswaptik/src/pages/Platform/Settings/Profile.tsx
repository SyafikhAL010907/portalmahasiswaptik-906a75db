import { useResponsive } from '@/hooks/useResponsive';
import MobileProfile from '../../MobilePhone/Settings/Profile';
import WebProfile from '../../WebAndTab/Settings/Profile';

export default function Profile() {
  const { isMobileView } = useResponsive();

  return isMobileView ? <MobileProfile /> : <WebProfile />;
}
