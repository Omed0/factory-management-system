import { useReactToPrint } from "react-to-print";

type Props = {
    contentRef: React.RefObject<HTMLDivElement>;
}

export default function usePrint({ contentRef }: Props) {
    const handlePrint = useReactToPrint({
        contentRef,
        //bodyClass: 'font-print',
    });

    return handlePrint;
}