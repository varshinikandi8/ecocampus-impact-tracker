# EcoCampus Impact Tracker — Three-Tier AWS Project

EcoCampus is a sustainability activity tracker for a college campus. Users can log an everyday green action, select a category, enter an estimated CO₂ saving, and view a summary of the recorded activities.

## What is included

- **Frontend:** responsive HTML/CSS/JavaScript dashboard served by Nginx.
- **Backend:** Node.js and Express REST API with input validation.
- **Database:** PostgreSQL table for sustainability actions.
- **Local orchestration:** Docker Compose with separate frontend, backend and database services.
- **Cloud infrastructure:** Terraform for a VPC with public/private subnets, a public Nginx reverse-proxy/bastion EC2 instance, a private app EC2 instance, S3 app bundle storage, IAM role, and security groups.

## Architecture

```text
Browser
   |
   v
Public EC2: Nginx reverse proxy (port 80; SSH restricted to your IP)
   |
   v
Private EC2: Docker Compose
   |-- Nginx frontend (port 80)
   |       |-- /api/* --> Express API (port 5000)
   |                           |
   |                           v
   |                      PostgreSQL (port 5432)
   |
   +-- Database is on an internal Docker network; backend/database ports are not public.
```

## Run locally (Docker Desktop required)

1. Install and start Docker Desktop. On Windows, finish WSL setup if Docker requests it.
2. Open PowerShell in this project folder.
3. Enter the app directory and start the services:

```powershell
cd app
Copy-Item .env.example .env
docker compose up --build
```

4. Open `http://localhost` in your browser. Stop services with `Ctrl+C`; to stop and remove containers, run `docker compose down`. To also delete the local database volume, use `docker compose down -v` (this deletes saved activity data).

If port 80 is already in use, change the frontend port mapping in `app/docker-compose.yml` from `"80:80"` to `"8080:80"`, then open `http://localhost:8080`.

## API routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | API/database health |
| GET | `/api/actions` | List recent actions |
| GET | `/api/summary` | Action count, total estimated CO₂ and leading category |
| POST | `/api/actions` | Add a validated action |
| DELETE | `/api/actions/:id` | Remove an action |

POST example:

```json
{
  "title": "Walked to class",
  "category": "Transport",
  "impact_kg": 0.5,
  "note": "Walked instead of taking a ride"
}
```

CO₂ values are user-provided estimates for demonstration; the app does not verify them scientifically.

## Deploy to AWS with Terraform

> **Cost warning:** this infrastructure includes a NAT Gateway and EC2 instances, which can incur charges while running. Review the AWS pricing for your region and destroy resources when finished. Do not deploy until you understand the cost and security implications.

Prerequisites: AWS CLI credentials configured, Terraform 1.5+, an existing EC2 key pair in `ap-south-1` (or your selected region), and your public IPv4 address.

1. Open `terraform/terraform.tfvars.example` and copy it to `terraform/terraform.tfvars`.
2. Edit `key_name`, `admin_cidr` (your public IP with `/32`), `db_password` (your own strong alphanumeric password, at least 12 characters), and `region` if needed. Do not commit `terraform.tfvars`.
3. Run:

```powershell
cd terraform
terraform init
terraform validate
terraform plan
terraform apply
```

4. Confirm the plan and wait for the instances to finish bootstrapping. Open the `app_url` output in your browser.
5. When finished, run `terraform destroy` from the `terraform` directory and confirm. Verify in the AWS console that the resources have been removed.

The first boot may take several minutes. If the app is not ready, inspect the EC2 user-data logs and Docker Compose status before troubleshooting.

## Project structure

```text
ecocampus-impact-tracker/
├── app/
│   ├── frontend/       # Nginx and responsive dashboard
│   ├── backend/        # Express API and PostgreSQL queries
│   ├── docker-compose.yml
│   └── .env.example
├── terraform/          # AWS VPC, EC2, S3, IAM and security groups
├── docs/
└── README.md
```

## Before submission

- Run the app and test create/list/delete flows.
- Review the code and be prepared to explain the frontend, API routes, database schema, Docker networks, Terraform resources, and security groups.
- Replace example values with your own local configuration; never upload real credentials, `.env`, Terraform state files, access keys, or private key files.
- Add your own screenshots and a short project report if your course requires them.
