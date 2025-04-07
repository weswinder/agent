import { literals } from "convex-helpers/validators";
import {
  defineTable,
  GenericTableSearchIndexes,
  TableDefinition,
} from "convex/server";
import { GenericId, ObjectType, v, VId, VObject, VUnion } from "convex/values";
import { QueryCtx } from "../_generated/server";

// We only generate embeddings for non-tool, non-system messages
const embeddings = {
  model: v.string(),
  kind: v.union(v.literal("thread"), v.literal("memory")),
  userId: v.optional(v.string()),
  threadId: v.optional(v.string()),
  // not set for private threads
  model_kind_userId: v.optional(v.array(v.string())),
  model_kind_threadId: v.optional(v.array(v.string())),
  vector: v.array(v.number()),
};

function table<D extends number>(dimensions: D): Table<D> {
  return defineTable(embeddings)
    .vectorIndex("vector", {
      vectorField: "vector",
      dimensions,
      filterFields: ["model_kind_userId", "model_kind_threadId"],
    })
    .index("model_kind_threadId", ["model", "kind", "threadId"]);
}

export const VectorDimensions = [
  128, 256, 512, 768, 1024, 1536, 2048, 3072, 4096,
] as const;
export type VectorDimension = (typeof VectorDimensions)[number];
export const VectorTableNames = VectorDimensions.map(
  (d) => `embeddings_${d}`
) as `embeddings_${(typeof VectorDimensions)[number]}`[];
export type VectorTableName = (typeof VectorTableNames)[number];
export type VectorTableId = GenericId<(typeof VectorTableNames)[number]>;

export const vVectorDimension = literals(...VectorDimensions);
export const vVectorTableName = literals(...VectorTableNames);
export const vVectorId = v.union(
  ...VectorTableNames.map((name) => v.id(name))
) as VUnion<
  GenericId<(typeof VectorTableNames)[number]>,
  VId<(typeof VectorTableNames)[number]>[]
>;

type Table<D extends number> = TableDefinition<
  VObject<ObjectType<typeof embeddings>, typeof embeddings>,
  { id: ["id"] },
  GenericTableSearchIndexes,
  VectorIndex<D>
>;

type VectorIndex<D extends number> = {
  vector: {
    vectorField: "vector";
    dimensions: D;
    filterFields: string;
  };
};

export function getVectorTableName(dimension: VectorDimension) {
  return `embeddings_${dimension}` as VectorTableName;
}
export function getVectorIdInfo(ctx: QueryCtx, id: VectorTableId) {
  for (const dimension of VectorDimensions) {
    const tableName = getVectorTableName(dimension);
    if (ctx.db.normalizeId(tableName, id)) {
      return { tableName, dimension };
    }
  }
  throw new Error(`Unknown vector table id: ${id}`);
}

const tables: {
  [K in keyof typeof VectorDimensions &
    number as `embeddings_${(typeof VectorDimensions)[K]}`]: Table<
    (typeof VectorDimensions)[K]
  >;
} = Object.fromEntries(
  VectorDimensions.map((dimensions) => [
    `embeddings_${dimensions}`,
    table(dimensions),
  ])
) as Record<
  `embeddings_${(typeof VectorDimensions)[number]}`,
  Table<(typeof VectorDimensions)[number]>
>;

export default tables;
