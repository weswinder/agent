import { Infer } from "convex/values";
import { expectTypeOf } from "vitest";
import {
  vAssistantContent,
  vAssistantMessage,
  vFilePart,
  vImagePart,
  vMessage,
  vReasoningPart,
  vRedactedReasoningPart,
  vSystemMessage,
  vTextPart,
  vToolCallPart,
  vToolContent,
  vToolMessage,
  vUserMessage,
} from "./validators";
import { vUserContent } from "./validators";
import {
  AssistantContent,
  CoreAssistantMessage,
  CoreMessage,
  CoreSystemMessage,
  CoreToolMessage,
  CoreUserMessage,
  FilePart,
  ImagePart,
  TextPart,
  ToolCallPart,
  ToolContent,
  UserContent,
} from "ai";
import { SerializeUrlsAndUint8Arrays } from "./mapping";

// type assertion
type OurUserContent = SerializeUrlsAndUint8Arrays<UserContent>;
expectTypeOf<OurUserContent>().toExtend<Infer<typeof vUserContent>>();
expectTypeOf<Infer<typeof vUserContent>>().toExtend<OurUserContent>();

type OurAssistantContent = SerializeUrlsAndUint8Arrays<AssistantContent>;
expectTypeOf<OurAssistantContent>().toExtend<Infer<typeof vAssistantContent>>();
expectTypeOf<Infer<typeof vAssistantContent>>().toExtend<OurAssistantContent>();

type OurToolContent = SerializeUrlsAndUint8Arrays<ToolContent>;
expectTypeOf<OurToolContent>().toExtend<Infer<typeof vToolContent>>();
expectTypeOf<Infer<typeof vToolContent>>().toExtend<OurToolContent>();

expectTypeOf<Infer<typeof vToolCallPart>>().toExtend<ToolCallPart>();
expectTypeOf<ToolCallPart>().toExtend<Infer<typeof vToolCallPart>>();

type OurTextPart = SerializeUrlsAndUint8Arrays<TextPart>;
expectTypeOf<OurTextPart>().toExtend<Infer<typeof vTextPart>>();
expectTypeOf<Infer<typeof vTextPart>>().toExtend<OurTextPart>();

type OurImagePart = SerializeUrlsAndUint8Arrays<ImagePart>;
expectTypeOf<OurImagePart>().toExtend<Infer<typeof vImagePart>>();
expectTypeOf<Infer<typeof vImagePart>>().toExtend<OurImagePart>();

type OurFilePart = SerializeUrlsAndUint8Arrays<FilePart>;
expectTypeOf<OurFilePart>().toExtend<Infer<typeof vFilePart>>();
expectTypeOf<Infer<typeof vFilePart>>().toExtend<OurFilePart>();

// narrow to the type
type ReasoningPart = AssistantContent[number] & { type: "reasoning" } & object;
type OurReasoningPart = SerializeUrlsAndUint8Arrays<ReasoningPart>;
expectTypeOf<OurReasoningPart>().toExtend<Infer<typeof vReasoningPart>>();
expectTypeOf<Infer<typeof vReasoningPart>>().toExtend<OurReasoningPart>();

// narrow to the type
type RedactedReasoningPart = AssistantContent[number] & {
  type: "redacted-reasoning";
} & object;
type OurRedactedReasoningPart =
  SerializeUrlsAndUint8Arrays<RedactedReasoningPart>;
expectTypeOf<OurRedactedReasoningPart>().toExtend<
  Infer<typeof vRedactedReasoningPart>
>();
expectTypeOf<
  Infer<typeof vRedactedReasoningPart>
>().toExtend<OurRedactedReasoningPart>();

// test("noop", () => {
type OurUserMessage = SerializeUrlsAndUint8Arrays<CoreUserMessage>;
expectTypeOf<OurUserMessage>().toExtend<Infer<typeof vUserMessage>>();
expectTypeOf<Infer<typeof vUserMessage>>().toExtend<OurUserMessage>();

type OurAssistantMessage = SerializeUrlsAndUint8Arrays<CoreAssistantMessage>;
expectTypeOf<OurAssistantMessage>().toExtend<Infer<typeof vAssistantMessage>>();
expectTypeOf<Infer<typeof vAssistantMessage>>().toExtend<OurAssistantMessage>();

expectTypeOf<Infer<typeof vToolMessage>>().toExtend<CoreToolMessage>();
expectTypeOf<CoreToolMessage>().toExtend<Infer<typeof vToolMessage>>();

expectTypeOf<Infer<typeof vSystemMessage>>().toExtend<CoreSystemMessage>();
expectTypeOf<CoreSystemMessage>().toExtend<Infer<typeof vSystemMessage>>();

type OurMessage = SerializeUrlsAndUint8Arrays<CoreMessage>;
expectTypeOf<OurMessage>().toExtend<Infer<typeof vMessage>>();
expectTypeOf<Infer<typeof vMessage>>().toExtend<OurMessage>();
