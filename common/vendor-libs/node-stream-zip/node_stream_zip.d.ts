/// <reference types="node" />

declare namespace StreamZip {
  interface StreamZipOptions {
    /**
     * File to read
     * @default undefined
     */
    file?: string;

    /**
     * Alternatively, you can pass fd here
     * @default undefined
     */
    fd?: number;

    /**
     * You will be able to work with entries inside zip archive,
     * otherwise the only way to access them is entry event
     * @default true
     */
    storeEntries?: boolean;

    /**
     * By default, entry name is checked for malicious characters, like ../ or c:\123,
     * pass this flag to disable validation error
     * @default false
     */
    skipEntryNameValidation?: boolean;

    /**
     * Filesystem read chunk size
     * @default automatic based on file size
     */
    chunkSize?: number;
  }

  interface ZipEntry {
    /**
     * file name
     */
    name: string;

    /**
     * true if it's a directory entry
     */
    isDirectory: boolean;

    /**
     * true if it's a file entry, see also isDirectory
     */
    isFile: boolean;

    /**
     * file comment
     */
    comment: string;

    /**
     * if the file is encrypted
     */
    encrypted: boolean;

    /**
     * version made by
     */
    verMade: number;

    /**
     * version needed to extract
     */
    version: number;

    /**
     * encrypt, decrypt flags
     */
    flags: number;

    /**
     * compression method
     */
    method: number;

    /**
     * modification time
     */
    time: number;

    /**
     * uncompressed file crc-32 value
     */
    crc: number;

    /**
     * compressed size
     */
    compressedSize: number;

    /**
     * uncompressed size
     */
    size: number;

    /**
     * volume number start
     */
    diskStart: number;

    /**
     * internal file attributes
     */
    inattr: number;

    /**
     * external file attributes
     */
    attr: number;

    /**
     * LOC header offset
     */
    offset: number;
  }

  class StreamZipAsync {
    public constructor(config: StreamZipOptions);

    public entriesCount: Promise<number>;
    public comment: Promise<string>;

    public entry(name: string): Promise<ZipEntry | undefined>;
    public entries(): Promise<{ [name: string]: ZipEntry }>;
    public entryData(entry: string | ZipEntry): Promise<Buffer>;
    public stream(entry: string | ZipEntry): Promise<NodeJS.ReadableStream>;
    public extract(entry: string | ZipEntry | null, outPath: string): Promise<number | undefined>;

    public on(event: 'entry', handler: (entry: ZipEntry) => void): void;
    public on(event: 'extract', handler: (entry: ZipEntry, outPath: string) => void): void;

    public close(): Promise<void>;
  }
}

type StreamZipOptions = StreamZip.StreamZipOptions;
type ZipEntry = StreamZip.ZipEntry;

declare class StreamZip {
  public constructor(config: StreamZipOptions);

  /**
   * number of entries in the archive
   */
  public entriesCount: number;

  /**
   * archive comment
   */
  public comment: string;

  public on(event: 'error', handler: (error: unknown) => void): void;
  public on(event: 'entry', handler: (entry: ZipEntry) => void): void;
  public on(event: 'ready', handler: () => void): void;
  public on(event: 'extract', handler: (entry: ZipEntry, outPath: string) => void): void;

  public entry(name: string): ZipEntry | undefined;

  public entries(): { [name: string]: ZipEntry };

  public stream(
    entry: string | ZipEntry,
    callback: (err: unknown | null, stream?: NodeJS.ReadableStream) => void,
  ): void;

  public entryDataSync(entry: string | ZipEntry): Buffer;

  public openEntry(
    entry: string | ZipEntry,
    callback: (err: unknown | null, entry?: ZipEntry) => void,
    sync: boolean,
  ): void;

  public extract(
    entry: string | ZipEntry | null,
    outPath: string,
    callback: (err?: unknown, res?: number) => void,
  ): void;

  public close(callback?: (err?: unknown) => void): void;

  public static async: typeof StreamZip.StreamZipAsync;
}

export default StreamZip;
