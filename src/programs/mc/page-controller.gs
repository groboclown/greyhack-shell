// Page Controller widgets.

PageController = {}

PageController.Run = function(args, context)
    if args.len <= 0 then
        ContextLib.Log("info", "Usage: (? | / | \ | - | + | (page name)) [number]")
        ContextLib.Log("info", "/    Next Page")
        return
    end if
    if args[0] == "?" then
        PageController.MakePageListPage(context)
        context.ActivePage = "?"
        return
    end if
    if args[0] == "/" then
        PageController.AdvanceActivePage(1, context)
        return
    end if
    if args[0] == "\" then
        PageController.AdvanceActivePage(-1, context)
        return
    end if
end function

PageController.MakePageListPage = function(context)
    // Add a page with only the list of pages.
    ContextLib.CreatePage(context, "?", {
        "Default": "Name",
        "Fields": {
            "Name": {
                "Order": 1,
                "Color": "#808080",
            }}})
    ContextLib.Pages["?"] = []
    for key in ContextLib.Pages.indexes
        if key != "?" then
            ContextLib.Pages["?"].push({"Name": key})
        end if
    end for
end function

PageController.AdvanceActivePage = function(count, context)
    if not context.Pages.hasIndex("?") then PageController.MakePageListPage(context)
    pos = 0
    for idx in context.Pages["?"]
        if context.Pages["?"][idx].Name == context.ActivePage then
            pos = idx + count
            if pos >= context.Pages["?"].len then
                pos = 0
            else if pos < 0 then
                pos = context.Pages["?"].len - 1
            end if
            if pos >= 0 and pos < context.Pages["?"].len then
                context.ActivePage = context.Pages["?"][idx].Name
            end if
            return
        end if
    end for
end function
