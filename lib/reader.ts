import type { NodeDocument, WarnFunction, ConversionResult } from "core-types"
import type { SyncOrAsync, TypeImplementation } from "./types"


export interface ReaderOptions
{
	warn: WarnFunction;
	filename?: string;
}

export type ReaderFunction = ( data: string, opts: ReaderOptions ) =>
	SyncOrAsync< ConversionResult< NodeDocument > >;

export interface Reader
{
	kind: TypeImplementation;
	read: ReaderFunction;
}
