export const metadata = {
  title: 'Support & Contact — PassGram',
  description: 'Get help, contact PassGram support, and find answers to your questions.',
}

export default function SupportPage() {
  return (
    <main style={{ fontFamily: 'Inter, sans-serif', background: '#090d16', color: '#f3f4f6', minHeight: '100vh', padding: '4rem 1.5rem' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        
        {/* Üst Geri Dönüş */}
        <nav style={{ marginBottom: '2.5rem' }}>
          <a href="https://zpas.org/" style={{ textDecoration: 'none', color: '#3b82f6', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            ← Back to Home
          </a>
        </nav>

        {/* Başlık Bölümü */}
        <header style={{ marginBottom: '3rem', borderBottom: '1px solid #1f293d', paddingBottom: '2rem' }}>
          <span style={{ fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#3b82f6', fontWeight: '600' }}>Customer Support</span>
          <h1 style={{ fontSize: '2.75rem', fontWeight: '700', marginTop: '0.5rem', marginBottom: '1rem', color: '#ffffff' }}>
            We are here to <em>help you.</em>
          </h1>
          <p style={{ color: '#9ca3af', fontSize: '1.125rem', lineHeight: '1.6' }}>
            Have questions about your vault, devices, or account? Reach out to our team directly or check out our official channels below.
          </p>
        </header>

        {/* İletişim Kartları Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
          
          {/* E-posta Kartı */}
          <div style={{ background: '#111827', border: '1px solid #1f293d', borderRadius: '12px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '12px', textTransform: 'uppercase', color: '#9ca3af', fontWeight: '600' }}>Email Us</span>
            <a href="mailto:support@zpas.org" style={{ fontSize: '1.125rem', fontWeight: '600', color: '#60a5fa', textDecoration: 'none' }}>
              support@zpas.org
            </a>
            <span style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>We typically reply within 24 hours.</span>
          </div>

          {/* Telefon Kartı */}
          <div style={{ background: '#111827', border: '1px solid #1f293d', borderRadius: '12px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '12px', textTransform: 'uppercase', color: '#9ca3af', fontWeight: '600' }}>Call Us</span>
            <a href="tel:+18443434524" style={{ fontSize: '1.125rem', fontWeight: '600', color: '#60a5fa', textDecoration: 'none' }}>
              +1 (844) 343-4524
            </a>
            <span style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Available Monday through Friday.</span>
          </div>

          {/* Sosyal Medya (X) Kartı */}
          <div style={{ background: '#111827', border: '1px solid #1f293d', borderRadius: '12px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '12px', textTransform: 'uppercase', color: '#9ca3af', fontWeight: '600' }}>Social Support</span>
            <a href="https://x.com/4rezan" target="_blank" rel="noopener noreferrer" style={{ fontSize: '1.125rem', fontWeight: '600', color: '#60a5fa', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              @4rezan on X
            </a>
            <span style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>Follow for updates and quick notices.</span>
          </div>

        </div>

        {/* Adres ve Merkez Bölümü */}
        <section style={{ background: '#111827', border: '1px solid #1f293d', borderRadius: '12px', padding: '2.5rem' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#ffffff', marginBottom: '1rem' }}>Our Headquarters</h2>
          <p style={{ color: '#9ca3af', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            If you need to send official documents or correspondence by mail, you can reach our main office at the address below:
          </p>
          <div style={{ background: '#090d16', padding: '1.25rem', borderRadius: '8px', border: '1px solid #1f293d', display: 'inline-block' }}>
            <p style={{ margin: 0, fontWeight: '500', color: '#f3f4f6' }}>PassGram Headquarters</p>
            <p style={{ margin: '4px 0 0 0', color: '#9ca3af' }}>432 Broadway Street, Suite 205</p>
            <p style={{ margin: '4px 0 0 0', color: '#9ca3af' }}>Harrisburg, PA 17101</p>
          </div>
        </section>

      </div>
    </main>
  );
}