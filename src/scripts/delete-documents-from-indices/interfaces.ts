import { z } from "zod";

export const DeleteDocumentsFromIndicesSchema = z.object({
  indices: z.array(z.string().min(1)).min(1),
  queryBody: z.record(z.string(), z.unknown()).optional(),
});

type DeleteDocumentsFromIndicesOptions = z.infer<typeof DeleteDocumentsFromIndicesSchema>;
export default DeleteDocumentsFromIndicesOptions;
