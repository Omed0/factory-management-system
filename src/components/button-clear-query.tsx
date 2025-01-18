"use client"

import { Button, buttonVariants } from './ui/button'
import { CalendarX2 } from 'lucide-react'
import useSetQuery from '@/hooks/useSetQuery'
import { cn } from '@/lib/utils'
import { VariantProps } from 'class-variance-authority'

type Props = {
    query: string
    className?: string
    variant?: VariantProps<typeof buttonVariants>['variant']
}

export default function ButtonClearQuery({ query, className, variant = "secondary" }: Props) {
    const { setQuery } = useSetQuery(0)

    return (
        <Button
            onClick={() => setQuery(query, "")}
            variant={variant} size="sm"
            className={cn("h-8 ms-4", className)}
        >
            <CalendarX2 className='size-5' />
        </Button>
    )
}