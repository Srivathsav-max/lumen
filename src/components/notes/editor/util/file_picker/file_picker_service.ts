import { PlatformFile, FileType, FilePickerStatus } from '../../../infra/file_picker';

export class FilePickerResult {
  /// Picked files.
  readonly files: PlatformFile[];

  constructor(files: PlatformFile[]) {
    this.files = files;
  }
}

/// Abstract file picker as a service to implement dependency injection.
export abstract class FilePickerService {
  async getDirectoryPath(options?: {
    title?: string;
  }): Promise<string | undefined> {
    throw new Error('getDirectoryPath() has not been implemented.');
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
    throw new Error('pickFiles() has not been implemented.');
  }

  async saveFile(options?: {
    dialogTitle?: string;
    fileName?: string;
    initialDirectory?: string;
    type?: FileType;
    allowedExtensions?: string[];
    lockParentWindow?: boolean;
  }): Promise<string | undefined> {
    throw new Error('saveFile() has not been implemented.');
  }
}