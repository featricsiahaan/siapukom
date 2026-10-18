import { Link } from 'react-router-dom';
import { AjakTeman } from '../components/AjakTeman';

export function Promo() {
  return (
    <div style={{ minHeight: '100vh', background: '#F6F8FC', color: '#0F2C59' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '22px 64px', background: '#fff', borderBottom: '1px solid rgba(15,44,89,0.08)' }}>
        <Link to="/dashboard" className="link-hover" style={{ fontSize: 14, fontWeight: 600 }}>
          ← Kembali
        </Link>
        <div style={{ fontSize: 18, fontWeight: 800, marginLeft: 8 }}>
          <span>Siap</span>
          <span style={{ color: '#C9962E' }}>UKOM</span>
        </div>
      </div>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 20px' }}>Promo</h1>
        <AjakTeman />
      </div>
    </div>
  );
}
