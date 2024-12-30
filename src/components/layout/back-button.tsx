"use client"

import { useRouter } from 'next/navigation'
import React, { HTMLProps } from 'react'
import { Button, buttonVariants } from '../ui/button'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { VariantProps } from 'class-variance-authority'

type Props = {
    className?: HTMLProps<HTMLElement>["className"];
    variant?: VariantProps<typeof buttonVariants>
}

export default function BackButton({ className, variant }: Props) {
    const router = useRouter()

    const handleBackPage = () => {
        return router.back()
    }

    return (
        <Button
            variant={variant?.variant ?? "outline"}
            className={cn("ms-4", className)}
            size={variant?.size ?? "icon"}
            onClick={handleBackPage}
        >
            <ChevronLeft className='size-5' />
        </Button>)
}