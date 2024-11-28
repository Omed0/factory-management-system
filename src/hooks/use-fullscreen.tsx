"use client"

import { Button } from "@/components/ui/button";
import { Expand, Shrink } from "lucide-react";
import { FC, useEffect, useState } from "react";

const FullscreenComponent: FC = () => {
    const [isFullscreen, setIsFullscreen] = useState(false)

    useEffect(() => {
        if (isFullscreen) {
            document.documentElement.requestFullscreen()
        } else {
            if (document.fullscreenElement) {
                document.exitFullscreen()
            }
        }

        return () => {
            if (document.fullscreenElement) {
                document.exitFullscreen()
            }
        }
    }, [isFullscreen])

    return (
        <>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => setIsFullscreen((prev) => !prev)}>
                {isFullscreen ? <Shrink className="size-5" /> : <Expand className="size-5" />}
            </Button>
            <p className="sr-only">{isFullscreen ? "You are in fullscreen mode." : "You are not in fullscreen mode."}</p>
        </>
    );
};

export default FullscreenComponent;
