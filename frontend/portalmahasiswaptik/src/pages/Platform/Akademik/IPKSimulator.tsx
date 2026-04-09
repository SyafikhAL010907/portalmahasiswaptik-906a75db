import { useResponsive } from '@/hooks/useResponsive';
import MobileIPK from '../../MobilePhone/Akademik/IPKSimulator';
import WebIPK from '../../WebAndTab/Akademik/IPKSimulator';

export default function IPKSimulator() {
  const { isMobileView } = useResponsive();

  return isMobileView ? <MobileIPK /> : <WebIPK />;
}
