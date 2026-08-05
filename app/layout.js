import './globals.css'
import { Suspense } from 'react'
import { Bricolage_Grotesque, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import { ConvexProvider } from '../components/ConvexProvider'
import { AuthProvider } from '../components/auth/AuthProvider'
import { ThemeProvider } from '../components/theme/ThemeProvider'
import { THEME_COLORS, themeBootstrapScript } from '../lib/theme'

// Self-hosted at build time by next/font, which also removes the render-blocking
// Google Fonts @import that used to sit at the top of globals.css.
const display = Bricolage_Grotesque({
    subsets: ['latin'],
    weight: ['600', '700', '800'],
    variable: '--font-display',
    display: 'swap',
})

const body = Space_Grotesk({
    subsets: ['latin'],
    weight: ['400', '500', '600', '700'],
    variable: '--font-body',
    display: 'swap',
})

// Every knot, metre, degree, temperature, time, score and duration stays
// monospaced. Only the face changes.
const mono = JetBrains_Mono({
    subsets: ['latin'],
    weight: ['400', '500', '700'],
    variable: '--font-mono',
    display: 'swap',
})

export const metadata = {
    title: 'Waterman',
    description: 'Premium wingfoiling forecast for Cascais',
    icons: {
        icon: '/favicon.png',
        apple: '/apple-touch-icon.png',
    },
    appleWebApp: {
        capable: true,
        // `default` follows the page background in both themes; the old
        // `black-translucent` was wrong for Dayglass.
        statusBarStyle: 'default',
        title: 'Waterman',
    },
}

export default function RootLayout({ children }) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={`${display.variable} ${body.variable} ${mono.variable}`}
        >
            <head>
                {/* Runs before first paint so there is no flash of the wrong
                    theme. suppressHydrationWarning above is what makes the
                    server/client attribute mismatch safe. */}
                <script
                    dangerouslySetInnerHTML={{ __html: themeBootstrapScript() }}
                />
                <meta name="theme-color" content={THEME_COLORS.night} />
            </head>
            <body className="overflow-x-hidden">
                <Suspense>
                    <ThemeProvider>
                        <ConvexProvider>
                            <AuthProvider>
                                {children}
                            </AuthProvider>
                        </ConvexProvider>
                    </ThemeProvider>
                </Suspense>
            </body>
        </html>
    )
}
