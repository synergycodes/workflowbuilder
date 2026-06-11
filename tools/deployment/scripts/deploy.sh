#!/bin/sh
# Deploy the AI Studio stack to Swarm, mirroring workflow-builder's
# deploy.sh. The setup scripts exist only in the deployment CI image.
set -eu

[ -f /var/setup-az.sh ] && . /var/setup-az.sh
[ -f /var/setup-ansible.sh ] && . /var/setup-ansible.sh

ansible-playbook ./tools/deployment/ansible/deploy-application/main.yml
