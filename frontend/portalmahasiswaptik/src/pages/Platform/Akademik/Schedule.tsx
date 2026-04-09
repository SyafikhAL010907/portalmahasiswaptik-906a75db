import { useResponsive } from '@/hooks/useResponsive';
import MobileSchedule from '../../MobilePhone/Akademik/Schedule';
import WebSchedule from '../../WebAndTab/Akademik/Schedule';

export default function Schedule() {
  const { isMobileView } = useResponsive();

  return isMobileView ? <MobileSchedule /> : <WebSchedule />;
}
