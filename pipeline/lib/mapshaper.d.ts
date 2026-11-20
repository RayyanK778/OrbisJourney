// mapshaper ships without type definitions. This covers the one function the pipeline uses.
declare module 'mapshaper' {
  /** Runs mapshaper commands on in-memory files and resolves to the output files by name. */
  export function applyCommands(
    commands: string,
    input: Record<string, string>,
  ): Promise<Record<string, Buffer | string>>;
  const mapshaper: { applyCommands: typeof applyCommands };
  export default mapshaper;
}
