export async function POST(request: Request) {
  try {
    const roadmap = {
      "title": "Your Business Roadmap",
      "phases": [
        {
          "phase": 1,
          "name": "Validate Your Idea",
          "duration": "1-2 weeks",
          "tasks": [
            {"title": "Survey 20 potential customers", "duration": "3 days"},
            {"title": "Create landing page", "duration": "2 days"}
          ]
        },
        {
          "phase": 2,
          "name": "Build MVP",
          "duration": "2-3 weeks",
          "tasks": [
            {"title": "Setup basic product", "duration": "1 week"},
            {"title": "Test with beta users", "duration": "1 week"}
          ]
        },
        {
          "phase": 3,
          "name": "Launch & Get First Customers",
          "duration": "1 week",
          "tasks": [
            {"title": "Create marketing plan", "duration": "2 days"},
            {"title": "Reach out to early users", "duration": "3 days"}
          ]
        }
      ]
    };
    return Response.json({ roadmap: JSON.stringify(roadmap) });
  } catch (error) {
    return Response.json({error: "Failed"}, {status: 500});
  }
}