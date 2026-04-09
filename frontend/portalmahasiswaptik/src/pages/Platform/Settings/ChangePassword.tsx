import { useResponsive } from '@/hooks/useResponsive';
import MobileChangePassword from '../../MobilePhone/Settings/ChangePassword';
import WebChangePassword from '../../WebAndTab/Settings/ChangePassword';

export default function ChangePassword() {
  const { isMobileView } = useResponsive();

  return isMobileView ? <MobileChangePassword /> : <WebChangePassword />;
}
