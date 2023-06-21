// Set environment variables.

import_code("../libs/context/get.gs")
import_code("../libs/context/session.gs")
import_code("../libs/context/logs.gs")
import_code("../libs/context/pages-create.gs")
import_code("../libs/context/pages-send.gs")
import_code("../libs/context/pages-read.gs")
import_code("../libs/std-lib/sort.gs")
import_code("../libs/format/formatted-str.gs")

Set = {}

Set.Run = function(context, args, session)
    if args.GetNamed("h") or args.GetNamed("help") then
        ContextLib.Log("warning", "set - Set an environment variable.")
        ContextLib.Log("info", "")
        ContextLib.Log("info", "Usage: set [name]=[value]")
        ContextLib.Log("info", "")
        ContextLib.Log("info", "When used without a value, displays a")
        ContextLib.Log("info", "page with all the environment variables.")
        ContextLib.Log("info", "Setting to no value removes the environment variable.")
        ContextLib.Log("info", "")
        return
    end if

    if args.Empty then
        ContextLib.CreatePage(context, "env", {
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
        ContextLib.ClearPage("env")
        // Need to sort the values
        names = []
        for name in session.Env.indexes
            names.push(name)
        end for
        StdLib.QuickSort(names, @StdLib.StringAscOrder)
        for name in names
            value = session.Env[name]
            ContextLib.SendToPage(context, "env", {"name": name, "value": value, "setting": name + "=" + value})
        end for
        context.ActivePage = "env"
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
