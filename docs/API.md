# EcoCampus API Notes

Base path: `/api`

- `GET /health`: returns API and database status.
- `GET /actions`: returns up to 100 most recent actions.
- `GET /summary`: returns `total_actions`, `total_impact`, and `leading_category`.
- `POST /actions`: accepts `title`, `category`, `impact_kg`, and optional `note`. Categories: `Transport`, `Energy`, `Waste`, `Food`, `Water`, `Nature`.
- `DELETE /actions/:id`: deletes one action by numeric ID.

Input checks are implemented in the API and SQL statements use parameters rather than string concatenation.
