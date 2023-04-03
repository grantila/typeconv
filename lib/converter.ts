import {
	decorateError,
	decorateErrorMeta,
	isCoreTypesError,
	NamedType,
	NodeDocument,
	simplify,
	WarnFunction,
	ConversionResult as CoreTypesConversionResult,
} from "core-types"

import type { Reader, ReaderOptions } from "./reader.js"
import type { Writer, WriterOptions } from "./writer.js"
import type { Source, SourceFile } from "./file.js"
import { getSource, writeFile, relFile } from "./file.js"
import { formatError } from "./error.js"
import { ConversionContext } from "./format-graph.js"
import { TypeImplementation } from "./types.js"


export interface Target
{
	filename: string;
	relFilename?: string;
}

export interface ConversionResultInformation
{
	in: Omit< CoreTypesConversionResult, 'data' >;
	out: Omit< CoreTypesConversionResult, 'data' >;
}

export type ConversionResult< T > = ConversionResultInformation & { data: T };

export interface Converter
{
	/**
	 * Convert and save to file
	 */
	convert( from: Source, to: Target ): Promise< ConversionResult< void > >;

	/**
	 * Convert and return result as string
	 */
	convert( from: Source ): Promise< ConversionResult< string > >;

	/**
	 * The current working directory for this converter
	 */
	cwd: string;

	/**
	 * From format
	 */
	fromFormat: TypeImplementation;
}

export type ConvertMapFunction =
	( node: NamedType, index: number, array: ReadonlyArray< NamedType > ) =>
		NamedType;
export type ConvertFilterFunction =
	( node: NamedType, index: number, array: ReadonlyArray< NamedType > ) =>
		boolean;
export type ConvertTransformFunction = ( doc: NodeDocument ) => NodeDocument;

export interface ConvertOptions
{
	/**
	 * The current working directory to use when converting to or from files.
	 * Is not necessary for string-to-string conversion.
	 */
	cwd?: string;

	/**
	 * When simplify is true, the converter will let core-types _compress_ the
	 * types after having converted from {reader} format to core-types.
	 * This is usually recommended, but may cause some annotations (comments)
	 * to be dropped.
	 *
	 * @default
	 * 	true
	 */
	simplify?: boolean;

	/**
	 * When simplifying (which is implied by this option), and-types of objects
	 * will be merged into one self-contained object.
	 * This is useful for type systems that don't treat object intersections the
	 * same way e.g. TypeScript does.
	 */
	mergeObjects?: boolean;

	/**
	 * Custom map function for transforming each type after it has been
	 * converted *from* the source type (and after it has been simplified),
	 * but before it's written to the target type system.
	 *
	 * If `filter` is used as well, this runs before `filter`.
	 * If `transform` is used as well, this runs before `transform`.
	 */
	map?: ConvertMapFunction;

	/**
	 * Custom filter function for filtering types after they have been
	 * converted *from* the source type.
	 *
	 * If `map` is used as well, this runs after `map`.
	 * If `transform` is used as well, this runs before `transform`.
	 */
	filter?: ConvertFilterFunction;

	/**
	 * Custom filter function for filtering types after they have been
	 * converted *from* the source type.
	 *
	 * If `map` is used as well, this runs after `map`.
	 * If `filter` is used as well, this runs after `filter`.
	 */
	transform?: ConvertTransformFunction;

	/**
	 * Shortcut reader and writer if possible (bypassing core-types).
	 *
	 * @default
	 *  true
	 */
	shortcut?: boolean;
}

interface ReadSourceManaged
{
	data?: undefined;
	filename: string;
}

interface ReadSourceNormal
{
	data: string;
	filename?: string;
}

type ReadSource = ReadSourceManaged | ReadSourceNormal;

async function readSource( from: Source, reader: Reader )
: Promise< ReadSource >
{
	if ( reader.managedRead )
	{
		const { filename } = from as SourceFile;
		if ( !filename )
			throw new Error( "Internal error, expected filename not data" );
		return { filename };
	}

	return await getSource( from );
}

interface SingleConversionResult
{
	output: string;
	convertedTypes: Array< string >;
	notConvertedTypes: Array< string >;
	outConvertedTypes: Array< string >;
	outNotConvertedTypes: Array< string >;
}

async function convertAny(
	data: string,
	reader: Reader,
	writer: Writer,
	format: TypeImplementation,
	readOpts: ReaderOptions,
	writeOpts: WriterOptions
)
: Promise< SingleConversionResult >
{
	if ( format === 'ct' )
	{
		const read = await reader.read( data, readOpts );

		const written = await writer.write( read.data, writeOpts );

		return {
			output: written.data,
			convertedTypes: read.convertedTypes,
			notConvertedTypes: read.notConvertedTypes,
			outConvertedTypes: written.convertedTypes,
			outNotConvertedTypes: written.notConvertedTypes,
		};
	}
	else
	{
		const read = await reader.shortcut![format]!( data, readOpts );

		const written =
			await writer.shortcut![format]!( read.data, writeOpts, reader );

		return {
			output: written.data,
			convertedTypes: read.convertedTypes,
			notConvertedTypes: read.notConvertedTypes,
			outConvertedTypes: written.convertedTypes,
			outNotConvertedTypes: written.notConvertedTypes,
		};
	}
}

