// Set environment variables.

import_code("../libs/context/get.gs")
import_code("../libs/context/session.gs")
import_code("../libs/context/logs.gs")
import_code("../libs/context/pages-create.gs")
import_code("../libs/context/pages-send.gs")
import_code("../libs/context/pages-read.gs")
import_code("../libs/context/cli-helper.gs")
import_code("../libs/std-lib/sort.gs")
import_code("../libs/format/formatted-str.gs")

Set = {}

Set.PageName = "env"

Set.usage = {
    "cmd": "set",
    "summary": "Set an environment variable",
    "requiresArg": false,
    "long": [
        "Usage: set [name]=[value]",
        "When used without a value, displays the page '" + Set.PageName + "' containing all the current session's environment variables.",
        "Setting the name to no value removes the environment variable.",
    ],
}

Set.Run = function(context, args, session)
    if ContextLib.Cli.TryHelp(args, Set.usage, context) then return

    if args.Empty then
        ContextLib.CreatePage(context, Set.PageName, {
            // Default is name, because value is easily fetched with ${}
            "Default": "name",
            "Text": "setting",
            "Description": "Session environment variables",
            "Fields": {
                "name": {
                    "Description": "Environment variable name",
                    "Order": 1,
                    "Color": "#80a0a0",
                },
                "value": {
                    "Description": "Value of the environment variable",
                    "Order": 2,
                    "Color": "#a0a080",
                },
                "setting": {
                    "Description": "name=value expression",
                },
            },
        })
        ContextLib.ClearPage(Set.PageName)
        // Need to sort the values
        names = []
        for name in session.Env.indexes
            names.push(name)
        end for
        StdLib.QuickSort(names, @StdLib.StringAscOrder)
        for name in names
            value = session.Env[name]
            ContextLib.SendToPage(context, Set.PageName, {"name": name, "value": value, "setting": name + "=" + value})
        end for
        context.ActivePage = Set.PageName
        return
    end if

    for arg in args.Ordered
        if arg.Name == null and arg.Value != null then
            value = ""
            name = ""
            pos = arg.Value.indexOf("=")
            if pos == null then
                name = arg.Value
            else
                name = arg.Value[:pos]
                value = arg.Value[pos+1:]
            end if
            if value == "" then
                session.Env.remove(name)
            else
                session.Env[name] = value
            end if
        end if
    end for
end function

Set.Main = function()
    context = ContextLib.Get()
    args = context.Args
    session = ContextLib.GetSession(context)
    Set.Run(context, args, session)
    exit
end function

if locals == globals then Set.Main()
