export type CaseFile = {
  _id?: string;
  key: string;
  mimeType: string;
  name?: string;
  fileName?: string;
  fileSize?: number;
  createdAt?: string;
  chip?: string;
  isQudefenseVerified?: boolean;
  documentProcessStages?: string;
};

export enum DocumentTypeEnum {
  MEDICAL = 'Medical',
  BILLING = 'Billing',
}

export const DOC_TYPES = [
  DocumentTypeEnum.MEDICAL,
  DocumentTypeEnum.BILLING,
] as const;
export type DocumentType = (typeof DOC_TYPES)[number];

export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '5 MB';
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(1)} MB`;
};

export const getDocumentType = (file: CaseFile): DocumentType => {
  if (file.chip === DocumentTypeEnum.BILLING || file.chip === DocumentTypeEnum.MEDICAL) {
    return file.chip;
  }

  const isBilling =
    file.documentProcessStages?.toLowerCase().includes('billing') ||
    file.mimeType?.toLowerCase().includes('billing');

  return isBilling ? DocumentTypeEnum.BILLING : DocumentTypeEnum.MEDICAL;
};

export const getFileName = (file: CaseFile): string =>
  file.fileName || file.name || 'Unnamed Document';
