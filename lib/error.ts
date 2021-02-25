import { codeFrameColumns } from "@babel/code-frame"
import {
	CoreTypesErrorMeta,
	locationToLineColumn,
	isCoreTypesError,
} from "core-types"


export function formatCoreTypesError( err: Error ): string
{
	if ( isCoreTypesError( err ) )
	{
		const message = `[${err.name}] ${err.message}`;
		return formatError( message, err );
	}

	return err.message;
}

export function formatError(
	message: string,
	meta?: CoreTypesErrorMeta
)
: string
{
	if ( meta?.loc?.start && meta?.source )
	{
		const loc = locationToLineColumn( meta.source, meta.loc );
		const { start, end } = loc;

		if ( start )
			return codeFrameColumns(
				meta.source,
				{ start, end },
				{ message }
			);
	}

	return message;
}
