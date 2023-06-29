// The Clear Cmdlet
// Cleans out the ui.

import_code("../libs/context/get.gs")
import_code("../libs/context/logs.gs")
import_code("../libs/context/pages-read.gs")
import_code("../libs/context/pages-create.gs")
import_code("../libs/context/pages-send.gs")
import_code("../libs/context/cli-helper.gs")
import_code("../libs/format/formatted-str.gs")

Clear = {}

Clear.usage = {
    "cmd": "clear",
    "summary": "Clears records from pages",
    "requiresArg": false,
    "epilogue": "If no page is given, and --errors is not given, then the active page is cleared (or closed).",
    "args": [
        {"name": "errors", "desc": "Clears the errors list"},
        {"name": "close", "desc": "Close the named page"},
        {"valued": "pageN...", "desc": "Clears the named page.  Multiple values may be given."},
    ],
}

Clear.Run = function(context, args)
    if ContextLib.Cli.TryHelp(args, Clear.usage, context) then return
    doClose = args.GetNamed("close") == true

    if args.UnnamedEmpty then
        if context.Pages.hasIndex(context.ActivePage) then
            if doClose then
                ContextLib.ClosePage(context, context.ActivePage)
            else
                ContextLib.ClearPage(context, context.ActivePage)
            end if
        end if
        return
    end if

    if args.GetNamed("errors") == true then
        // Special case.
        while context.Errors.len > 0
            context.Errors.pop()
        end while
    end if

    for arg in args.Unnamed
        if arg.Value != null then
            ContextLib.ClearPage(context, arg.Value)
        end if
    end for
end function

Clear.Main = function()
    context = ContextLib.Get()
    args = context.Args
    Clear.Run(context, args)
    exit
end function

if locals == globals then Clear.Main()
