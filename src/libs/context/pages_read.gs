// Functionality to read from the pages.
// A "null" page is turned into checking for the default page ("")

if not globals.hasIndex("ContextLib") then globals.ContextLib = {}

// HasPage() does the page exist in the context?
ContextLib.HasPage = function(context, page)
    if page == null then page = ""
    return context != null and context isa map and context.hasIndex("Pages") and context.Pages.hasIndex(page)
end function

// Page() Fetches a copy of the page from the context.
ContextLib.Page = function(context, page)
    if page == null then page = ""
    if context != null and context isa map and page isa map and context.hasIndex("Pages") and context.Pages.hasIndex(page) then
        ret = []
        for v in context.Pages[page]
            ret.push(v)
        end for
        return ret
    end if
    return []
end function
