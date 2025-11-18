export interface ArchiveMetadata {
  sourceTable: string;
  recordCount: number;
  timestamp: Date;
  ruleName: string;
}

export interface IStorageAdapter {
  archive(data: unknown[], metadata: ArchiveMetadata): Promise<string>;
  retrieve(archiveId: string): Promise<unknown[]>;
  list(): Promise<ArchiveMetadata[]>;
  delete(archiveId: string): Promise<void>;
}

// In-memory stub implementation
export class InMemoryStorageAdapter implements IStorageAdapter {
  private archives: Map<string, { data: unknown[]; metadata: ArchiveMetadata }> = new Map();

  async archive(data: unknown[], metadata: ArchiveMetadata): Promise<string> {
    const archiveId = `archive_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.archives.set(archiveId, { data, metadata });
    console.log(`[Storage] Archived ${data.length} records with ID: ${archiveId}`);
    return archiveId;
  }

  async retrieve(archiveId: string): Promise<unknown[]> {
    const archive = this.archives.get(archiveId);
    if (!archive) throw new Error(`Archive not found: ${archiveId}`);
    return archive.data;
  }

  async list(): Promise<ArchiveMetadata[]> {
    return Array.from(this.archives.values()).map((a) => a.metadata);
  }

  async delete(archiveId: string): Promise<void> {
    this.archives.delete(archiveId);
  }

  clear() {
    this.archives.clear();
  }
}

// S3 adapter stub
export class S3StorageAdapter implements IStorageAdapter {
  constructor(
    private config: {
      bucket: string;
      region: string;
      accessKeyId?: string;
      secretAccessKey?: string;
    }
  ) {}

  async archive(data: unknown[], metadata: ArchiveMetadata): Promise<string> {
    const archiveId = `archive_${Date.now()}`;
    console.log(`[S3] Would upload to s3://${this.config.bucket}/${archiveId}.json`);
    // In production, use AWS SDK to upload to S3
    return archiveId;
  }

  async retrieve(archiveId: string): Promise<unknown[]> {
    console.log(`[S3] Would retrieve from s3://${this.config.bucket}/${archiveId}.json`);
    return [];
  }

  async list(): Promise<ArchiveMetadata[]> {
    console.log(`[S3] Would list objects in s3://${this.config.bucket}`);
    return [];
  }

  async delete(archiveId: string): Promise<void> {
    console.log(`[S3] Would delete s3://${this.config.bucket}/${archiveId}.json`);
  }
}
