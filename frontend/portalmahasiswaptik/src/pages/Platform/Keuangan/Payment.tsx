import { useResponsive } from '@/hooks/useResponsive';
import MobilePayment from '../../MobilePhone/Keuangan/Payment';
import WebPayment from '../../WebAndTab/Keuangan/Payment';

export default function Payment() {
  const { isMobileView } = useResponsive();

  return isMobileView ? <MobilePayment /> : <WebPayment />;
}
