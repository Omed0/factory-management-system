"use client"

import { ReactNode, useEffect } from "react"
import { ThemeProvider } from "../theme-provider"
import { ThemeSwitcher } from "../theme-switcher"
import { Footer } from "./footer"
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./app-sidebar"
import { LoginUserType } from "@/server/access-layer/user"
import { useAuthUser } from "@/hooks/useSession"
import FullscreenComponent from "@/hooks/use-fullscreen"
import { useDollar } from "@/hooks/useDollar"
import ChangeCurrency from "../change-currency"


export default function CustomLayout({ children, session, dollar }:
    { children: ReactNode, session: LoginUserType, dollar: number }) {

    const { setData } = useAuthUser()
    const { setData: setDollar } = useDollar()

    useEffect(() => {
        setData(session)
        setDollar({ dollar })
    }, [])

    return (
        <SidebarProvider className="relative max-w-full">
            <AppSidebar />
            <div className="min-h-screen flex flex-col flex-1">
                <ThemeProvider attribute="class">
                    <div className="flex items-center justify-between pe-2">
                        <SidebarTrigger className="size-9" />
                        <div className="flex items-center gap-4 mt-1">
                            <ChangeCurrency />
                            <FullscreenComponent />
                        </div>
                    </div>
                    {children}
                    <Footer />
                </ThemeProvider>
            </div>
        </SidebarProvider>
    )
}