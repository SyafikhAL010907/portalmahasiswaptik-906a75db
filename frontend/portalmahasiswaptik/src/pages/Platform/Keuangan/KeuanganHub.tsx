import { useState, useEffect } from 'react';
import MobileHub from '../../MobilePhone/Keuangan/KeuanganHub';

export default function KeuanganHub() {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    return isMobile ? <MobileHub /> : null;
}
