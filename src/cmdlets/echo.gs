// The Echo Cmdlet
// Sends output to a page.

import_code("../libs/context/get.gs")
import_code("../libs/context/pages-create.gs")
import_code("../libs/context/logs.gs")
import_code("../libs/context/pages-send.gs")
import_code("../libs/context/cli-helper.gs")
import_code("../libs/format/formatted-str.gs")

Echo = {}

Echo.usage = {
    "cmd": "echo",
    "summary": "Sends output to a page",
    "epilogue": "If --page=name is given, then the output is sent to that page, and values must be given in --(key)=(value) form; all other arguments are ignored.  Otherwise, the text argument is sent to the log page.",
    "requiresArg": false,
    "args": [
        {"name": "page", "valued": "name", "desc": "Page to send output to."},
    ],
}

Echo.Run = function(context, args)
    if ContextLib.Cli.TryHelp(args, Echo.usage, context) then return
    page = args.GetNamed("page")

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
                value = value + arg.Original
            end if
        end for
        logger = ContextLib.Logger.New("echo", context)
        logger.Info(value)
        context.ActivePage = ContextLib.LogPage.Name
        return
    end if

    row = {}
    for arg in args.Ordered
        if arg.Name != null and arg.Name != "page" and arg.Value != null then
            row[arg.Name] = arg.Value
        end if
    end for
    ContextLib.SendToPage(context, page, row)
    context.ActivePage = page
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
