import type { NodeDocument, WarnFunction, ConversionResult } from "core-types"

import type { SyncOrAsync, TypeImplementation } from "./types.js"
import type { Reader } from "./reader.js"


export interface WriterOptions
{
	warn: WarnFunction;
	sourceFilename?: string;
	filename?: string;
	rawInput?: string;
}

export type WriterFunction =
	( doc: NodeDocument, opts: WriterOptions ) =>
		SyncOrAsync< ConversionResult< string > >;

export type Shortcut =
	(
		data: string,
		writeOpts: WriterOptions,
		reader: Reader
	) =>
		SyncOrAsync< ConversionResult< string > >;

export interface Writer
{
	kind: TypeImplementation;
	write: WriterFunction;
	shortcut?: Partial< Record< TypeImplementation, Shortcut > >;
}
