import { v } from "convex/values";
import { query } from "./_generated/server";
import { pick } from "convex-helpers";
import { StreamDelta, vStreamDelta, vStreamMessage } from "../validators";

export const list = query({
  args: {
    threadId: v.id("threads"),
  },
  returns: v.array(vStreamMessage),
  handler: async (ctx, args) => {
    return ctx.db
      .query("streamingMessages")
      .withIndex("threadId_order_stepOrder", (q) =>
        q.eq("threadId", args.threadId)
      )
      .order("desc")
      .take(100)
      .then((msgs) =>
        msgs.map((m) => ({
          streamId: m._id,
          ...pick(m, [
            "order",
            "stepOrder",
            "userId",
            "agentName",
            "model",
            "provider",
            "providerOptions",
          ]),
        }))
      );
  },
});

const MAX_DELTAS_PER_REQUEST = 1000;
const MAX_DELTAS_PER_STREAM = 100;

export const getDeltas = query({
  args: {
    threadId: v.id("threads"),
    cursors: v.array(
      v.object({
        streamId: v.id("streamingMessages"),
        cursor: v.number(),
      })
    ),
  },
  returns: v.array(vStreamDelta),
  handler: async (ctx, args): Promise<StreamDelta[]> => {
    let totalDeltas = 0;
    const deltas: StreamDelta[] = [];
    for (const cursor of args.cursors) {
      const streamDeltas = await ctx.db
        .query("streamDeltas")
        .withIndex("streamId_start_end", (q) =>
          q.eq("streamId", cursor.streamId).gte("start", cursor.cursor)
        )
        .take(
          Math.min(MAX_DELTAS_PER_STREAM, MAX_DELTAS_PER_REQUEST - totalDeltas)
        );
      totalDeltas += streamDeltas.length;
      deltas.push(
        ...streamDeltas.map((d) => ({
          streamId: d.streamId.toString(),
          ...pick(d, ["start", "end", "parts"]),
        }))
      );
      if (totalDeltas >= MAX_DELTAS_PER_REQUEST) {
        break;
      }
    }
    return deltas;
  },
});
