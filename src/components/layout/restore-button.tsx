"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { toast } from "sonner";
import {
    ArrowUp,
    DatabaseZap,
    HardDriveDownload,
    LoaderCircle,
    Send,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useRouter } from "next/navigation";

// Options for restore sources
const ways_restore = [
    { name: "تێلێگرام", value: "telegram" as const, icon: Send },
    { name: "لۆکاڵ", value: "local" as const, icon: HardDriveDownload },
];

type Props = {
    onClose?: () => void;
}


export default function RestoreButton({ onClose }: Props) {
    const [loadingRestore, setLoadingRestore] = useState(false);
    const router = useRouter();

    const handleRestore = async (values: "telegram" | "local") => {
        const restoreSource = values;
        setLoadingRestore(true);

        const formData = new FormData();
        formData.append("restoreSource", restoreSource);

        try {
            const response = await fetch("/api/restore", {
                method: "POST",
                body: formData,
            });
            const data = await response.json();

            if (response.ok) {
                toast.success(data.message, {
                    description: data?.description,
                    duration: 4000,
                });
                router.refresh();
                onClose && onClose();
            } else {
                toast.error("هەڵەیەک ڕوویدا، ڕیستۆر نەکرا");
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("هەڵەیەک ڕوویدا، ڕیستۆر نەکرا");
        } finally {
            setLoadingRestore(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-3">
                    <ArrowUp className="size-5" />
                    Restore
                    {loadingRestore ? (
                        <LoaderCircle className="size-5 animate-spin duration-300" />
                    ) : (
                        <DatabaseZap className="size-5" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44 mx-3">
                <DropdownMenuLabel className="text-end">
                    ڕیستۆردانی باکئەپ
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    {ways_restore.map((way) => (
                        <DropdownMenuItem
                            key={way.name}
                            className="justify-end gap-3"
                            onClick={() => handleRestore(way.value)}
                        >
                            {way.name}
                            <way.icon className="size-5" />
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
