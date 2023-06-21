// The Clear Cmdlet
// Cleans out the ui.

import_code("../libs/context/get.gs")
import_code("../libs/context/logs.gs")
import_code("../libs/context/pages-read.gs")
import_code("../libs/context/pages-create.gs")
import_code("../libs/context/pages-send.gs")
import_code("../libs/format/formatted-str.gs")

Clear = {}

Clear.Run = function(context, args)
    if args.GetNamed("h") or args.GetNamed("--help") then
        ContextLib.Log("warning", "clear - Clears out pages.")
        ContextLib.Log("info", "")
        ContextLib.Log("info", "Usage: clear [--errors] [page [page ...]]")
        ContextLib.Log("info", "")
        ContextLib.Log("info", "When --errors is given, then the errors")
        ContextLib.Log("info", "are cleared.  If no page is given, then the active page")
        ContextLib.Log("info", "is cleared.")
        ContextLib.Log("info", "")
        return
    end if

    if args.Empty then
        if context.Pages.hasIndex(context.ActivePage) then
            ContextLib.ClearPage(context, context.ActivePage)
        end if
        return
    end if

    if args.GetNamed("errors") == true then
        // Special case.
        while context.Errors.len > 0
            context.Errors.pop()
        end while
    end if

    for arg in args.Ordered
        if arg.Name == null and arg.Value != null then
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
