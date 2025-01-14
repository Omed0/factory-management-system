import { LoaderCircle } from "lucide-react";

export default function Loading() {
    return (
        <div className="backdrop-blur-sm bg-white/30 flex justify-center items-center h-[88svh] w-full">
            <LoaderCircle
                className="size-16 text-primary animate-spin"
            />
        </div>
    )
}