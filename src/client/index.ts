import { api } from "../component/_generated/api";
import { UseApi } from "./types";

export class ConvexAI {
  constructor(
    public component: UseApi<typeof api>,
    public options?: { embedder: string }
  ) {}
}
