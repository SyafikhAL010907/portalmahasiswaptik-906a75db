import { useResponsive } from '@/hooks/useResponsive';
import MobileAnnouncements from '../../MobilePhone/Informasi/Announcements';
import WebAnnouncements from '../../WebAndTab/Informasi/Announcements';

export default function Announcements() {
  const { isMobileView } = useResponsive();

  return isMobileView ? <MobileAnnouncements /> : <WebAnnouncements />;
}
