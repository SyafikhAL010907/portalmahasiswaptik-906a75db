import { useResponsive } from '@/hooks/useResponsive';
import MobileAdminManagement from '../../MobilePhone/Admin/AdminManagement';
import WebAdminManagement from '../../WebAndTab/Admin/AdminManagement';

export default function AdminManagement() {
  const { isMobileView } = useResponsive();

  return isMobileView ? <MobileAdminManagement /> : <WebAdminManagement />;
}
