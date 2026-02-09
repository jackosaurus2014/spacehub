export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body style={{ margin: 0, padding: 0, background: '#0f172a', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
