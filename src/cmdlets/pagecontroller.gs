// Page Widget controller.
// A built-in command-let.

import_code("../libs/context/get.gs")
import_code("../libs/context/pages-create.gs")
import_code("../libs/context/logs.gs")
import_code("../libs/context/pages-send.gs")
import_code("../libs/format/formatted-str.gs")
import_code("../libs/std-lib/sort.gs")

PageController = {}
PageController.MakePageListPage = function(context)
    // Add a page with only the list of pages.
    ContextLib.CreatePage(context, "?", {
        "Default": "Name",
        "Description": "Page List",
        "Fields": {
            "Name": {
                "Order": 1,
                "Color": "#00a0a0",
            },
            "Description": {
                "Order": 2,
                "Color": "#808080",
            }}})
    context.Pages["?"] = []
    for key in context.Pages.indexes
        desc = key
        if context.PagesMeta.hasIndex(key) then
            meta = context.PagesMeta[key]
            if meta.hasIndex("Description") then desc = meta.Description
        end if
        context.Pages["?"].push({"Name": key, "Description": desc})
    end for
    // Ensure the page list is sorted for a consistent ordering.
    StdLib.QuickSort(context.Pages["?"], @PageController.Page__nameSorter)
end function

PageController.AdvanceActivePage = function(count, context)
    // Move to the next page item.
    PageController.MakePageListPage(context)
    metaPages = context.Pages["?"]
    pageCount = metaPages.len
    // Find the active page, then move to an adjacent one.
    for idx in metaPages.indexes
        if metaPages[idx].Name == context.ActivePage then
            pos = idx + count
            if pos >= metaPages.len then
                pos = 0
            else if pos < 0 then
                pos = metaPages.len - 1
            end if
            if pos >= 0 and pos < metaPages.len then
                context.ActivePage = metaPages[pos].Name
            end if
            return
        end if
    end for
end function

PageController.ScrollActivePage = function(count, context)
    if not context.PagesMeta[context.ActivePage].hasIndex("PagesStart") then
        context.PagesMeta[context.ActivePage].PagesStart = 0
    end if
    start = context.PagesMeta[context.ActivePage].PagesStart + count
    if start < 0 then start = 0
    if start >= context.Pages[context.ActivePage].len then
        start = context.Pages[context.ActivePage].len - 1
    end if
    context.PagesMeta[context.ActivePage].PagesStart = start
end function

PageController.Page__nameSorter = function(a, b)
    if a.Name == b.Name then return 0
    if a.Name < b.Name then return -1
    return 1
end function

PageController.Page__count = function(args, defaultValue)
    if args.Ordered.len > 1 then
        val = floor(args.Ordered[1].Value.val)
        if val != 0 then return val
    end if
    return defaultValue
end function

PageController.Run = function(context, args)
    if args.Ordered[0].Value == "?" then
        PageController.MakePageListPage(context)
        ContextLib.Log("info", "Setting active page to '?'")
        context.ActivePage = "?"
        return 0
    end if
    if args.Ordered[0].Value == "/" then
        PageController.AdvanceActivePage(PageController.Page__count(args, 1), context)
        return 0
    end if
    if args.Ordered[0].Value == "." then
        PageController.AdvanceActivePage(0 - PageController.Page__count(args, 1), context)
        return 0
    end if
    if args.Ordered[0].Value == "+" then
        PageController.ScrollActivePage(PageController.Page__count(args, 5), context)
        return 0
    end if
    // This is the interesting handling of "-" and "--" arguments.
    if args.Ordered[0].Original == "-" then
        PageController.ScrollActivePage(0 - PageController.Page__count(args, 5), context)
        return 0
    end if

    return 1
end function

PageController.Help = function()
    ContextLib.Log("warning", "Page Controller")
    ContextLib.Log("info", "Changes the page display.")
    ContextLib.Log("info", "This tool has quick access for flipping between pages and through pages.")
    ContextLib.Log("info", "Usage: (/ | . | - | + | (page name)) [number]")
    ContextLib.Log("info", "  /    Next Page")
    ContextLib.Log("info", "  .    Previous Page")
    ContextLib.Log("info", "  +    Next group of rows in the current page")
    ContextLib.Log("info", "  -    Previous group of rows in the current page")
    ContextLib.Log("info", "  ?    Special page name for the list of pages")
    ContextLib.Log("info", " (page name)  Name of the page to view")
    ContextLib.Log("info", " If you specify a number, then that's the number of items to change")
    exit
end function

PageController.Main = function()
    context = ContextLib.Get()
    args = context.Args

    if args.Empty then PageController.Help()
    res = PageController.Run(context, args)
    exit
end function

if locals == globals then PageController.Main()
