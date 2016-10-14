# pm-master-ctl

Cluster process manager command line interface.

## Installation

`npm install -g unsecured/pm-master-ctl`

## Usage

~~~
  pm-master-ctl [OPTIONS] [COMMAND]

  Options:
    -t, --host               server host [default: 'localhost']
    -p, --port               server port [default: 2493]
    -q, --quiet              only show error output
        --version            print the current version
    -v, --verbose            be verbose

  possible commands:
   clients                   show info of connected clients
   processes                 show info of all processes
   cores                     info
   spawn [COMMAND] [ARGS]    spawn a new process
     -w, --wait              waits until the process finishes
     -s, --stream            stream stdout and stderr
         --coreId [NUMBER]   spawn on this core (CPU) id
         --clientId [NUMBER] spawn on this client id only
         --hostname [NAME]   spawn on this hostname only
         --name [NAME]       user defined process name
   kill [CLIENT_ID] [PI      kill a running process
         --signal [STRING]   name of the singal to send [default: 'SIGTERM']
~~~

Please [report bugs](https://github.com/unsecured/pm-master-ctl/issues)!
