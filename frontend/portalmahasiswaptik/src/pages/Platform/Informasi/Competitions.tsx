import { useResponsive } from '@/hooks/useResponsive';
import MobileCompetitions from '../../MobilePhone/Informasi/Competitions';
import WebCompetitions from '../../WebAndTab/Informasi/Competitions';

export default function Competitions() {
  const { isMobileView } = useResponsive();

  return isMobileView ? <MobileCompetitions /> : <WebCompetitions />;
}
