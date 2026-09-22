import './globals.css';
import './opportunity.css';
import './analytics.css';

export const metadata = {
  title: 'Volun jobs',
  description: 'Opportunity intelligence and guarded application runner',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
