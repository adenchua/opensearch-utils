import { z } from "zod";

export const ExportMappingFromIndicesSchema = z.object({
  indices: z.array(z.string().min(1)).min(1),
  outputFilename: z.string().optional(),
});

type ExportMappingFromIndicesOptions = z.infer<typeof ExportMappingFromIndicesSchema>;
export default ExportMappingFromIndicesOptions;
