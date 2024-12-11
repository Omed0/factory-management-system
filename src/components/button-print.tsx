import { Button, ButtonProps } from './ui/button'
import { Printer } from 'lucide-react'
import usePrintById from '@/hooks/usePrintById'

type Props = {
    nameId?: string
} & ButtonProps; // Accept ButtonProps directly

export default function ButtonPrint({ nameId = "print", ...props }: Props) {
    const printId = usePrintById()

    return (
        <Button onClick={() => printId(nameId)} {...props}>
            <Printer className="size-5" />
        </Button>
    )
}