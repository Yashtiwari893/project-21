import "./globals.css"

export const metadata = {
  title: "WhatsApp Bot Dashboard",
  description: "MV Digital Work — WhatsApp Bot Monitor",
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
