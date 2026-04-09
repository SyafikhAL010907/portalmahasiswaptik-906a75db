import { useResponsive } from '@/hooks/useResponsive';
import MobileLeaderboard from '../../MobilePhone/Informasi/Leaderboard';
import WebLeaderboard from '../../WebAndTab/Informasi/Leaderboard';

export default function Leaderboard() {
  const { isMobileView } = useResponsive();

  return isMobileView ? <MobileLeaderboard /> : <WebLeaderboard />;
}
