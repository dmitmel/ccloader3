#!/usr/bin/env sh
# Uploads distributable archives to a temporary server.

set -eu

# Aliases taken from my dotfiles:
alias rsync-backup="rsync --archive --compress --verbose --human-readable --partial --progress"
alias date-fmt-compact="date +%Y%m%d%H%M%S"

date=$(date-fmt-compact --utc)

rsync-backup ccloader_*_{quick-install,package}.{zip,tgz} experiments:public/ccloader3/"$date"/
ssh experiments ln -svfT "$date" public/ccloader3/latest
