import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ETL Agent Mapper',
  description: 'AI-powered data mapping for ERP imports',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
