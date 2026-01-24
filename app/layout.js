import './globals.css'
import { ConvexProvider } from '../components/ConvexProvider'
import { AuthProvider } from '../components/auth/AuthProvider'

export const metadata = {
    title: 'Waterman',
    description: 'Premium wingfoiling forecast for Cascais',
    icons: {
        icon: '/favicon.png',
        apple: '/apple-touch-icon.png',
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'black-translucent',
        title: 'Waterman',
    },
}

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet" />
            </head>
            <body>
                <ConvexProvider>
                    <AuthProvider>
                        {children}
                    </AuthProvider>
                </ConvexProvider>
            </body>
        </html>
    )
}
