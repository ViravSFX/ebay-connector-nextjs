import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from './providers'
import ConditionalLayout from './components/layout/ConditionalLayout'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'eBay Connector',
  description: 'Connect and manage your eBay listings',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <ConditionalLayout>{children}</ConditionalLayout>
        </Providers>
      </body>
    </html>
  )
}