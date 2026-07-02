import { z } from "zod";

export const ReplaceMappingSchema = z.object({
  targetIndex: z.string().min(1),
  mappings: z.unknown(),
  indexKnn: z.boolean().optional(),
  shardCount: z.number().int().positive().optional(),
  replicaCount: z.number().int().min(0).optional(),
  maxResultWindow: z.number().int().positive().optional(),
  refreshInterval: z.string().optional(),
  search: z.object({ defaultPipeline: z.string().optional() }).optional(),
  analysis: z.unknown().optional(),
  reindexScript: z.string().optional(),
});

type ReplaceMappingOption = z.infer<typeof ReplaceMappingSchema>;
export default ReplaceMappingOption;
