#!/bin/bash
BASEDIR=$(cd $(dirname $0); pwd)
cd $BASEDIR
BASEDIR=`dirname $BASEDIR`

SYSTEM_PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
for binary in node pnpm; do
    if ! PATH="$SYSTEM_PATH" command -v "$binary" >/dev/null 2>&1; then
        echo "Error: $binary must be installed in the system PATH ($SYSTEM_PATH)" >&2
        exit 1
    fi
done

sed -i -e "s#%WorkingDirectory%#${BASEDIR}#" *.service
sudo cp -v *.service /etc/systemd/system/
sudo cp -v *.timer /etc/systemd/system/
ls -l *.timer | awk '{print $9}' | xargs sudo systemctl enable
ls -l *.timer | awk '{print $9}' | xargs sudo systemctl start
