import { handleStoryRequest } from "@/lib/community-stories/http";
type Context = { params: Promise<{ segments?: string[] }> };
async function handle(request: Request, context: Context) {
  const { segments } = await context.params;
  return handleStoryRequest(request, segments);
}
export const GET = handle;
export const POST = handle;
export const DELETE = handle;
