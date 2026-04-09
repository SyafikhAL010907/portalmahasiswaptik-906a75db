import { useResponsive } from '@/hooks/useResponsive';
import MobileFinance from '../../MobilePhone/Keuangan/Finance';
import WebFinance from '../../WebAndTab/Keuangan/Finance';

export default function Finance() {
  const { isMobileView } = useResponsive();

  return isMobileView ? <MobileFinance /> : <WebFinance />;
}
