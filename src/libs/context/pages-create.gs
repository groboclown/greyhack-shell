// Constructs a new page entry.

if not globals.hasIndex("ContextLib") then globals.ContextLib = {}
ContextLib = globals.ContextLib

// ContextLib.CreatePage() ensures the named page exists in the context with the right metadata.
//
// If initial rows are given, the page is initialized with those rows.
ContextLib.CreatePage = function(context, page, metadata, initial=null)
    if context != null and page != null and metadata != null and context isa map and page isa string and metadata isa map and context.hasIndex("Pages") and context.hasIndex("PagesMeta") then
        if not context.Pages.hasIndex(page) then
            context.Pages[page] = []
            context.PagesMeta[page] = metadata
            if initial != null then
                if initial isa map then
                    context.Pages[page].push(initial)
                else if initial isa list then
                    for row in initial
                        if row != null and row isa map then
                            context.Pages[page].push(row)
                        end if
                    end for
                end if
            end if
            if not context.hasIndex("PagesOrder") then context.PagesOrder = []
            context.PagesOrder.push(page)
        end if
    end if
end function

// ClearPage() Clears the records in a page.
//
// Set "remainder" argument to the number of items to keep.
// Records are always cleared from the top first (first in, first out).
ContextLib.ClearPage = function(context, page, remainder = null)
    if context != null and page != null and context isa map and page isa string and context.hasIndex("Pages") and context.Pages.hasIndex(page) then
        if remainder == null or not remainder isa number or remainder < 0 then
            remainder = 0
        end if
        while context.Pages[page].len > remainder
            // Remove from the front of the list.
            context.Pages[page].pull()
        end while
    end if
end function

// ClosePage() Removes a page.
ContextLib.ClosePage = function(context, page)
    if context != null and page != null and context isa map and page isa string and context.hasIndex("Pages") and context.Pages.hasIndex(page) then
        context.Pages.remove(page)
        if context.hasIndex("PagesMeta") and context.PagesMeta.hasIndex(page) then
            context.PagesMeta.remove(page)
        end if
        if context.hasIndex("PagesOrder") then
            for idx in context.PagesOrder.indexes
                if context.PagesOrder[idx] == page then
                    context.PagesOrder.remove(idx)
                    break
                end if
            end for
        end if
    end if
end function
