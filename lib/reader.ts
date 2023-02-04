import type { NodeDocument, WarnFunction, ConversionResult } from "core-types"

import type { SyncOrAsync, TypeImplementation } from "./types.js"


export interface ReaderOptions
{
	warn: WarnFunction;
	filename?: string;
}

export type ReaderFunction = ( data: string, opts: ReaderOptions ) =>
	SyncOrAsync< ConversionResult< NodeDocument > >;

export type ShortcutReaderFunction = ( data: string, opts: ReaderOptions ) =>
	SyncOrAsync< ConversionResult< string > >;

export interface Reader
{
	kind: TypeImplementation;
	read: ReaderFunction;
	managedRead?: boolean;
	shortcut?: Partial< Record< TypeImplementation, ShortcutReaderFunction > >;
}
