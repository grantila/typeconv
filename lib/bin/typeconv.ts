#!/usr/bin/env node

import { bold } from "chalk"
import { oppa } from "oppa"
import { stripAnnotations } from "core-types"

import { makeConverter } from "../converter"
import { batchConvertGlob } from "../batch-convert"
import { Reader } from "../reader"
import { Writer } from "../writer"
import {
	getJsonSchemaReader,
	getJsonSchemaWriter,
	getOpenApiReader,
	getOpenApiWriter,
} from "../convert-json-schema"
import {
	getGraphQLReader,
	getGraphQLWriter,
} from "../convert-graphql"
import {
	getTypeScriptReader,
	getTypeScriptWriter,
} from "../convert-typescript"
import {
	getCoreTypesReader,
	getCoreTypesWriter,
} from "../convert-core-types"
import {
	getSureTypeReader,
	getSureTypeWriter,
} from "../convert-suretype"
import { ExportRefMethod } from 'suretype'
import { userPackage, userPackageUrl } from "../package"
import { TypeImplementation } from "../types"
import { ensureType } from "../utils"


const implementations: Array< Record< TypeImplementation, string > >
	= [
		{ ts: "TypeScript" } as Record< TypeImplementation, string >,
		{ jsc: "JSON Schema" } as Record< TypeImplementation, string >,
		{ gql: "GraphQL" } as Record< TypeImplementation, string >,
		{ oapi: "Open API" } as Record< TypeImplementation, string >,
		{ st: "SureType" } as Record< TypeImplementation, string >,
		{ ct: "core-types" } as Record< TypeImplementation, string >,
	];

