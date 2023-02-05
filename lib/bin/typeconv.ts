#!/usr/bin/env node

import { promises as fsPromises } from "fs"
import path from "path"
import { fileURLToPath } from "url"

import chalk from "chalk"
import { oppa } from "oppa"
import { stripAnnotations } from "core-types"
import type { JsonSchemaToSuretypeOptions } from "core-types-suretype"
import type { FromTsOptions, ToTsOptions } from "core-types-ts"
import type { ExportRefMethod } from "suretype"

import { makeConverter } from "../converter.js"
import { batchConvertGlob } from "../batch-convert.js"
import { Reader } from "../reader.js"
import { Writer } from "../writer.js"
import {
	getJsonSchemaReader,
	getJsonSchemaWriter,
	getOpenApiReader,
	getOpenApiWriter,
} from "../convert-json-schema.js"
import {
	getGraphQLReader,
	getGraphQLWriter,
} from "../convert-graphql.js"
import {
	getTypeScriptReader,
	getTypeScriptWriter,
} from "../convert-typescript.js"
import {
	getCoreTypesReader,
	getCoreTypesWriter,
} from "../convert-core-types.js"
import {
	getSureTypeReader,
	getSureTypeWriter,
} from "../convert-suretype.js"
import { userPackage, userPackageUrl } from "../package.js"
import { TypeImplementation } from "../types.js"
import { ensureType } from "../utils.js"


const __filename = fileURLToPath( import.meta.url );
const __dirname = path.dirname( __filename );

type SureTypeMissingRef = JsonSchemaToSuretypeOptions[ 'missingReference' ];

const implementations: Array< Record< TypeImplementation, string > >
	= [
		{ ts: "TypeScript" } as Record< TypeImplementation, string >,
		{ jsc: "JSON Schema" } as Record< TypeImplementation, string >,
		{ gql: "GraphQL" } as Record< TypeImplementation, string >,
		{ oapi: "Open API" } as Record< TypeImplementation, string >,
		{ st: "SureType" } as Record< TypeImplementation, string >,
		{ ct: "core-types" } as Record< TypeImplementation, string >,
	];

const { version } =
	JSON.parse(
		await fsPromises.readFile(
			path.resolve( __dirname, "..", "..", "package.json" ),
			'utf-8'
		)
	);

const oppaInstance =
	oppa( {
		version: version,
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
	.add( {
		name: 'ts-non-exported',
		type: 'string',
		argumentName: 'method',
		description: "Strategy for non-exported types",
		default: 'include-if-referenced',
		values: [
			{ 'fail': "Fail conversion" },
			{ 'ignore': [
				"Don't include non-exported types,",
				"even if referenced",
			] },
			{ 'include': "Include non-exported types" },
			{ 'inline': [
				"Don't include non-exported types, ",
				"inline them if necessary.",
				"Will fail on cyclic types"
			] },
			{ 'include-if-referenced': [
				"Include non-exported types only if they",
				"are referenced from exported types",
			] },
		],
	} )
	.add( {
		name: "ts-namespaces",
		type: "string",
		argumentName: "method",
		description: [
			"Namespace strategy."
		],
		default: "ignore",
		values: [
			{ "ignore": [
				"Ignore namespaces entirely (default).",
				"- When converting from TypeScript, types in namespaces",
				"aren't exported.",
				"- When converting to TypeScript, no attempt to",
				"reconstruct namespaces is performed.",
			] },
			{ "hoist": [
				"When converting from TypeScript, hoist types inside",
				"namespaces to top-level, so that the types are",
				"included, but without their namespace.",
				"This can cause conflicts, in which case deeper",
				"declarations will be dropped in favor of more top-",
				"level declarations.",
				"In case of same-level (namespace depth) declarations",
				"with the same name, only one will be exported in a",
				"non-deterministic manner.",
			] },
			{ "dot": [
				"When converting from TypeScript, join the namespaces",
				"and the exported type with a dot (.).",
				"When converting to TypeScript, try to reconstruct",
				"namespaces by splitting the name on dot (.).",
			] },
			{ "underscore": [
				"When converting from TypeScript, join the namespaces",
				"and the exported type with an underscore (_).",
				"When converting to TypeScript, try to reconstruct",
				"namespaces by splitting the name on underscore (_).",
			] },
			{ "reconstruct-all": [
				"When converting to TypeScript, try to reconstruct",
				"namespaces by splitting the name on both dot and",
				"underscore.",
			] },
		],
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
			{ "no-refs": "Don't ref anything, inline all types" },
			{ "provided": "Reference types that are explicitly exported" },
			{ "ref-all": "Ref all provided types and those with names" },
		],
		default: 'provided',
	} )
	.add( {
		name: 'st-missing-ref',
		argumentName: 'method',
		type: 'string',
		description: "What to do when detecting an unresolvable reference",
		values: [
			{ "ignore": "Ignore; skip type or cast to any" },
			{ "warn": "Same as 'ignore', but warn" },
			{ "error": "Fail conversion" },
		],
		default: 'warn',
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
	"ts-non-exported": tsNonExported,
	"ts-namespaces": tsNamespaces,

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
	"st-missing-ref": stMissingReference,
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

if ( !ensureType< FromTsOptions[ 'nonExported' ] >(
	tsNonExported,
	'ts-non-exported',
	[ 'fail', 'ignore', 'include', 'inline', 'include-if-referenced' ],
	printHelp
) )
	throw new Error( );


if ( !ensureType<
		'ignore' | 'hoist' | 'dot' | 'underscore' | 'reconstruct-all'
	>(
	tsNamespaces,
	'ts-namespaces',
	[ 'ignore', 'hoist', 'dot', 'underscore', 'reconstruct-all' ],
	printHelp
) )
	throw new Error( );

const toTsNamespaces: ToTsOptions[ 'namespaces' ] =
	tsNamespaces === 'reconstruct-all' ? 'all' :
	tsNamespaces === 'dot' ? 'dot' :
	tsNamespaces === 'underscore' ? 'underscore' :
	'ignore';

const fromTsNamespaces: FromTsOptions[ 'namespaces' ] =
	tsNamespaces === 'hoist' ? 'hoist' :
	tsNamespaces === 'dot' ? 'join-dot' :
	tsNamespaces === 'underscore' ? 'join-underscore' :
	'ignore';

if ( !ensureType< ExportRefMethod | undefined >(
	stRefMethod,
	'ref-method',
	[  'no-refs', 'provided', 'ref-all', undefined ],
	printHelp
) )
	throw new Error( );

if ( !ensureType< SureTypeMissingRef | undefined >(
	stMissingReference,
	'missing-ref',
	[  'ignore', 'warn', 'error', undefined ],
	printHelp
) )
	throw new Error( );

const getReader = ( ): Reader =>
{
	return fromType === 'ts'
		? getTypeScriptReader( {
			nonExported: tsNonExported,
			namespaces: fromTsNamespaces,
		} )
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
			namespaces: toTsNamespaces,
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
			missingReference: stMissingReference,
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

	console.error( chalk.bold(
		`💡 Converted ${result.types} types in ${result.files} files, ` +
		`in ${sec}s`
	) );
} )( )
.catch( ( err: any ) =>
{
	console.error( process.env.DEBUG ? err?.stack : err?.message );
	process.exit( 1 );
} );
