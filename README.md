# Marks Notifier
A discord bot to retrieve your marks from internal network with a Jupyter script and send messages when new ones are available.
WARNING: This will only work for a specific software used at my uni

## Installation
 - Upload the notes_v2.ipynb to Jupyter
 - Set your UNI_URL in the notebook
 - Rename config.sample.json to config.json
 - Create a discord bot and put the token in the config file
 - Enable dev mode on your discord client, right click on the channel where you want the notifications to be published and copy the identifier to the discordChannel field in the config file
 - Set your username and password and the jupyter endpoints in the config file
 - Edit the volumes path in the `docker-compose.yml` file
 - run `docker-compose build` to build the container and `docker-compose up -d` to run it

## Usage
 - Available commands are `!notes` to show a table of your grades and `!check` to force the marks check
 - You can edit the `crontab` field in the config file to change the marks check interval
