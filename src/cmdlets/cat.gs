// Send a file to a page or another file.

import_code("../libs/context/get.gs")
import_code("../libs/context/session.gs")
import_code("../libs/context/logs.gs")
import_code("../libs/context/pages-create.gs")
import_code("../libs/context/pages-read.gs")
import_code("../libs/context/pages-send.gs")
import_code("../libs/context/cli-helper.gs")
import_code("../libs/format/formatted-str.gs")
import_code("../libs/errors.gs")
import_code("../libs/files/paths.gs")

Cat = {}

Cat.usage = {
    "cmd": "cat",
    "summary": "Reads files and outputs to a page",
    //"long": "Sends the content of text files into a page.",
    "requiresArg": true,
    "args": [
        {
            "name": "page", "valued": "name",
            "desc": "Sends output to the named page.  If not given, then output " +
                "is sent to the log.",
        },
        {
            "valued": "fileN...",
            "desc": "File to read and send to the page.  Multiple files can be given at once.",
        },
    ],
}

Cat.Run = function(context, args, session)
    if ContextLib.Cli.TryHelp(args, Cat.usage, context) then return

    page = null
    logger = null
    pageArg = args.GetNamed("page")
    if pageArg != null then page = pageArg.Value

    if page == null or page == ContextLib.LogPage.Name then
        page = null
        logger = ContextLib.Logger.New("cat", context)
    end if
    if page != null and not ContextLib.HasPage(page) then
        ContextLib.CreatePage(context, page, {
            "Default": "line",
            "Description": "File contents",
            "Fields": {
                "filename": {
                    "Description": "Source filename",
                    "Order": 1,
                    "Width": 6,
                    "Color": "#006060",
                },
                "line": {
                    "Description": "Line contents",
                    "Order": 2,
                    "Color": "#b0b0b0",
                },
                "lineno": {
                    "Description": "Line number",
                },
            },
        })
    end if

    for arg in args.Unnamed
        if arg.File == null then
            context.Errors.push(ErrorLib.Error.New("No such file: '{name}'", {
                "name": arg.Original,
            }))
        else if arg.File.is_folder then
            // just skip it
        else if arg.File.is_binary then
            context.Errors.push(ErrorLib.Error.New("Cannot read: '{name}'", {
                "name": arg.Original,
            }))
        else
            data = arg.File.get_content
            rows = data.split(char(10))
            count = 0
            for line in rows
                count = count + 1
                if page == null then
                    logger.Info(line)
                else
                    ContextLib.SendToPage(context, page, {
                        "filename": arg.File.path,
                        "line": line,
                        "lineno": count,
                    })
                end if
            end for
        end if
    end for
end function

Cat.Main = function()
    context = ContextLib.Get()
    args = context.Args
    session = ContextLib.GetSession(context)
    Cat.Run(context, args, session)
    exit
end function

if locals == globals then Cat.Main()
