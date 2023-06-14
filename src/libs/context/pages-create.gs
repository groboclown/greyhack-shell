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
        end if
    end if
end function
