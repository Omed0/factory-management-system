"use client"

import { PropsWithChildren } from "react"
import { ThemeProvider } from "../theme-provider"
import { ThemeSwitcher } from "../theme-switcher"
import { Footer } from "./footer"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./app-sidebar"
import ProviderReactQuery from "./provider-react-query"


export default function CustomLayout({ children }: PropsWithChildren) {
    return (
        <ProviderReactQuery>
            <SidebarProvider className="relative max-w-full">
                <AppSidebar />
                <div className="min-h-screen flex flex-col flex-1">
                    <ThemeProvider attribute="class">
                        <SidebarTrigger className="size-9" />
                        {children}
                        <ThemeSwitcher className="fixed bottom-5 end-5 z-10" />
                        <Footer />
                    </ThemeProvider>
                </div>
            </SidebarProvider>
        </ProviderReactQuery>
    )
}