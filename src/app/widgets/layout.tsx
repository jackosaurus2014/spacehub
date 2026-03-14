export default function WidgetLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body style={{ margin: 0, padding: 0, background: '#000000', color: 'rgba(255,255,255,0.9)', fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
