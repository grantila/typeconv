import * as path from 'path'

import { map } from "already"
import { hex, gray } from "chalk"

import { Converter, Target } from "./converter"
import { glob, reRootFiles, prettyFile } from './file'

export interface BatchConvertOptions
{
	outputDirectory?: string;
	outputExtension: string;
	verbose?: boolean;
	dryRun?: boolean;
	concurrency?: number;
}

export interface BatchConvertGlobOptions extends BatchConvertOptions
{
	hidden?: boolean;
	filesTransform?: ( files: Array< string > ) => Array< string >;
}

export interface BatchConvertResult
{
	files: number;
	types: number;
}

export async function batchConvert(
	converter: Converter,
	filenames: Array< string >,
	options: BatchConvertOptions
)
: Promise< BatchConvertResult >
{
	const {
		outputExtension,
		verbose,
		dryRun,
		// Not really CPU concurrency in this case, but enough I/O concurrency
		// to always have files prepared/read/written for CPU-bound conversion.
		// Set to 1 for deterministic unit tests.
		concurrency = 16
	} = options;

	const { cwd, convert } = converter;

	const { root, newRoot, files } =
		reRootFiles( filenames, cwd, options.outputDirectory );

	if ( verbose )
	{
		console.error( `Converting files relative to ${root}` );
		if ( newRoot !== root )
			console.error( `Storing files in ${newRoot}` );
	}

	const firstOverwritten = files.find( file => file.in === file.out );
	if ( outputExtension !== '-' && firstOverwritten )
		throw new Error(
			"Won't convert - would overwrite source file with target file: " +
			firstOverwritten.out
		);

	let convertedTypes = 0;

	await map(
		files,
		{ concurrency },
		async ( { in: filename, out: outFilename, rel } ) =>
		{
			const to: Target =
				( dryRun || outputExtension === '-' )
				? undefined as unknown as Target
				: {
					filename: changeExtension( outFilename, outputExtension ),
					relFilename: changeExtension( rel, outputExtension ),
				};

			const { data, ...info } = await convert( { filename, cwd }, to );

			convertedTypes += info.out.convertedTypes.length;

			if ( verbose )
			{
				const outputRel = changeExtension( rel, outputExtension );
				const outName = outputExtension === '-' ? 'stdout' : outputRel;

				const allInputTypes =
					info.in.convertedTypes.length +
					info.in.notConvertedTypes.length;
				const notConverted =
					info.in.notConvertedTypes.length +
					info.out.notConvertedTypes.length;
				const converted = info.out.convertedTypes.length;
				const percent =
					allInputTypes === 0
					? 'no'
					: `${Math.round( converted * 100 / allInputTypes )}%`;

				const prefixText = '[typeconv]';
				const prefix =
					allInputTypes === 0
					? gray( prefixText )
					: notConverted
					? hex( '#D2D200' )( prefixText )
					: hex( '#00D21F' )( prefixText );

				console.error(
					`${prefix} ${prettyFile( rel, root )} -> ` +
					`${prettyFile( outName, newRoot )}, ${percent} types ` +
					`converted (${converted}/${allInputTypes})` +
					( !notConverted ? '' : `, ${notConverted} rejected` )
				);
			}

			if ( outputExtension === '-' && !dryRun )
				console.log( data );
		}
	);

	return {
		types: convertedTypes,
		files: files.length,
	}
}

export async function batchConvertGlob(
	converter: Converter,
	globs: Array< string >,
	options: BatchConvertGlobOptions
)
: Promise< BatchConvertResult >
{
	const { hidden, filesTransform = v => v } = options;
	const { cwd } = converter;
	const files = await glob( globs, cwd, hidden );
	return batchConvert( converter, filesTransform( files ), options );
}

function changeExtension( filename: string, extension: string )
{
	extension = extension.startsWith( '.' ) ? extension : `.${extension}`;

	return path.join(
		path.dirname( filename ),
		path.basename( filename, path.extname( filename ) ) + extension
	);
}
