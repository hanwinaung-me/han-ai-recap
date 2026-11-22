
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({
        app: "HAN AI RECAP",
        status: "online"
      });
    }

    return env.ASSETS.fetch(request);
  }
};
