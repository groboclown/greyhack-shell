// The Echo Cmdlet
// Sends output to a page.

import_code("../libs/context/get.gs")
import_code("../libs/context/pages-create.gs")
import_code("../libs/context/logs.gs")
import_code("../libs/context/pages-send.gs")
import_code("../libs/format/formatted-str.gs")

Echo = {}

Echo.Run = function(context, args)
    if args.GetNamed("h") or args.GetNamed("--help") then
        ContextLib.Log("warning", "echo - Send output to a page.")
        ContextLib.Log("info", "")
        ContextLib.Log("info", "Usage: echo [--page=(page name) --key=value ...] | [text]")
        ContextLib.Log("info", "")
        ContextLib.Log("info", "When --page is given, then the key/value pairs")
        ContextLib.Log("info", "are sent to the page in a single row.")
        ContextLib.Log("info", "")
        ContextLib.Log("info", "When just the text is given, then the text is sent to")
        ContextLib.Log("info", "the log page.")
        ContextLib.Log("info", "")
    end if
    page = args.GetNamed("page")
    if page == null then page = args.GetNamed("p")

    // Logging
    if page == null then
        value = ""
        first = true
        for arg in args.Ordered
            if arg.Name == null then
                if first then
                    first = false
                else
                    value = value + " "
                end if
                value = value + arg.Value
            end if
        end for
        ContextLib.Log("info", value)
        return
    end if

    row = {}
    for arg in args.Ordered
        if arg.Name != null and arg.Name != "page" then
            row[arg.Name] = arg.Value
        end if
    end for
    ContextLib.Send(context, page, row)

end function

Echo.Main = function()
    // The context is the shared context object.
    context = ContextLib.Get()
    // There's also the current session object, but the help doesn't use that.
    // Arguments are the parsed arguments.  They're constructed in the cmdlets.gs file.
    args = context.Args
    Echo.Run(context, args)
    exit
end function

if locals == globals then Echo.Main()
