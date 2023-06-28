// Page Widget controller.
// A built-in command-let.

import_code("../libs/context/get.gs")
import_code("../libs/context/pages-create.gs")
import_code("../libs/context/logs.gs")
import_code("../libs/context/pages-send.gs")
import_code("../libs/context/cli-helper.gs")
import_code("../libs/format/formatted-str.gs")

PageController = {}

PageController.DEFAULT_JUMP_ROWS = 10

PageController.MakePageListPage = function(context)
    // Add a page with only the list of pages.
    ContextLib.CreatePage(context, "?", {
        "Default": "Name",
        "Description": "Page List",
        "Fields": {
            "Index": {
                "Order": 1,
                "Color": "#808080",
                "Width": 3,
            },
            "Name": {
                "Order": 2,
                "Color": "#00a0a0",
            },
            "Description": {
                "Order": 3,
                "Color": "#808080",
            },
        },
    })
    ContextLib.ClearPage(context, "?")
    for idx in context.PagesOrder.indexes
        key = context.PagesOrder[idx]
        desc = key
        if context.PagesMeta.hasIndex(key) then
            meta = context.PagesMeta[key]
            if meta.hasIndex("Description") then desc = meta.Description
        end if
        ContextLib.SendToPage(context, "?", {"Index": idx, "Name": key, "Description": desc})
    end for
end function

PageController.usage = {
    "cmd": "pagecontroller",
    "summary": "Changes the page display",
    "requiresArg": true,
    "long": [
        "This tool has quick access for flipping between pages and through pages.",
        "Usage: (/ | . | - | + | (page name)) [number]",
        "  /           Next page",
        "  .           Previous page",
        "  +           Next group of rows in the current page",
        "  -           Previous group of rows in the current page",
        "  ?           Special page name for the list of pages; shows the list of pages",
        "  (page name) Name of the page to view",
        "  number      If you specify a number, then that's the number of items to change",
    ],
}

PageController.AdvanceActivePage = function(count, context)
    // Move to the next page item.
    idx = PageController.activePageIndex(context) + count
    if idx < 0 then idx = context.PagesOrder.len - 1
    if idx >= context.PagesOrder.len then idx = 0
    if idx >=0 and idx < context.PagesOrder.len then
        context.ActivePage = context.PagesOrder[idx]
    end if
end function

PageController.ScrollActivePage = function(count, context)
    if not context.PagesMeta[context.ActivePage].hasIndex("PagesEnd") then
        context.PagesMeta[context.ActivePage].PagesEnd = 0
    end if
    tail = context.PagesMeta[context.ActivePage].PagesEnd - count
    if tail < 0 then tail = 0
    if tail >= context.Pages[context.ActivePage].len then
        tail = context.Pages[context.ActivePage].len - 1
    end if
    context.PagesMeta[context.ActivePage].PagesEnd = tail
end function

PageController.activePageIndex = function(context)
    for idx in context.PagesOrder.indexes
        if context.PagesOrder[idx] == context.ActivePage then return idx
    end for
    return 0
end function

PageController.Page__count = function(args, defaultValue)
    sawFirst = false
    for arg in args.Ordered
        if arg.Name == null and arg.Value isa string then
            if sawFirst then
                val = floor(args.Ordered[1].Value.val)
                if val != 0 then return val
                return defaultValue
            else
                sawFirst = true
            end if
        end if
    end for
    return defaultValue
end function

PageController.Run = function(context, args)
    if ContextLib.Cli.TryHelp(args, PageController.usage, context) then return

    firstPlain = null
    for arg in args.Ordered
        if arg.Name == null and arg.Value isa string then
            firstPlain = arg.Value
            break
        end if
        if arg.Original == "-" then
            // This is the interesting handling of "-" and "--" arguments.
            firstPlain = "-"
            break
        end if
    end for

    if firstPlain == null then
        PageController.Help()
        return 0
    end if
    if firstPlain == "?" then
        PageController.MakePageListPage(context)
        context.ActivePage = "?"
        return 0
    end if
    if firstPlain == "/" then
        PageController.AdvanceActivePage(PageController.Page__count(args, 1), context)
        return 0
    end if
    if firstPlain == "." then
        PageController.AdvanceActivePage(0 - PageController.Page__count(args, 1), context)
        return 0
    end if
    if firstPlain == "+" then
        PageController.ScrollActivePage(PageController.Page__count(args, PageController.DEFAULT_JUMP_ROWS), context)
        return 0
    end if
    if firstPlain == "-" then
        PageController.ScrollActivePage(0 - PageController.Page__count(args, PageController.DEFAULT_JUMP_ROWS), context)
        return 0
    end if
    if context.Pages.hasIndex(firstPlain) then
        context.ActivePage = firstPlain
        return 0
    end if
    if firstPlain != null and firstPlain == "0" or firstPlain.val != 0 then
        val = firstPlain.val
        if val >= 0 and val < context.PagesOrder.len then
            context.ActivePage = context.PagesOrder[val]
            return 0
        end if
    end if

    return 1
end function

PageController.Main = function()
    context = ContextLib.Get()
    args = context.Args
    res = PageController.Run(context, args)
    exit
end function

if locals == globals then PageController.Main()
