// Minimal OpenAPI 3 spec served at /docs via swagger-ui-express
export const openapiSpec = {
  openapi: "3.0.0",
  info: {
    title: "Ethara Seat Allocation & Project Mapping API",
    version: "1.0.0",
    description:
      "REST API for employee seating, project mapping, seat allocation, dashboard, and a rule-based AI assistant.",
  },
  servers: [{ url: "/" }],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
  },
  paths: {
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login, returns JWT",
        requestBody: body({ email: "admin@ethara.ai", password: "admin123" }),
        responses: ok("Token + user"),
      },
    },
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a user",
        requestBody: body({ name: "HR", email: "hr@ethara.ai", password: "secret", role: "hr" }),
        responses: ok("Token + user"),
      },
    },
    "/employees": {
      get: {
        tags: ["Employees"],
        summary: "List/search employees",
        parameters: [
          qp("search"), qp("project"), qp("status"), qp("department"),
          qp("page"), qp("limit"),
        ],
        responses: ok("Paginated employees"),
      },
      post: {
        tags: ["Employees"],
        summary: "Create employee",
        security: [{ bearerAuth: [] }],
        requestBody: body({
          employee_code: "EMP9001", name: "New Joiner",
          email: "new@ethara.ai", department: "Engineering",
          role: "Engineer", status: "new_joiner", project: "<projectId>",
        }),
        responses: ok("Created employee"),
      },
    },
    "/employees/{id}": {
      get: { tags: ["Employees"], summary: "Get employee", parameters: [pp("id")], responses: ok("Employee") },
      put: {
        tags: ["Employees"], summary: "Update employee",
        security: [{ bearerAuth: [] }], parameters: [pp("id")],
        requestBody: body({ department: "Design" }), responses: ok("Updated"),
      },
      delete: {
        tags: ["Employees"], summary: "Deactivate employee",
        security: [{ bearerAuth: [] }], parameters: [pp("id")], responses: ok("Deactivated"),
      },
    },
    "/projects": {
      get: { tags: ["Projects"], summary: "List projects", responses: ok("Projects") },
      post: {
        tags: ["Projects"], summary: "Create project", security: [{ bearerAuth: [] }],
        requestBody: body({ name: "Indigo", manager_name: "Lead" }), responses: ok("Created"),
      },
    },
    "/projects/{id}/employees": {
      get: { tags: ["Projects"], summary: "Employees in project", parameters: [pp("id")], responses: ok("Employees") },
    },
    "/seats": {
      get: {
        tags: ["Seats"], summary: "List/filter seats",
        parameters: [qp("floor"), qp("zone"), qp("status"), qp("page"), qp("limit")],
        responses: ok("Paginated seats"),
      },
      post: {
        tags: ["Seats"], summary: "Create seat", security: [{ bearerAuth: [] }],
        requestBody: body({ floor: 3, zone: "B", bay: "4", seat_number: "B4-23" }),
        responses: ok("Created seat"),
      },
    },
    "/seats/available": {
      get: { tags: ["Seats"], summary: "Available seats", parameters: [qp("floor"), qp("zone")], responses: ok("Available seats") },
    },
    "/seats/allocate": {
      post: {
        tags: ["Seats"], summary: "Allocate seat (auto-picks near team if seatId omitted)",
        security: [{ bearerAuth: [] }],
        requestBody: body({ employeeId: "<employeeId>", seatId: "<optional>", projectId: "<optional>" }),
        responses: ok("Allocation + seat"),
      },
    },
    "/seats/release": {
      post: {
        tags: ["Seats"], summary: "Release seat", security: [{ bearerAuth: [] }],
        requestBody: body({ employeeId: "<employeeId>" }), responses: ok("Released"),
      },
    },
    "/dashboard/summary": { get: { tags: ["Dashboard"], summary: "Totals", responses: ok("Summary") } },
    "/dashboard/project-utilization": { get: { tags: ["Dashboard"], summary: "Project-wise allocation", responses: ok("List") } },
    "/dashboard/floor-utilization": { get: { tags: ["Dashboard"], summary: "Floor-wise occupancy", responses: ok("List") } },
    "/ai/query": {
      post: {
        tags: ["AI Assistant"],
        summary: "Natural-language seat/project query",
        requestBody: body({ query: "Where is my seat? My email is amit@ethara.ai" }),
        responses: ok("Answer + structured data"),
      },
    },
  },
};

function ok(desc) {
  return { 200: { description: desc }, 201: { description: desc } };
}
function body(example) {
  return {
    required: true,
    content: { "application/json": { schema: { type: "object" }, example } },
  };
}
function qp(name) {
  return { name, in: "query", required: false, schema: { type: "string" } };
}
function pp(name) {
  return { name, in: "path", required: true, schema: { type: "string" } };
}
