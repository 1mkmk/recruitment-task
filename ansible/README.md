# JSONPlaceholder Downloader Ansible Deployment

This repository contains Ansible playbooks and roles for deploying the complete JSONPlaceholder Downloader application - both the Kotlin backend and React frontend.

## Structure

```
ansible/
├── deploy.yml                      # Main deployment playbook for both backend and frontend
├── frontend-maintenance.yml        # Frontend-specific maintenance tasks
├── inventory.ini                   # Inventory file with server definitions
├── inventory.md                    # Documentation for inventory structure
├── maintenance.yml                 # Backend maintenance tasks
├── README.md                       # This documentation file
├── rollback.yml                    # Rollback playbook for both components
├── group_vars/                     # Variables for groups of servers
│   └── app_servers.yml             # Variables for the app_servers group
├── host_vars/                      # Host-specific variables (if needed)
└── roles/                          # Ansible roles
    ├── app/                        # Role for the backend deployment
    └── frontend/                   # Role for the frontend deployment
```

## Prerequisites

- Ansible 2.12 or higher
- SSH access to target servers
- Java 17 on target servers (will be installed if missing)
- Node.js 18 on target servers (will be installed if missing)
- Backend JAR file (should be in `roles/app/files/`)
- Frontend source code (in `frontend-react/`)

## Usage

### Deployment

To deploy both backend and frontend:

```bash
ansible-playbook -i inventory.ini deploy.yml
```

To deploy only the backend:

```bash
ansible-playbook -i inventory.ini deploy.yml --tags backend
```

To deploy only the frontend:

```bash
ansible-playbook -i inventory.ini deploy.yml --tags frontend
```

### Maintenance

For backend maintenance:

```bash
# Check backend status
ansible-playbook -i inventory.ini maintenance.yml -e "maintenance_action=status"

# Restart backend
ansible-playbook -i inventory.ini maintenance.yml -e "maintenance_action=restart"

# View backend logs
ansible-playbook -i inventory.ini maintenance.yml -e "maintenance_action=logs log_lines=200"
```

For frontend maintenance:

```bash
# Check frontend status
ansible-playbook -i inventory.ini frontend-maintenance.yml -e "maintenance_action=status"

# Rebuild frontend
ansible-playbook -i inventory.ini frontend-maintenance.yml -e "maintenance_action=rebuild"

# Clean frontend cache
ansible-playbook -i inventory.ini frontend-maintenance.yml -e "maintenance_action=clean"
```

### Rollback

For rolling back to a previous version:

```bash
# Roll back both components
ansible-playbook -i inventory.ini rollback.yml

# Roll back only the backend
ansible-playbook -i inventory.ini rollback.yml -e "rollback_component=backend"

# Roll back only the frontend
ansible-playbook -i inventory.ini rollback.yml -e "rollback_component=frontend"
```

## Configuration

### Main Variables

#### Backend Variables

| Variable | Default | Description |
|----------|---------|-------------|
| app_name | jsonplaceholder-downloader | Application name |
| app_version | 1.0-SNAPSHOT | Application version |
| java_version | 17 | Java version to install |
| app_user | appuser | User to run the application |
| app_dir | /opt/jsonplaceholder | Base directory for the application |
| app_port | 8080 | Port the application listens on |

#### Frontend Variables

| Variable | Default | Description |
|----------|---------|-------------|
| frontend_name | jsonplaceholder-frontend | Frontend application name |
| frontend_version | 1.0.0 | Frontend version |
| frontend_dir | /var/www/jsonplaceholder-frontend | Frontend directory |
| frontend_port | 80 | Port the frontend listens on |
| web_server | nginx | Web server to use (nginx, apache2, or none) |

## License

MIT