const oppaInstance =
	oppa( {
		version: require( "../../package.json" ).version,
		usage: "typeconv [options] file ...",
		noVersionAlias: true,
	} )
	.add( {
		name: 'verbose',
		alias: 'v',
		type: 'boolean',
		negatable: false,
		description: "Verbose informational output",
		default: false,
	} )
	.add( {
		name: 'dry-run',
		type: 'boolean',
		negatable: false,
		description: "Prepare and perform conversion, but write no output",
		default: false,
	} )
	.add( {
		name: 'hidden',
		type: 'boolean',
		negatable: true,
		description: [
			"Include hidden files, i.e. files in .gitignore,",
			"files beginning with '.' and the '.git' directory",
		],
		default: true,
	} )
	.add( {
		name: 'from-type',
		argumentName: 'type',
		alias: 'f',
		type: 'string',
		description: "Type system to convert from",
		values: implementations,
	} )
	.add( {
		name: 'to-type',
		argumentName: 'type',
		alias: 't',
		type: 'string',
		description: "Type system to convert to",
		values: implementations,
	} )
	.add( {
		name: 'shortcut',
		type: 'boolean',
		description: [
			"Shortcut conversion if possible (bypassing core-types).",
			"This is possible between SureType, JSON Schema and Open API",
			"to preserve all features which would otherwise be erased."
		],
		default: true,
		negatable: true,
	} )
	.add( {
		name: 'output-directory',
		argumentName: 'dir',
		alias: 'o',
		type: 'string',
		description:
			"Output directory. Defaults to the same as the input files.",
	} )
	.add( {
		name: 'output-extension',
		argumentName: 'ext',
		alias: 'O',
		type: 'string',
		description: [
			"Output filename extension to use.",
			"Defaults to 'ts'/'d.ts', 'json', 'yaml' and 'graphql'.",
			"Use '-' to not save a file, but output to stdout instead."
		],
	} )
	.add( {
		name: 'strip-annotations',
		type: 'boolean',
		description: "Removes all annotations (descriptions, comments, ...)",
		default: false,
	} )

	.group( {
		name: "TypeScript",
		backgroundColor: '#0077c8',
		color: '#fff',
	} )
	.add( {
		name: 'ts-declaration',
		type: 'boolean',
		description: "Output TypeScript declarations",
		default: false,
	} )
	.add( {
		name: 'ts-disable-lint-header',
		type: 'boolean',
		description: "Output comments for disabling linting",
		default: true,
	} )
	.add( {
		name: 'ts-descriptive-header',
		type: 'boolean',
		description: "Output the header comment",
		default: true,
	} )
	.add( {
		name: 'ts-use-unknown',
		type: 'boolean',
		description: "Use 'unknown' type instead of 'any'",
		default: true,
	} )

	.group( {
		name: "GraphQL",
		backgroundColor: '#e10098',
		color: '#fff',
	} )
	.add( {
		name: 'gql-unsupported',
		argumentName: 'method',
		type: 'string',
		description: "Method to use for unsupported types",
		values: [
			{ ignore: 'Ignore (skip) type' },
			{ warn: 'Ignore type, but warn' },
			{ error: 'Throw an error' },
		],
	} )
	.add( {
		name: 'gql-null-typename',
		argumentName: 'name',
		type: 'string',
		description: "Custom type name to use for null",
	} )
	.group( {
		name: "Open API",
		backgroundColor: '#85ea2d',
		color: '#222',
	} )
	.add( {
		name: 'oapi-format',
		argumentName: 'fmt',
		type: 'string',
		description: "Output format for Open API",
		values: [
			{ json: "JSON" },
			{ yaml: "YAML ('yml' is also allowed)" },
		],
		default: 'yaml',
	} )
	.add( {
		name: 'oapi-title',
		argumentName: 'title',
		type: 'string',
		description: [
			"Open API title to use in output document.",
			"Defaults to the input filename."
		],
	} )
	.add( {
		name: 'oapi-version',
		argumentName: 'version',
		type: 'string',
		description: "Open API document version to use in output document.",
		default: '1',
	} )
	.group( {
		name: "SureType",
		backgroundColor: '#4f81a0',
		color: '#fff',
	} )
	.add( {
		name: 'st-ref-method',
		argumentName: 'method',
		type: 'string',
		description: "SureType reference export method",
		values: [
			{ "no-refs": "Don't ref anything, inline all types." },
			{ "provided": "Reference types that are explicitly exported" },
			{ "ref-all": "Ref all provided types and those with names" },
		],
		default: 'provided',
	} )
	.add( {
		name: 'st-inline-types',
		type: 'boolean',
		default: true,
		description: "Inline pretty typescript types aside validator code",
	} )
	.add( {
		name: 'st-export-type',
		type: 'boolean',
		description: [
			"Export the deduced types (or the pretty types,",
			"depending on --st-inline-types)",
		],
		default: true,
	} )
	.add( {
		name: 'st-export-schema',
		type: 'boolean',
		description: "Export validator schemas",
		default: false,
	} )
	.add( {
		name: 'st-export-validator',
		type: 'boolean',
		description: "Export regular validators",
		default: true,
	} )
	.add( {
		name: 'st-export-ensurer',
		type: 'boolean',
		description: "Export 'ensurer' validators",
		default: true,
	} )
	.add( {
		name: 'st-export-type-guard',
		type: 'boolean',
		description: "Export type guards (is* validators)",
		default: true,
	} )
	.add( {
		name: 'st-use-unknown',
		type: 'boolean',
		description: "Use 'unknown' type instead of 'any'",
		default: true,
	} )
	.add( {
		name: 'st-forward-schema',
		type: 'boolean',
		description: [
			"Forward the JSON Schema, and create an untyped validator schema",
			"with the raw JSON Schema under the hood",
		],
		default: false,
	} );

const result = oppaInstance.parse( );

const printHelp = ( ) => oppaInstance.showHelp( true );

const { args, rest: globFiles } = result;

const {
	verbose,
	"dry-run": dryRun,
	hidden,
	"from-type": fromType,
	"to-type": toType,
	shortcut,
	"output-directory": outputDirectory,
	"output-extension": outputExtension,
	"strip-annotations": doStripAnnotations,

	// TypeScript
	"ts-declaration": tsDeclaration,
	"ts-disable-lint-header": tsDisableLintHeader,
	"ts-descriptive-header": tsDescriptiveHeader,
	"ts-use-unknown": tsUseUnknown,

	// JSON Schema

	// GraphQL
	"gql-unsupported": gqlUnsupported,
	"gql-null-typename": gqlNullTypename,

	// Open API
	"oapi-format": oapiFormat,
	"oapi-title": oapiTitle,
	"oapi-version": oapiVersion,

	// suretype
	"st-ref-method": stRefMethod,
	"st-inline-types": stInlineTypes,
	"st-export-type": stExportType,
	"st-export-schema": stExportSchema,
	"st-export-validator": stExportValidator,
	"st-export-ensurer": stExportEnsurer,
	"st-export-type-guard": stExportTypeGuard,
	"st-use-unknown": stUseUnknown,
	"st-forward-schema": stForwardSchema,
} = args;

