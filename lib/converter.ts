import {
	decorateError,
	decorateErrorMeta,
	isCoreTypesError,
	NamedType,
	NodeDocument,
	simplify,
	WarnFunction,
	ConversionResult as CoreTypesConversionResult,
} from 'core-types'

import type { Reader, ReaderOptions } from './reader'
import type { Shortcut, Writer, WriterOptions } from './writer'
import type { Source } from './file'
import { getSource, writeFile, relFile } from './file'
import { formatError } from './error'


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

	async function convert( from: Source, to?: Target )
	: Promise< ConversionResult< void | string > >
	{
		const { data, filename } = await getSource( from );

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

		const convertShortcut = async ( ) =>
		{
			const convertedTypes: Array< string > = [ ];
			const notConvertedTypes: Array< string > = [ ];

			const shortcut = writer.shortcut?.[ reader.kind ] as Shortcut;
			const {
				data: output,
				convertedTypes: outConvertedTypes,
				notConvertedTypes: outNotConvertedTypes,
			} = await shortcut( data, readOpts, writeOpts, reader );

			return {
				output,
				convertedTypes,
				notConvertedTypes,
				outConvertedTypes,
				outNotConvertedTypes,
			};
		};

		const convertDefault = async ( ) =>
		{
			const { data: doc, convertedTypes, notConvertedTypes } =
				await reader.read( data, readOpts );

			const simplifiedDoc =
				options?.simplify === false
				? doc
				: simplify( doc );

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
				( shortcut && writer.shortcut?.[ reader.kind ] )
				? await convertShortcut( )
				: await convertDefault( );

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

	return { convert: convert as Converter[ 'convert' ], cwd };
}
