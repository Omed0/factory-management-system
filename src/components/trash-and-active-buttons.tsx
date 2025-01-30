import { Button } from './ui/button';
import { Archive, ShieldCheck } from 'lucide-react';
import useSetQuery from '@/hooks/useSetQuery';
import { cn } from '@/lib/utils';

type Props = {
    isRender?: boolean;
    className?: string;
    btnClassName?: string;
};

export default function TrashAndActiveButtons({ isRender = true, btnClassName, className }: Props) {
    const { setQuery, searchParams } = useSetQuery(0);
    const isTrash = searchParams.get("status") === 'trash';

    const handleTrashClick = () => {
        // Set the "status" query parameter to "trash"
        setQuery('status', 'trash');
    };

    const handleActiveClick = () => {
        // Remove the "status" query parameter
        setQuery('status', null);
    };

    if (!isRender) {
        return null; // Don't render the buttons if isRender is false
    }

    return (
        <div className={cn("flex gap-2", className)}>
            <Button
                variant={isTrash ? 'default' : 'outline'}
                size="sm"
                className={cn("h-8 lg:flex", btnClassName)}
                onClick={handleTrashClick}
            >
                <Archive className="size-4" />
            </Button>
            <Button
                variant={isTrash ? 'outline' : 'default'}
                size="sm"
                className={cn("h-8 lg:flex", btnClassName)}
                onClick={handleActiveClick}
            >
                <ShieldCheck className="size-4" />
            </Button>
        </div>
    );
}