export function makeConverter(
	reader: Reader,
	writer: Writer,
	options?: ConvertOptions
)
: Converter
{
	const { shortcut = true, cwd = process.cwd( ) } = options ?? { };

	const relFilename = ( filename: string ) =>
		relFile( options?.cwd, filename );

	const context = new ConversionContext( reader, writer, { shortcut } );
	const conversionPath = context.getPath( );
	const simpleSingleConversion =
		conversionPath.length === 1 && conversionPath[ 0 ].format === 'ct';

	async function convert( from: Source, to?: Target )
	: Promise< ConversionResult< void | string > >
	{
		const { data, filename } = await readSource( from, reader );
		const dataOrFilename = ( data ?? filename )!;

		const warn: WarnFunction = ( msg, meta ) =>
		{
			const fullMeta = decorateErrorMeta(
				{ ...meta },
				{ filename, source: data }
			);
			console.warn( formatError( msg, fullMeta ) );
		}

		const toFilename =
			to?.relFilename ?? relFilename( to?.filename ?? '' );

		const readOpts: ReaderOptions = {
			warn,
			filename: filename ? relFilename( filename ) : undefined,
		};

		const writeOpts: WriterOptions = {
			warn,
			...(
				to
				? { filename: toFilename }
				: { }
			),
			...(
				filename
				? { sourceFilename: relFilename( filename ) }
				: { }
			),
			rawInput: data,
		};

		const convertByGraphPath = async ( data: string, pathIndex: number )
			: Promise< SingleConversionResult > =>
		{
			const { reader, writer, format } = conversionPath[ pathIndex ];

			const result = await convertAny(
				data,
				reader,
				writer,
				format,
				readOpts,
				writeOpts
			);

			const uniqAppend = ( a: Array< string >, b: Array< string > ) =>
				[ ...new Set( a ), ...new Set( b ) ];

			if ( conversionPath.length > pathIndex + 1 )
			{
				// Recurse - follow path and convert again
				const recursionResult =
					await convertByGraphPath( result.output, pathIndex + 1 );

				return {
					output: recursionResult.output,
					convertedTypes: recursionResult.convertedTypes,
					notConvertedTypes: uniqAppend(
						result.notConvertedTypes,
						recursionResult.notConvertedTypes
					),
					outConvertedTypes: recursionResult.convertedTypes,
					outNotConvertedTypes: uniqAppend(
						result.outNotConvertedTypes,
						recursionResult.outNotConvertedTypes
					),
				};
			}
			else
			{
				return result;
			}
		};

		const convertDefault = async ( ) =>
		{
			const { data: doc, convertedTypes, notConvertedTypes } =
				await reader.read( dataOrFilename, readOpts );

			const simplifiedDoc =
				options?.simplify === false
				? doc
				: simplify( doc, { mergeObjects: options?.mergeObjects } );

			const { map, filter, transform } = options ?? { };

			const mappedDoc =
				typeof map === 'function'
				? {
					...simplifiedDoc,
					types: doc.types.map( ( type, index ) =>
						map( type, index, doc.types )
					),
				}
				: simplifiedDoc;

			const filteredDoc =
				typeof filter === 'function'
				? {
					...mappedDoc,
					types: doc.types.filter( ( type, index ) =>
						filter( type, index, doc.types )
					),
				}
				: mappedDoc;

			const finalDoc =
				typeof transform === 'function'
				? transform( filteredDoc )
				: filteredDoc;

			const {
				data: output,
				convertedTypes: outConvertedTypes,
				notConvertedTypes: outNotConvertedTypes
			} = await writer.write( finalDoc, writeOpts );

			return {
				output,
				convertedTypes,
				notConvertedTypes,
				outConvertedTypes,
				outNotConvertedTypes,
			};
		};

		try
		{
			const {
				output,
				convertedTypes,
				notConvertedTypes,
				outConvertedTypes,
				outNotConvertedTypes,
			} =
				simpleSingleConversion
				? await convertDefault( )
				: await convertByGraphPath( dataOrFilename, 0 );

			const info: ConversionResultInformation = {
				in: { convertedTypes, notConvertedTypes },
				out: {
					convertedTypes: outConvertedTypes,
					notConvertedTypes: outNotConvertedTypes,
				},
			}

			if ( typeof to?.filename === 'undefined' )
				return { data: output, ...info } as ConversionResult< string >;

			// Only write non-empty files
			if ( outConvertedTypes.length > 0 )
				await writeFile( to?.filename, output );

			return info as ConversionResult< void >;
		}
		catch ( err )
		{
			if ( isCoreTypesError( err ) )
				decorateError( err, {
					source: data,
					...( filename ? { filename } : { } ),
				} );
			throw err;
		}
	}

	const fromFormat = reader.kind;
	return { convert: convert as Converter[ 'convert' ], cwd, fromFormat };
}