const typeImplementations = implementations.map( obj =>
	Object.keys( obj )[ 0 ] as TypeImplementation
);

if ( !ensureType< TypeImplementation >(
	fromType,
	'type system identifyer',
	typeImplementations,
	printHelp
) )
	throw new Error( );

if ( !ensureType< TypeImplementation >(
	toType,
	'type system identifyer',
	typeImplementations,
	printHelp
) )
	throw new Error( );

if ( !ensureType< ExportRefMethod | undefined >(
	stRefMethod,
	'ref-method',
	[  'no-refs', 'provided', 'ref-all', undefined ],
	printHelp
) )
	throw new Error( );

const getReader = ( ): Reader =>
{
	return fromType === 'ts'
		? getTypeScriptReader( )
		: fromType === 'jsc'
		? getJsonSchemaReader( )
		: fromType === 'oapi'
		? getOpenApiReader( )
		: fromType === 'gql'
		? getGraphQLReader( {
			unsupported: gqlUnsupported as 'ignore' | 'warn' | 'error',
		} )
		: fromType === 'st'
		? getSureTypeReader( {
			refMethod: stRefMethod,
			nameConflict: 'error',
		} )
		: getCoreTypesReader( );
}

const getWriter = ( ): Writer =>
{
	return toType === 'ts'
		? getTypeScriptWriter( {
			userPackage,
			userPackageUrl,
			declaration: tsDeclaration,
			noDisableLintHeader: tsDisableLintHeader,
			noDescriptiveHeader: tsDescriptiveHeader,
			useUnknown: tsUseUnknown,
		} )
		: toType === 'jsc'
		? getJsonSchemaWriter( )
		: toType === 'oapi'
		? getOpenApiWriter( {
			format: oapiFormat,
			title: oapiTitle,
			version: oapiVersion,
		} )
		: toType === 'gql'
		? getGraphQLWriter( {
			unsupported: gqlUnsupported as 'ignore' | 'warn' | 'error',
			nullTypeName: gqlNullTypename,
		} )
		: toType === 'st'
		? getSureTypeWriter( {
			inlineTypes: stInlineTypes,
			exportType: stExportType,
			exportSchema: stExportSchema,
			exportValidator: stExportValidator,
			exportEnsurer: stExportEnsurer,
			exportTypeGuard: stExportTypeGuard,
			useUnknown: stUseUnknown,
			forwardSchema: stForwardSchema,
		} )
		: getCoreTypesWriter( );
}

( async ( ) =>
{
	const cwd = process.cwd( );

	const converter = makeConverter(
		getReader( ),
		getWriter( ),
		{
			...(
				!doStripAnnotations ? { } :
				{ map: ( node => stripAnnotations( node ) ) }
			),
			cwd,
			shortcut,
		}
	);

	const before = Date.now( );

	const result = await batchConvertGlob(
		converter,
		globFiles,
		{
			outputDirectory,
			outputExtension:
				outputExtension ?? (
					toType === 'ts' ? '.ts'
					: toType === 'jsc' ? '.json'
					: toType === 'oapi' ? `.${oapiFormat}`
					: toType === 'gql' ? '.graphql'
					: toType === 'st' ? '.ts'
					: '.json'
				),
			verbose,
			dryRun,
			hidden,
		}
	);

	const after = Date.now( );

	const sec = ( ( after - before ) / 1000 ).toFixed( 1 );

	console.error( bold(
		`💡 Converted ${result.types} types in ${result.files} files, ` +
		`in ${sec}s`
	) );
} )( )
.catch( ( err: any ) =>
{
	console.error( process.env.DEBUG ? err?.stack : err?.message );
	process.exit( 1 );
} );
