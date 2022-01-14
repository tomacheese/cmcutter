#!/bin/bash
BASEDIR=$(cd $(dirname $0); pwd)
cd $BASEDIR
BASEDIR=`dirname $BASEDIR`

sed -i -e "s#%WorkingDirectory%#${BASEDIR}#" *.service
sudo cp -v *.service /etc/systemd/system/
sudo cp -v *.timer /etc/systemd/system/
ls -l *.timer | awk '{print $9}' | xargs sudo systemctl enable
ls -l *.timer | awk '{print $9}' | xargs sudo systemctl start