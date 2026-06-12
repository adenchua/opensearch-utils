import { z } from "zod";

export const ExportFromIndexSchema = z.object({
  indexName: z.string().min(1),
  searchQuery: z.record(z.string(), z.unknown()).optional(),
  scrollSize: z.number().int().positive().optional(),
  scrollWindowTimeout: z.string().optional(),
});

type ExportFromIndexOptions = z.infer<typeof ExportFromIndexSchema>;
export default ExportFromIndexOptions;
