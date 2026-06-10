#!/bin/sh
# Deploy the AI Studio stack to the Docker Swarm cluster, mirroring the
# workflow-builder repo's tools/deployment/scripts/deploy.sh. The setup
# scripts are baked into the synergycodes deployment CI image; guards let the
# playbook also run from a workstation with az + ansible already configured.
set -eu

[ -f /var/setup-az.sh ] && . /var/setup-az.sh
[ -f /var/setup-ansible.sh ] && . /var/setup-ansible.sh

ansible-playbook ./tools/deployment/ansible/deploy-application/main.yml
