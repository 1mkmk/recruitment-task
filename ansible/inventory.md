# Ansible Inventory Configuration

This document explains the structure and usage of the inventory file for the JSONPlaceholder Downloader application deployment.

## Structure

The inventory file (`inventory.ini`) defines the servers where the application will be deployed. It's organized as follows:

```ini
[app_servers]
adaptive_cv_server ansible_host=karol152.mikrus.xyz ansible_port=10152 ansible_user=root ansible_ssh_private_key_file=~/.ssh/id_rsa

[app_servers:vars]
ansible_python_interpreter=/usr/bin/python3
...other variables...
```

## Server Groups

- **app_servers**: Main application servers that run the JSONPlaceholder Downloader application

## Adding Servers

To add a new server to the deployment:

1. Add an entry under the appropriate group in `inventory.ini`
2. If the server needs specific configurations, create a file in `host_vars/your-server-name.yml`

### Example

```ini
[app_servers]
app-server-1 ansible_host=192.168.1.101 ansible_user=admin
app-server-2 ansible_host=192.168.1.102 ansible_user=admin
```

## Using Different Inventories

For different environments (development, testing, production), you can create separate inventory files:

```bash
# Using the production inventory
ansible-playbook -i inventory.ini deploy.yml

# Using a development inventory
ansible-playbook -i inventory.dev.ini deploy.yml
```

## Encrypted Variables

For sensitive data, use Ansible Vault to encrypt variables:

```bash
# Create encrypted variables file
ansible-vault create group_vars/app_servers/vault.yml

# Edit encrypted variables
ansible-vault edit group_vars/app_servers/vault.yml

# Run playbook with vault password
ansible-playbook -i inventory.ini deploy.yml --ask-vault-pass
```