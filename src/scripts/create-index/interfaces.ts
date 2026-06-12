import { z } from "zod";

export const CreateIndexSchema = z.object({
  indexName: z.string().min(1),
  indexKnn: z.boolean().optional(),
  shardCount: z.number().int().positive().optional(),
  replicaCount: z.number().int().min(0).optional(),
  maxResultWindow: z.number().int().positive().optional(),
  refreshInterval: z.string().optional(),
  search: z.object({ defaultPipeline: z.string().optional() }).optional(),
  analysis: z.unknown().optional(),
  mappings: z.unknown().optional(),
  aliases: z.unknown().optional(),
});

type CreateIndexOption = z.infer<typeof CreateIndexSchema>;
export default CreateIndexOption;
