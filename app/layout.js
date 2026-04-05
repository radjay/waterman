import './globals.css'
import { Suspense } from 'react'
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
            </head>
            <body className="overflow-x-hidden">
                <Suspense>
                    <ConvexProvider>
                        <AuthProvider>
                            {children}
                        </AuthProvider>
                    </ConvexProvider>
                </Suspense>
            </body>
        </html>
    )
}
