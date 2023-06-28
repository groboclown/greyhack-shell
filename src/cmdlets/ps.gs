// Show running processes.

import_code("../libs/context/get.gs")
import_code("../libs/context/session.gs")
import_code("../libs/context/logs.gs")
import_code("../libs/context/pages-create.gs")
import_code("../libs/context/pages-read.gs")
import_code("../libs/context/pages-send.gs")
import_code("../libs/context/cli-helper.gs")
import_code("../libs/format/formatted-str.gs")
import_code("../libs/errors.gs")

Ps = {}

Ps.PageName = "ps"

Ps.usage = {
    "cmd": "ps",
    "summary": "List active processes",
    "requiresArg": false,
    "long": "Sends the list of active processes to the page '" + Ps.PageName + "'",
    "args": [
        {"name": "c", "desc": "Clear the page before listing"},
    ],
}

Ps.Run = function(context, args, session)
    if ContextLib.Cli.TryHelp(args, Ps.usage, context) then return

    data = session.Computer.show_procs
    if not data isa string then
        context.Errors.push(ErrorLib.Error.New("Failed to get processes: '{res}'", {"res": data}))
        return
    end if
    // user pid cpu mem command
    if args.GetNamed("c") or args.GetNamed("clear") then
        ContextLib.ClearPage(context, Ps.PageName)
    end if

    ContextLib.CreatePage(context, Ps.PageName, {
        "Default": "pid",
        "Text": "command",
        "Description": "Process List",
        "Fields": {
            "user": {
                "Description": "The user the process is running inder",
                "Order": 1,
                "Color": "#808080",
                "Width": 10,
            },
            "pid": {
                "Description": "Process ID",
                "Order": 2,
                "Color": "#a0a080",
                "Width": 6,
            },
            "cpu": {
                "Description": "Amount of CPU used by the process",
                "Order": 3,
                "Color": "#808080",  // would be nice to have this change color based on usage.
                "Width": 6,
            },
            "mem": {
                "Description": "Amount of CPU used by the process",
                "Order": 4,
                "Color": "#808080",
                "Width": 6,
            },
            "command": {
                "Description": "The running command",
                "Order": 5,
                "Color": "#a0a0a0",
            },
        },
    })
    ContextLib.ClearPage(Ps.PageName)
    
    rows = data.split(char(10))
    header = rows[0].split(" ")
    rows = rows[1:]
    
    for row in rows
        cols = row.split(" ")
        parsed = {}
        for idx in cols.indexes
            parsed[header[idx].lower] = cols[idx]
        end for
        ContextLib.SendToPage(context, Ps.PageName, parsed)
    end for
    
    context.ActivePage = Ps.PageName
end function

Ps.Main = function()
    context = ContextLib.Get()
    args = context.Args
    session = ContextLib.GetSession(context)
    Ps.Run(context, args, session)
    exit
end function

if locals == globals then Ps.Main()
