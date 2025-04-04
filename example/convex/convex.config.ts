import { defineApp } from "convex/server";
import ai from "@convex-dev/ai/convex.config";

const app = defineApp();
app.use(ai);

export default app;
