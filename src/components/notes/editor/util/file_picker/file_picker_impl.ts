import { FilePickerService, FilePickerResult } from './file_picker_service';
import { FileType, FilePickerStatus, PlatformFile } from '../../../infra/file_picker';

export class FilePicker implements FilePickerService {
  async getDirectoryPath(options?: { title?: string }): Promise<string | undefined> {
    // In a web environment, we would use the File System Access API
    // For now, return undefined as this is not commonly supported
    return undefined;
  }

  async pickFiles(options?: {
    dialogTitle?: string;
    initialDirectory?: string;
    type?: FileType;
    allowedExtensions?: string[];
    onFileLoading?: (status: FilePickerStatus) => void;
    allowMultiple?: boolean;
    withData?: boolean;
    withReadStream?: boolean;
    lockParentWindow?: boolean;
  }): Promise<FilePickerResult | undefined> {
    const {
      dialogTitle,
      initialDirectory,
      type = FileType.any,
      allowedExtensions,
      onFileLoading,
      allowMultiple = false,
      withData = false,
      withReadStream = false,
      lockParentWindow = false,
    } = options || {};

    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = allowMultiple;
      
      // Set accept attribute based on file type
      if (type !== FileType.any && allowedExtensions) {
        input.accept = allowedExtensions.map(ext => `.${ext}`).join(',');
      }

      input.onchange = async (event) => {
        const target = event.target as HTMLInputElement;
        const files = target.files;
        
        if (!files || files.length === 0) {
          resolve(undefined);
          return;
        }

        onFileLoading?.(FilePickerStatus.picking);

        const platformFiles: PlatformFile[] = [];
        
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          let bytes: Uint8Array | undefined;
          
          if (withData) {
            const arrayBuffer = await file.arrayBuffer();
            bytes = new Uint8Array(arrayBuffer);
          }

          platformFiles.push(new PlatformFile({
            name: file.name,
            size: file.size,
            bytes: bytes,
            path: undefined, // Web doesn't provide file paths for security reasons
          }));
        }

        onFileLoading?.(FilePickerStatus.done);
        resolve(new FilePickerResult(platformFiles));
      };

      input.oncancel = () => {
        resolve(undefined);
      };

      input.click();
    });
  }

  async saveFile(options?: {
    dialogTitle?: string;
    fileName?: string;
    initialDirectory?: string;
    type?: FileType;
    allowedExtensions?: string[];
    lockParentWindow?: boolean;
  }): Promise<string | undefined> {
    // In a web environment, we would use the File System Access API
    // For now, return undefined as this is not commonly supported
    // The actual file saving would be handled by triggering a download
    return undefined;
  }
}