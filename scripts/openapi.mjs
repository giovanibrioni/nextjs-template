import { writeFileSync } from "node:fs";

import { z } from "zod";

const healthSchema = z.object({ status: z.enum(["ok", "unavailable"]) });
const itemCreateSchema = z.object({ name: z.string().trim().min(1).max(200) });
const itemPublicSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  created_at: z.string(),
});

const stringSchema = { type: "string" };

const spec = {
  openapi: "3.0.3",
  info: {
    title: "nextjs-template",
    version: "0.1.0",
  },
  paths: {
    "/api/v1/health": {
      get: {
        operationId: "getHealth",
        responses: {
          200: jsonResponse("Healthy", healthSchema),
          503: jsonResponse("Database unavailable", healthSchema),
        },
      },
    },
    "/api/v1/items": {
      get: {
        operationId: "listItems",
        responses: {
          200: jsonResponse("Items", z.array(itemPublicSchema)),
        },
      },
      post: {
        operationId: "createItem",
        requestBody: {
          required: true,
          content: { "application/json": { schema: jsonSchema(itemCreateSchema) } },
        },
        responses: {
          201: jsonResponse("Created item", itemPublicSchema),
          400: jsonResponse("Invalid request", z.object({ detail: z.string() })),
        },
      },
    },
    "/api/v1/items/{itemId}": {
      get: {
        operationId: "getItem",
        parameters: [
          {
            name: "itemId",
            in: "path",
            required: true,
            schema: stringSchema,
          },
        ],
        responses: {
          200: jsonResponse("Item", itemPublicSchema),
          404: jsonResponse("Missing item", z.object({ detail: z.string() })),
        },
      },
    },
  },
};

healthSchema.parse({ status: "ok" });
itemCreateSchema.parse({ name: "widget" });
itemPublicSchema.parse({ id: "00000000-0000-4000-8000-000000000001", name: "widget", created_at: "2026-01-01T00:00:00.000Z" });

writeFileSync("openapi.yaml", `${JSON.stringify(spec, null, 2)}\n`);

function jsonResponse(description, schema) {
  return {
    description,
    content: { "application/json": { schema: jsonSchema(schema) } },
  };
}

function jsonSchema(schema) {
  if (schema instanceof z.ZodArray) {
    return { type: "array", items: jsonSchema(schema.element) };
  }
  if (schema instanceof z.ZodEnum) {
    return { type: "string", enum: schema.options };
  }
  if (schema.constructor?.name === "ZodUUID") {
    return { type: "string", format: "uuid" };
  }
  if (schema instanceof z.ZodString) {
    const check = schema._zod?.def?.checks?.find((item) => item._zod?.def?.check === "uuid");
    return check ? { type: "string", format: "uuid" } : { type: "string" };
  }
  if (!(schema instanceof z.ZodObject)) {
    return { type: "object" };
  }
  const properties = {};
  const required = [];
  for (const [key, value] of Object.entries(schema.shape)) {
    properties[key] = jsonSchema(value);
    required.push(key);
  }
  return { type: "object", properties, required };
}
