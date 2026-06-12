import { z } from "zod";

import { ALLOWED_DATE_FORMATS } from "../../constants";

export const BulkIngestDocumentsSchema = z.object({
  indexName: z.string().min(1),
  inputZipPaths: z.array(z.string().min(1)).min(1),
  documentIdOptions: z
    .object({
      idKey: z.string().min(1),
      removeIdFromDocs: z.boolean().optional(),
    })
    .optional(),
  generatedTimestampOptions: z
    .object({
      timestampKey: z.string().optional(),
      timestampFormat: z.enum(ALLOWED_DATE_FORMATS).optional(),
    })
    .optional(),
});

type BulkIngestDocumentsOption = z.infer<typeof BulkIngestDocumentsSchema>;
export default BulkIngestDocumentsOption;
