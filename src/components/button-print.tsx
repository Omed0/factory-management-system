import { Button, ButtonProps } from './ui/button'
import { Printer } from 'lucide-react'
import usePrintById from '@/hooks/usePrintById'

type Props = {
    props: ButtonProps
    nameId: string
}

export default function ButtonPrint({ props, nameId = "print" }: Props) {
    const printId = usePrintById()

    return (
        <Button onClick={() => printId(nameId)} {...props}>
            <Printer className="size-5" />
        </Button>
    )
}