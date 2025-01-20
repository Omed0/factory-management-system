"use client"

import { useState } from 'react';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { ArrowDown, DatabaseBackup, HardDriveDownload, LoaderCircle, Send } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';

const ways_backup = [
    { name: "تێلێگرام", value: "telegram" as const, icon: Send },
    { name: "لۆکاڵ", value: "local" as const, icon: HardDriveDownload }
]

type Props = {
    onClose?: () => void;
}

export default function BackupButton({ onClose }: Props) {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleBackup = async (values: "telegram" | "local") => {
        const uploadToDrive = values
        setLoading(true);
        setMessage('');

        const formData = new FormData();
        formData.append('uploadToDrive', uploadToDrive);

        try {
            const response = await fetch('/api/backup', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            toast.info(data.message, { description: data?.description, duration: 4000 })
            onClose && onClose();
        } catch (error) {
            console.error('Error:', error);
            toast.error('هەڵەیەک ڕوویدا، باکئەپ نەکرا')
        } finally {
            setLoading(false);
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="default" className='gap-3'>
                    <ArrowDown className='size-5' />
                    Backup
                    {loading ? (
                        <LoaderCircle className='size-5 animate-spin duration-300' />
                    ) : (<DatabaseBackup className='size-5' />)}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-44 mx-3">
                <DropdownMenuLabel className='text-end'>هەڵگرتنی باکئەپ</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    {ways_backup.map((way) => (
                        <DropdownMenuItem
                            key={way.name}
                            className='justify-end gap-3'
                            onClick={() => handleBackup(way.value)}
                        >
                            {way.name}
                            <way.icon className='size-5' />
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}



