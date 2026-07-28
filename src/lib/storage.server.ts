import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

export interface StorageDriver {
  put(
    fileName: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ storageKey: string; publicUrl: string }>;
  delete(storageKey: string): Promise<void>;
}

class LocalDriver implements StorageDriver {
  private uploadDir: string;

  constructor() {
    this.uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
  }

  private async ensureDir() {
    await fs.mkdir(this.uploadDir, { recursive: true });
  }

  async put(
    fileName: string,
    buffer: Buffer,
    _mimeType: string,
  ): Promise<{ storageKey: string; publicUrl: string }> {
    await this.ensureDir();
    const ext = path.extname(fileName);
    const baseName = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const uniqueKey = `${Date.now()}_${baseName}${ext}`;
    const filePath = path.join(this.uploadDir, uniqueKey);

    await fs.writeFile(filePath, buffer);

    const publicPrefix = process.env.PUBLIC_UPLOAD_PREFIX || "/uploads";
    return {
      storageKey: uniqueKey,
      publicUrl: `${publicPrefix}/${uniqueKey}`,
    };
  }

  async delete(storageKey: string): Promise<void> {
    const filePath = path.join(this.uploadDir, storageKey);
    try {
      await fs.unlink(filePath);
    } catch {
      // Ignorar se arquivo já não existir
    }
  }
}

class S3Driver implements StorageDriver {
  async put(
    _fileName: string,
    _buffer: Buffer,
    _mimeType: string,
  ): Promise<{ storageKey: string; publicUrl: string }> {
    if (!process.env.S3_BUCKET || !process.env.S3_ACCESS_KEY) {
      throw new Error("Credenciais S3 não configuradas.");
    }
    // Suporte futuro a S3 via AWS SDK ou compatível (MinIO/R2)
    throw new Error("S3 Driver ainda não inicializado com SDK S3.");
  }

  async delete(_storageKey: string): Promise<void> {
    // Exclusão remota S3
  }
}

const driverType = process.env.STORAGE_DRIVER?.toLowerCase() || "local";
export const storage: StorageDriver = driverType === "s3" ? new S3Driver() : new LocalDriver();
