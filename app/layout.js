import './globals.css'

export const metadata = {
    title: 'Waterman | Wingfoil Forecast',
    description: 'Premium wingfoiling forecast for Cascais',
}

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet" />
            </head>
            <body>{children}</body>
        </html>
    )
}
