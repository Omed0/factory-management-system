'use client';

import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';
import 'filepond/dist/filepond.min.css';

import { forwardRef, useState } from 'react';
import { FilePond } from 'react-filepond';
import { ControllerRenderProps } from 'react-hook-form';
import { FilePondFile, registerPlugin } from 'filepond';
import FilePondPluginFileMetadata from 'filepond-plugin-file-metadata';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';

import { cn } from '@/lib/utils';

registerPlugin(FilePondPluginImagePreview, FilePondPluginFileMetadata);

type UploadFileProps = {
  allowMultiple?: boolean;
  name: string;
  accept?: string[];
  className?: string;
  onChange?: (files: FilePondFile[]) => void;
  field?: ControllerRenderProps<any, any>;
  maxFiles?: number;
  maxFileSize?: number;
};

const UploadFile = forwardRef<FilePond, UploadFileProps>(
  (
    {
      allowMultiple = false,
      name,
      accept = ['image/*'],
      className,
      onChange,
      field,
      maxFiles = 1,
      maxFileSize = 8000000,
    },
    ref
  ) => {
    const [files, setFiles] = useState<FilePondFile[]>([]);

    const handleUpdateFiles = (fileItems: FilePondFile[]) => {
      setFiles(fileItems);
      onChange?.(fileItems);
      field?.onChange(fileItems[0]);
    };

    return (
      <div className={cn('w-full', className)}>
        <FilePond
          {...field}
          acceptedFileTypes={accept}
          files={files as unknown as FilePondFile['file'][]}
          onupdatefiles={handleUpdateFiles}
          allowMultiple={allowMultiple}
          maxFiles={maxFiles}
          dropOnPage
          allowPaste
          allowBrowse
          allowReplace
          name={name}
          allowDrop
          allowRemove
          chunkSize={maxFileSize}
          dropValidation
          ref={ref}
        />
      </div>
    );
  }
);

UploadFile.displayName = 'UploadFile';

export default UploadFile;
