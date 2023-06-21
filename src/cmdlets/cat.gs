// Send a file to a page or another file.

import_code("../libs/context/get.gs")
import_code("../libs/context/session.gs")
import_code("../libs/context/logs.gs")
import_code("../libs/context/pages-create.gs")
import_code("../libs/context/pages-read.gs")
import_code("../libs/context/pages-send.gs")
import_code("../libs/format/formatted-str.gs")
import_code("../libs/errors.gs")
import_code("../libs/files/paths.gs")
import_code("../libs/files/star-glob.gs")
import_code("../libs/files/expand-args.gs")

Cat = {}

Cat.Run = function(context, args, session)
    if args.GetNamed("h") or args.GetNamed("help") or args.Empty then
        ContextLib.Log("warning", "cat - Reads files and outputs to a page.")
        ContextLib.Log("info", "")
        ContextLib.Log("info", "Usage: cat [--page=name] file1 file2 ...")
        ContextLib.Log("info", "")
        ContextLib.Log("info", "When --page=name is given, then the output is sent to the")
        ContextLib.Log("info", "named page.  If not, then it's sent to the log.")
        ContextLib.Log("info", "")
        return
    end if

    page = null
    pageArg = args.GetNamed("page")
    if pageArg != null then page = pageArg.Value

    if page == null or page == ContextLib.LogPage.Name then
        page = null
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

    for match in FileLib.Expand.ExpandFiles(args.Ordered, session.Computer, session.Home, session.Cwd)
        f = match.File
        if f == null then
            context.Errors.push(ErrorLib.Error.New("No such file: '{name}'", {"name": match.Value}))
        else if f.is_folder then
            // just skip it
        else if f.is_binary then
            context.Errors.push(ErrorLib.Error.New("Cannot read: '{name}'", {"name": match.Value}))
        else
            data = f.get_content
            rows = data.split(char(10))
            count = 0
            for line in rows
                count = count + 1
                if page == null then
                    ContextLib.Log("info", line)
                else
                    ContextLib.SendToPage(context, page, {
                        "filename": match.Path,
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
