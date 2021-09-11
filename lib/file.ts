import { promises as fsPromises } from 'fs'
import * as path from 'path'
import * as globby from 'globby'
import { bold } from 'chalk'
import * as terminalLink from "terminal-link"


export interface SourceFile
{
	cwd: string;
	filename: string;
}

export interface SourceString
{
	data: string;
}

export type Source = SourceFile | SourceString;

export interface SourceData
{
	data: string;
	filename?: string;
}

export async function getSource( source: Source ): Promise< SourceData >
{
	if ( ( source as SourceString ).data )
		return {
			data: ( source as SourceString ).data,
		};

	else if ( ( source as SourceFile ).filename && fsPromises.readFile )
		return {
			data: await fsPromises.readFile(
				( source as SourceFile ).filename,
				'utf-8'
			),
			filename: ( source as SourceFile ).filename,
		};

	throw new Error( "Invalid source: " + JSON.stringify( source ) );
}

export async function writeFile( filename: string, data: string )
: Promise< void >
{
	const tryWrite = ( ) => fsPromises.writeFile( filename, data );
	try
	{
		await tryWrite( );
	}
	catch ( err: any )
	{
		if ( err?.code === 'ENOENT' )
		{
			await fsPromises.mkdir(
				path.dirname( filename ),
				{ recursive: true }
			);
			await tryWrite( );
		}
	}
}

export function relFile( from: string | undefined, to: string ): string
{
	if ( typeof from === 'undefined' )
		return to;
	return path.relative( from, to );
}

export async function glob(
	globs: Array< string >,
	cwd: string,
	hidden = true
)
{
	const patterns = hidden ? [ ...globs, '!.git' ] : globs;
	const dot = !hidden;
	const gitignore = hidden;
	return globby( patterns, { cwd, dot, gitignore } );
}

export function ensureAbsolute( filename: string, cwd: string )
{
	return path.isAbsolute( filename )
	? filename
	: path.normalize( path.join( cwd, filename ) );
}

/**
 * Find the deepest common directory of a set of files.
 */
export function getRootFolderOfFiles( files: Array< string >, cwd: string )
: string
{
	const map: any = { };
	const last = new WeakMap< object, string >( );

	files
	.map( filename => ensureAbsolute( filename, cwd ) )
	.map( filename => path.dirname( filename ) )
	.forEach( dirname =>
	{
		const dirSegments = dirname.split( path.sep );
		let cur = map;
		dirSegments.forEach( segment =>
		{
			cur[ segment ] ??= { };
			cur = cur[ segment ];
		} );
		last.set( cur, dirname );
	} );

	let curPath = [ ];
	let cur = map;
	while ( true )
	{
		const keys = Object.getOwnPropertyNames( cur );
		if ( keys.length !== 1 )
			return curPath.join( path.sep );
		else if ( last.has( cur ) )
			return last.get( cur ) as string;
		cur = cur[ keys[ 0 ] ];
		curPath.push( keys[ 0 ] );
	}
}

/**
 * Get the common "root" directory of files, their relative path to this
 * directory, and their relative path to new root directory.
 */
export function reRootFiles(
	files: Array< string >,
	cwd: string,
	newRoot?: string
)
: {
	root: string;
	newRoot: string;
	files: Array< { in: string; out: string; rel: string; } >;
}
{
	const root = getRootFolderOfFiles( files, cwd );

	const newAbsRoot = typeof newRoot === 'undefined'
		? root
		: ensureAbsolute( newRoot, cwd );

	return {
		root,
		newRoot: newAbsRoot,
		files: files
			.map( filename => ensureAbsolute( filename, cwd ) )
			.map( filename =>
			{
				const rel = path.relative( root, filename );
				const out = ensureAbsolute( rel, newAbsRoot );
				return { in: filename, out, rel };
			} ),
	};
}

export function prettyFile( filename: string, cwd: string )
{
	const absFile = 'file://' + ensureAbsolute( filename, cwd );
	const baseName = path.basename( filename );
	const dirName = path.dirname( filename );

	const name =
		( ( dirName && dirName !== '.' ) ? ( dirName + path.sep ) : '' ) +
		bold( baseName );

	return terminalLink( name, absFile, { fallback: false } );
}
