import "@mantine/core/styles.css";
import {ColorSchemeScript, MantineProvider} from "@mantine/core";
import {theme} from "@/theme";
import {AuthProvider} from "@/contexts/AuthContext";
import {Notifications} from "@mantine/notifications";
import '@mantine/notifications/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/charts/styles.css';

import React from "react";

export const metadata = {
    title: "Money Manager",
    description: "Personal finance tracking made simple",
};

export default function RootLayout({children}: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
        <head>
            <ColorSchemeScript/>
            <link rel="shortcut icon" href="/favicon.svg"/>
            <meta
                name="viewport"
                content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
            />
            <title>{metadata.title}</title>
        </head>
        <body>
        <MantineProvider theme={theme}>
            <Notifications position="top-center" zIndex={1000}/>
            <AuthProvider>
                {children}
            </AuthProvider>
        </MantineProvider>
        </body>
        </html>
    );
}