export type SaveErrorCode =
  'invalid-json' | 'invalid-format' | 'future-version' | 'missing-migration' | 'invalid-export';

/** A save could not be read. The message is safe to show to the player. */
export class SaveError extends Error {
  constructor(
    public readonly code: SaveErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'SaveError';
  }
}
