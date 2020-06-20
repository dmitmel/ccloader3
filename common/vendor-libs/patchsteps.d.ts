export const version: string;

export type Patch = PatchStep[] | Record<string, unknown>;

export type Index = string | number;

export type PatchStep = { comment?: string } & unknown;
export namespace PatchStep {
  export interface ENTER {
    type: 'ENTER';
    index: Index | Index[];
  }

  export interface EXIT {
    type: 'EXIT';
    count?: number;
  }

  export interface SET_KEY {
    type: 'SET_KEY';
    index: Index;
    content?: unknown;
  }

  export interface INIT_KEY {
    type: 'INIT_KEY';
    index: Index;
    content: unknown;
  }

  export interface REMOVE_ARRAY_ELEMENT {
    type: 'REMOVE_ARRAY_ELEMENT';
    index: number;
  }

  export interface ADD_ARRAY_ELEMENT {
    type: 'ADD_ARRAY_ELEMENT';
    index?: number;
    content: unknown;
  }

  export interface IMPORT {
    type: 'IMPORT';
    src: string;
    path?: Index[];
    index?: Index;
  }

  export interface PatchStepInclude {
    type: 'INCLUDE';
    src: string;
  }

  export interface FOR_IN {
    type: 'FOR_IN';
    values: Array<string | Record<string, string>>;
    keyword: string | Record<string, string>;
    body: PatchStep[];
  }

  export interface COPY {
    type: 'COPY';
    alias: string;
  }

  export interface PatchStepPaste {
    type: 'PASTE';
    alias: string;
    index?: Index;
  }

  export interface PatchStepComment {
    type: 'COMMENT';
    value: unknown;
  }

  export interface PatchStepDebug {
    type: 'DEBUG';
    value: boolean;
  }
}

export function photomerge<A = unknown, B = unknown>(a: A, b: B): A & B;
export function photocopy<O = unknown>(o: O): O;

export function diff(a: unknown, b: unknown, settings: Partial<DiffSettings>): PatchStep[] | null;

export interface DiffSettings {
  arrayTrulyDifferentThreshold: number;
  trulyDifferentThreshold: number;
  arrayLookahead: number;
  diffAddNewKey: number;
  diffAddDelKey: number;
  diffMulSameKey: number;

  diffCore: DiffCore;
  comment?: string;
  commentValue?: string;
  path: Index[];
  optimize: boolean;
}

export type DiffCore = (a: unknown, b: unknown, settings: DiffSettings) => PatchStep[] | null;

export function diffApplyComment(step: PatchStep, settings: DiffSettings): PatchStep;

export function diffEnterLevel(
  a: unknown,
  b: unknown,
  index: Index,
  settings: DiffSettings,
): PatchStep[] | null;

export type ParsedPath = null | [/* fromGame */ boolean | string, /* url */ string];

export interface FileInfo {
  path: string;
  stack: StackEntry[];
}

export type StackEntry = StackEntry.Step | StackEntry.Error;
export namespace StackEntry {
  export interface Step {
    type: 'Step';
    index: Index;
    name: string;
  }

  export interface Error {
    type: 'Error';
    errorType: string;
    errorMessage: string;
  }
}

export class DebugState {
  public fileStack: Array<FileInfo | null>;
  public currentFile: FileInfo | null;

  public translateParsedPath(parsedPath: ParsedPath): string;
  /** @final */
  public addFile(parsedPath: ParsedPath): void;
  /** @final */
  public removeLastFile(): FileInfo;
  /** @final */
  public addStep(index: Index, name?: string): void;
  /** @final */
  public removeLastStep(): FileInfo;
  /** @final */
  public getLastStep(): StackEntry.Step;
  /** @final */
  public throwError(type: string, message: string): void;
  public printFileInfo(file: FileInfo): void;
  /** @final */
  public print(): void;
  public beforeStep(): Promise<void>;
  public afterStep(): Promise<void>;
}

export const appliers: Record<string, Applier>;

export type Applier = (this: StackEntry.Step, state: ApplierState) => Promise<void>;

export interface ApplierState {
  currentValue: unknown;
  stack: StackEntry[];
  cloneMap: Map<string, unknown>;
  loader: Loader;
  debugState: DebugState;
  debug: boolean;
}

export function patch(
  a: unknown,
  steps: Patch,
  loader: Loader,
  debugState?: DebugState,
): Promise<void>;

type Loader = (fromGame: boolean | string, path: string) => Promise<unknown>;
